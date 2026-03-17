import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  decodeFitFile,
  DEFAULT_SSI_VARS,
  fitDataToSsiData,
  ssiDataToQrPayload,
} from "@/lib/fit-to-ssi";

function parseOptionalNumber(v: FormDataEntryValue | null): number | undefined {
  if (v == null) return undefined;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
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
    const dive = fitDataToSsiData(fitData);

    if (!dive) {
      return NextResponse.json(
        {
          error: "No dive session found in FIT file.",
          decodeErrors: errors.length ? errors : undefined,
        },
        { status: 422 }
      );
    }

    // Allow UI overrides for SSI taxonomy vars (fallback to defaults)
    const overrides = {
      var_weather_id: parseOptionalNumber(formData.get("var_weather_id")),
      var_entry_id: parseOptionalNumber(formData.get("var_entry_id")),
      var_water_body_id: parseOptionalNumber(formData.get("var_water_body_id")),
      var_watertype_id: parseOptionalNumber(formData.get("var_watertype_id")),
      var_current_id: parseOptionalNumber(formData.get("var_current_id")),
      var_surface_id: parseOptionalNumber(formData.get("var_surface_id")),
    } as const;

    dive.var_weather_id = overrides.var_weather_id ?? dive.var_weather_id ?? DEFAULT_SSI_VARS.var_weather_id;
    dive.var_entry_id = overrides.var_entry_id ?? dive.var_entry_id ?? DEFAULT_SSI_VARS.var_entry_id;
    dive.var_water_body_id =
      overrides.var_water_body_id ?? dive.var_water_body_id ?? DEFAULT_SSI_VARS.var_water_body_id;
    dive.var_watertype_id = overrides.var_watertype_id ?? dive.var_watertype_id ?? DEFAULT_SSI_VARS.var_watertype_id;
    dive.var_current_id = overrides.var_current_id ?? dive.var_current_id ?? DEFAULT_SSI_VARS.var_current_id;
    dive.var_surface_id = overrides.var_surface_id ?? dive.var_surface_id ?? DEFAULT_SSI_VARS.var_surface_id;

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
