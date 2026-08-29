/** Max upload size for .fit / .zip files (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isUploadTooLarge(
  sizeBytes: number,
  maxBytes: number = MAX_UPLOAD_BYTES
): boolean {
  return Number.isFinite(sizeBytes) && sizeBytes > maxBytes;
}
