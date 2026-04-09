import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  decodeFitFile,
  fitDataToSsiData,
  ssiDataToQrPayload,
} from "@/lib/fit-to-ssi";

function parseOptionalNumber(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === "empty") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function isExplicitEmpty(v: FormDataEntryValue | null): boolean {
  return typeof v === "string" && v.trim() === "empty";
}

/**
 * POST /api/upload
 * Accepts a .fit file (multipart/form-data), decodes it, maps to SSI attributes,
 * and returns SSI dive log + QR code data URL for the SSI app to scan.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const clientTimeZoneRaw = formData.get("clientTimeZone");
    const clientTimeZone =
      typeof clientTimeZoneRaw === "string" && clientTimeZoneRaw.trim().length > 0
        ? clientTimeZoneRaw.trim()
        : undefined;

    // Server-safe check: file-like object (no global File on Node)
    const isFileLike =
      file &&
      typeof file === "object" &&
      "arrayBuffer" in file &&
      "name" in file;
    if (!isFileLike) {
      return NextResponse.json(
        { error: "Missing file. Send a .fit file as 'file' in form data." },
        { status: 400 }
      );
    }

    const fileObj = file as { arrayBuffer(): Promise<ArrayBuffer>; name: string };
    if (!fileObj.name.toLowerCase().endsWith(".fit")) {
      return NextResponse.json(
        { error: "File must be a .fit file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileObj.arrayBuffer();

    const { fitData, errors } = decodeFitFile(arrayBuffer);
    const dive = fitDataToSsiData(fitData, { fallbackTimeZone: clientTimeZone });

    if (!dive) {
      return NextResponse.json(
        {
          error: "No dive session found in FIT file.",
          decodeErrors: errors.length ? errors : undefined,
        },
        { status: 422 }
      );
    }

    // Allow UI overrides for SSI taxonomy vars (no forced defaults)
    const empty = {
      var_weather_id: isExplicitEmpty(formData.get("var_weather_id")),
      var_entry_id: isExplicitEmpty(formData.get("var_entry_id")),
      var_water_body_id: isExplicitEmpty(formData.get("var_water_body_id")),
      var_current_id: isExplicitEmpty(formData.get("var_current_id")),
      var_surface_id: isExplicitEmpty(formData.get("var_surface_id")),
    } as const;

    const overrides = {
      var_weather_id: parseOptionalNumber(formData.get("var_weather_id")),
      var_entry_id: parseOptionalNumber(formData.get("var_entry_id")),
      var_water_body_id: parseOptionalNumber(formData.get("var_water_body_id")),
      var_current_id: parseOptionalNumber(formData.get("var_current_id")),
      var_surface_id: parseOptionalNumber(formData.get("var_surface_id")),
    } as const;

    dive.var_weather_id = empty.var_weather_id ? undefined : overrides.var_weather_id ?? dive.var_weather_id;
    dive.var_entry_id = empty.var_entry_id ? undefined : overrides.var_entry_id ?? dive.var_entry_id;
    dive.var_water_body_id = empty.var_water_body_id
      ? undefined
      : overrides.var_water_body_id ?? dive.var_water_body_id;
    dive.var_current_id = empty.var_current_id ? undefined : overrides.var_current_id ?? dive.var_current_id;
    dive.var_surface_id = empty.var_surface_id ? undefined : overrides.var_surface_id ?? dive.var_surface_id;

    const qrPayload = ssiDataToQrPayload(dive);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      type: "image/png",
      margin: 2,
    });

    return NextResponse.json({
      dive,
      qrDataUrl,
      qrPayload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process upload";
    console.error("Upload error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
