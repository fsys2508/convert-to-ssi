import { Decoder, Stream } from "@garmin/fitsdk";

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
}

export const DEFAULT_SSI_VARS: Pick<
  SsiData,
  | "var_weather_id"
  | "var_entry_id"
  | "var_water_body_id"
  | "var_watertype_id"
  | "var_current_id"
  | "var_surface_id"
> = {
  var_weather_id: 1, // Cloudless
  var_entry_id: 22, // Boat Dive
  var_water_body_id: 13, // Ocean
  var_watertype_id: 5, // Salt Water
  var_current_id: 7, // Light Current
  var_surface_id: 10, // Calm
};

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
function toSsiDatetime(startTime: Date | number): string {
  const d = startTime instanceof Date ? startTime : new Date((startTime as number) * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}${h}${min}`;
}

export function fitDataToSsiData(fitData: Record<string, unknown[]>): SsiData | null {
  const sessionMsgs = fitData.sessionMesgs as Record<string, unknown>[] | undefined;
  const lapMsgs = fitData.lapMesgs as Record<string, unknown>[] | undefined;
  const diveSummaryMsgs = fitData.diveSummaryMesgs as Record<string, unknown>[] | undefined;
  const recordMsgs = fitData.recordMesgs as Record<string, unknown>[] | undefined;

  const session = sessionMsgs?.[0];
  if (!session) return null;

  const startTime = session.startTime as Date | number | undefined;
  if (startTime == null) return null;

  const totalElapsedSeconds = (session.totalElapsedTime as number) ?? (session.totalTimerTime as number) ?? 0;
  const divetime = Math.round((totalElapsedSeconds / 60) * 10) / 10; // one decimal like SSI sample

  let maxDepthMeters = 0;
  let avgDepthMeters = 0;
  let watertemp_c: number | undefined;
  let watertemp_max_c: number | undefined;
  let airtemp_c: number | undefined;

  const lap = lapMsgs?.[0];
  const diveSummary = diveSummaryMsgs?.[0];

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
    datetime: toSsiDatetime(startTime),
    depth_m: Math.round(maxDepthMeters * 10) / 10,
    avg_depth_m: Math.round(avgDepthMeters * 10) / 10,
    ...DEFAULT_SSI_VARS,
    ...(watertemp_c != null && { watertemp_c }),
    ...(watertemp_max_c != null && { watertemp_max_c }),
    ...(airtemp_c != null && { airtemp_c }),
  };
}

/** Serialize SSI data to the app's QR format: semicolon-separated key or key:value */
export function ssiDataToQrPayload(data: SsiData): string {
  const parts: string[] = [];
  if (data.dive) parts.push("dive");
  if (data.noid) parts.push("noid");
  const keys: (keyof SsiData)[] = [
    "dive_type", "divetime", "datetime", "depth_m", "avg_depth_m",
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
