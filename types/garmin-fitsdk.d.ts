declare module "@garmin/fitsdk" {
  export class Stream {
    static fromArrayBuffer(arrayBuffer: ArrayBuffer): Stream;
  }

  export class Decoder {
    constructor(stream: Stream);
    isFIT(): boolean;
    read(options?: {
      applyScaleAndOffset?: boolean;
      convertDateTimesToDates?: boolean;
    }): { messages: Record<string, unknown[]>; errors: unknown[] };
  }
}
