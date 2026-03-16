declare module "qrcode" {
  export function toDataURL(
    text: string,
    options?: { type?: string; margin?: number }
  ): Promise<string>;
}
