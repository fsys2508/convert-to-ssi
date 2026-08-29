import { Decoder, Stream } from "@garmin/fitsdk";
import { find } from "geo-tz/all";

/**
 * SSI app QR payload structure (semicolon-separated key:value).
 * Fields we can fill from FIT (e.g. Garmin) are required; SSI-specific IDs/defaults are optional.
 */
export interface SsiData {
  /** Marker (no value in QR) */
  dive?: boolean;
  /** No SSI id yet (no value in QR) */
  noid?: boolean;
  /** Dive type (0 = default/recreational) */
  dive_type: number;
  /** Duration in minutes */
  divetime: number;
  /** Date and time: YYYYMMDDHHmm */
  datetime: string;
  /** Max depth in meters */
  depth_m: number;
  avg_depth_m: number;
  /** SSI taxonomy / enums (defaults when not from FIT) */
  var_weather_id?: number;
  var_entry_id?: number;
  var_water_body_id?: number;
  var_watertype_id?: number;
  var_current_id?: number;
  var_surface_id?: number;
  /** Water temp °C (from device if available) */
  watertemp_c?: number;
  airtemp_c?: number;
  /** Visibility meters */
  vis_m?: number;
  watertemp_max_c?: number;
  /** Display-only: surface interval (seconds) */
  surface_interval_s?: number;
  /** Display-only: Nitrox oxygen content (%) from dive gas */
  nitrox_pct?: number;
  /** Display-only: dive latitude in decimal degrees */
  lat_deg?: number;
  /** Display-only: dive longitude in decimal degrees */
  lon_deg?: number;
}

export function decodeFitFile(arrayBuffer: ArrayBuffer): {
  fitData: Record<string, unknown[]>;
  errors: unknown[];
} {
  const stream = Stream.fromArrayBuffer(arrayBuffer);
  const decoder = new Decoder(stream);

  if (!decoder.isFIT()) {
    throw new Error("File is not a valid FIT file");
  }

  const { messages, errors } = decoder.read({
    applyScaleAndOffset: true,
    convertDateTimesToDates: true,
  });

  return { fitData: messages as Record<string, unknown[]>, errors };
}

/** Build SSI datetime string from session startTime: YYYYMMDDHHmm */
function toSsiDatetime(startTime: Date | number, timeZone?: string): string {
  const d = startTime instanceof Date ? startTime : new Date((startTime as number) * 1000);
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      return `${byType.year}${byType.month}${byType.day}${byType.hour}${byType.minute}`;
    } catch {
      // Fall back to runtime-local timezone formatting.
    }
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}${h}${min}`;
}

function semicirclesToDegrees(v: number): number {
  return v * (180 / 2147483648);
}

function inferTimeZoneFromSession(session: Record<string, unknown>): string | undefined {
  const candidates: Array<{ lat: unknown; lon: unknown }> = [
    { lat: session.endPositionLat, lon: session.endPositionLong },
    { lat: session.necLat, lon: session.necLong },
    { lat: session.swcLat, lon: session.swcLong },
    { lat: session.startPositionLat, lon: session.startPositionLong },
  ];

  for (const c of candidates) {
    if (typeof c.lat !== "number" || typeof c.lon !== "number") continue;
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue;
    const lat = semicirclesToDegrees(c.lat);
    const lon = semicirclesToDegrees(c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    try {
      const zones = find(lat, lon);
      if (Array.isArray(zones) && zones.length > 0 && typeof zones[0] === "string") {
        return zones[0];
      }
    } catch {
      // geo-tz lookup can fail for edge coordinates; try next candidate.
    }
  }
  return undefined;
}

function mapFitWaterTypeToSsi(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s.includes("fresh")) return 4;
    if (s.includes("salt") || s.includes("sea")) return 5;
  }

  return undefined;
}

function inferDiveLatLon(session: Record<string, unknown>): { lat_deg: number; lon_deg: number } | undefined {
  const candidates: Array<{ lat: unknown; lon: unknown }> = [
    { lat: session.endPositionLat, lon: session.endPositionLong },
    { lat: session.startPositionLat, lon: session.startPositionLong },
  ];

  for (const c of candidates) {
    if (typeof c.lat !== "number" || typeof c.lon !== "number") continue;
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue;
    const lat = semicirclesToDegrees(c.lat);
    const lon = semicirclesToDegrees(c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    return {
      lat_deg: Math.round(lat * 1_000_000) / 1_000_000,
      lon_deg: Math.round(lon * 1_000_000) / 1_000_000,
    };
  }
  return undefined;
}

export function fitDataToSsiData(
  fitData: Record<string, unknown[]>,
  options?: { fallbackTimeZone?: string }
): SsiData | null {
  const sessionMsgs = fitData.sessionMesgs as Record<string, unknown>[] | undefined;
  const lapMsgs = fitData.lapMesgs as Record<string, unknown>[] | undefined;
  const diveSummaryMsgs = fitData.diveSummaryMesgs as Record<string, unknown>[] | undefined;
  const diveSettingsMsgs = fitData.diveSettingsMesgs as Record<string, unknown>[] | undefined;
  const diveGasMsgs = fitData.diveGasMesgs as Record<string, unknown>[] | undefined;
  const recordMsgs = fitData.recordMesgs as Record<string, unknown>[] | undefined;

  const session = sessionMsgs?.[0];
  if (!session) return null;

  const startTime = session.startTime as Date | number | undefined;
  if (startTime == null) return null;
  const derivedTimeZone = inferTimeZoneFromSession(session);
  const effectiveTimeZone = derivedTimeZone ?? options?.fallbackTimeZone;
  const diveLatLon = inferDiveLatLon(session);

  const lap = lapMsgs?.[0];
  const diveSummary = diveSummaryMsgs?.[0];
  const diveSettings = diveSettingsMsgs?.[0];
  const diveGas = diveGasMsgs?.[0];

  const bottomTimeSeconds = (diveSummary?.bottomTime as number | undefined) ?? undefined;
  const surfaceIntervalSeconds =
    (diveSummary?.surfaceInterval as number | undefined) ??
    (diveSummary?.surfaceIntervalTime as number | undefined) ??
    undefined;
  const totalTimerSeconds = (session.totalTimerTime as number) ?? (session.totalElapsedTime as number) ?? 0;
  const divetimeSeconds = bottomTimeSeconds ?? totalTimerSeconds;
  const divetime = Math.round((divetimeSeconds / 60) * 10) / 10; // one decimal like SSI sample
  const var_watertype_id = mapFitWaterTypeToSsi(
    diveSettings?.waterType ?? session?.waterType ?? lap?.waterType ?? diveSummary?.waterType
  );
  const nitroxRaw = Number(diveGas?.oxygenContent);
  const nitrox_pct = Number.isFinite(nitroxRaw) ? nitroxRaw : undefined;

  let maxDepthMeters = 0;
  let avgDepthMeters = 0;
  let watertemp_c: number | undefined;
  let watertemp_max_c: number | undefined;
  let airtemp_c: number | undefined;

  // Max depth from lap/dive summary if available
  if (lap?.maxDepth != null) maxDepthMeters = lap.maxDepth as number;
  if (diveSummary?.maxDepth != null) maxDepthMeters = diveSummary.maxDepth as number;
  if (lap?.avgDepth != null && maxDepthMeters === 0) maxDepthMeters = lap.avgDepth as number;
  if (diveSummary?.avgDepth != null && maxDepthMeters === 0) maxDepthMeters = diveSummary.avgDepth as number;

  if (Array.isArray(recordMsgs)) {
    let depthSum = 0;
    let depthCount = 0;
    for (const r of recordMsgs) {
      const d = (r as Record<string, unknown>).depth as number | undefined;
      if (d != null) {
        if (d > maxDepthMeters) maxDepthMeters = d;
        depthSum += d;
        depthCount += 1;
      }
    }
    if (depthCount > 0) {
      avgDepthMeters =
        (lap?.avgDepth as number | undefined) ??
        (diveSummary?.avgDepth as number | undefined) ??
        depthSum / depthCount;
    } else {
      avgDepthMeters =
        (lap?.avgDepth as number | undefined) ??
        (diveSummary?.avgDepth as number | undefined) ??
        0;
    }
  } else {
    avgDepthMeters =
      (lap?.avgDepth as number | undefined) ??
      (diveSummary?.avgDepth as number | undefined) ??
      0;
  }

  // Water temp from session/lap if present (FIT scale/units may vary)
  if (lap?.avgTemperature != null) watertemp_c = lap.avgTemperature as number;
  if (session?.avgTemperature != null && watertemp_c == null) watertemp_c = session.avgTemperature as number;
  if (lap?.maxTemperature != null) watertemp_max_c = lap.maxTemperature as number;

  // Air temperature: use session-level temperature when available and distinct from water
  if (session?.minTemperature != null) {
    airtemp_c = session.minTemperature as number;
  }

  return {
    dive: true,
    noid: true,
    dive_type: 0,
    divetime,
    datetime: toSsiDatetime(startTime, effectiveTimeZone),
    depth_m: Math.round(maxDepthMeters * 10) / 10,
    avg_depth_m: Math.round(avgDepthMeters * 10) / 10,
    ...(var_watertype_id != null && { var_watertype_id }),
    ...(watertemp_c != null && { watertemp_c }),
    ...(watertemp_max_c != null && { watertemp_max_c }),
    ...(airtemp_c != null && { airtemp_c }),
    ...(surfaceIntervalSeconds != null && { surface_interval_s: surfaceIntervalSeconds }),
    ...(nitrox_pct != null && { nitrox_pct }),
    ...(diveLatLon ?? {}),
  };
}

/** Serialize SSI data to the app's QR format: semicolon-separated key or key:value */
export function ssiDataToQrPayload(data: SsiData): string {
  const parts: string[] = [];
  if (data.dive) parts.push("dive");
  if (data.noid) parts.push("noid");
  const keys: (keyof SsiData)[] = [
    "dive_type", "divetime", "datetime", "depth_m",
    "var_weather_id", "var_entry_id", "var_water_body_id", "var_watertype_id",
    "var_current_id", "var_surface_id",
    "watertemp_c", "airtemp_c", "vis_m", "watertemp_max_c",
  ];
  for (const k of keys) {
    const v = data[k];
    if (v === undefined) continue;
    parts.push(`${k}:${v}`);
  }
  return parts.join(";");
}
