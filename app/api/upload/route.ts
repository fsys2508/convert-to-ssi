import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  decodeFitFile,
  fitDataToSsiData,
  ssiDataToQrPayload,
} from "@/lib/fit-to-ssi";

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
