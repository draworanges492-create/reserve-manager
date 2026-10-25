// Minimal types for the parts of `gifenc` that tools/store-capture.ts uses.
declare module 'gifenc' {
  type Palette = number[][];
  function quantize(rgba: Uint8Array, maxColors: number): Palette;
  function applyPalette(rgba: Uint8Array, palette: Palette): Uint8Array;
  function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: Palette;
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  const gifenc: {
    quantize: typeof quantize;
    applyPalette: typeof applyPalette;
    GIFEncoder: typeof GIFEncoder;
  };
  export default gifenc;
}
