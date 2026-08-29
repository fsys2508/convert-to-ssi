import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import unzipper from "unzipper";
import {
  decodeFitFile,
  fitDataToSsiData,
  ssiDataToQrPayload,
} from "@/lib/fit-to-ssi";
import { isUploadTooLarge } from "@/lib/upload-limits";

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

function fileTooLargeResponse() {
  return NextResponse.json(
    { error: "File exceeds the 10 MB upload limit.", errorKey: "fileTooLarge" },
    { status: 413 }
  );
}

/**
 * POST /api/upload
 * Accepts a .fit or .zip file (multipart/form-data), decodes a single FIT payload,
 * maps to SSI attributes, and returns SSI dive log + QR code data URL.
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength != null) {
      const declaredSize = Number(contentLength);
      if (isUploadTooLarge(declaredSize)) {
        return fileTooLargeResponse();
      }
    }

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
        { error: "Missing file. Send a .fit or .zip file as 'file' in form data." },
        { status: 400 }
      );
    }

    const fileObj = file as {
      arrayBuffer(): Promise<ArrayBuffer>;
      name: string;
      size?: number;
    };
    if (typeof fileObj.size === "number" && isUploadTooLarge(fileObj.size)) {
      return fileTooLargeResponse();
    }

    const fileNameLower = fileObj.name.toLowerCase();
    const isFit = fileNameLower.endsWith(".fit");
    const isZip = fileNameLower.endsWith(".zip");
    if (!isFit && !isZip) {
      return NextResponse.json(
        { error: "File must be a .fit or .zip file." },
        { status: 400 }
      );
    }

    let arrayBuffer = await fileObj.arrayBuffer();
    if (isUploadTooLarge(arrayBuffer.byteLength)) {
      return fileTooLargeResponse();
    }
    if (isZip) {
      const zipDirectory = await unzipper.Open.buffer(Buffer.from(arrayBuffer));
      const fitEntries = zipDirectory.files.filter(
        (entry) => entry.type === "File" && entry.path.toLowerCase().endsWith(".fit")
      );
      if (fitEntries.length !== 1) {
        return NextResponse.json(
          { errorKey: "zipInvalid" },
          { status: 400 }
        );
      }
      const fitBuffer = await fitEntries[0].buffer();
      if (isUploadTooLarge(fitBuffer.byteLength)) {
        return fileTooLargeResponse();
      }
      const fitArrayBuffer = new ArrayBuffer(fitBuffer.byteLength);
      new Uint8Array(fitArrayBuffer).set(fitBuffer);
      arrayBuffer = fitArrayBuffer;
    }

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
