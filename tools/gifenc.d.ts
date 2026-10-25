// Minimal types for the parts of `gifenc` that tools/store-capture.ts uses.
declare module 'gifenc' {
  type Palette = number[][];
  interface FrameOptions {
    palette?: Palette;
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
  }
  interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  const gifenc: {
    quantize(rgba: Uint8Array, maxColors: number): Palette;
    applyPalette(rgba: Uint8Array, palette: Palette): Uint8Array;
    GIFEncoder(): Encoder;
  };
  export default gifenc;
}
