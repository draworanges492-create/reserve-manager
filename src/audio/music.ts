// The two music loops (spec §11: "2 calm loops, crossfade by chapter tension").
// Notes are MIDI numbers (60 = middle C); null is a rest. Own work.

export type MusicTrack = 'ruin' | 'foundations';

export interface TrackDef {
  bpm: number;
  /** One note per eighth; loops. Length should be a multiple of 8 (one bar). */
  melody: (number | null)[];
  /** One pad chord per bar, cycling. */
  chords: number[][];
}

export const TRACKS: Record<MusicTrack, TrackDef> = {
  // Chapter 1 "Ruin": sparse A minor pentatonic, slow, lots of space.
  ruin: {
    bpm: 66,
    // prettier-ignore
    melody: [
      69, null, null, 72, null, 74, null, null,
      76, null, 74, null, 72, null, null, null,
      69, null, 67, null, null, 64, null, null,
      67, null, 69, null, null, null, null, null,
    ],
    chords: [
      [45, 52, 57],
      [43, 50, 55],
      [41, 48, 57],
      [40, 47, 52],
    ],
  },
  // Chapter 2 "Foundations": warmer D major pentatonic, a little more movement.
  foundations: {
    bpm: 80,
    // prettier-ignore
    melody: [
      74, null, 76, 78, null, 81, null, 78,
      76, null, 74, null, 71, null, 74, null,
      78, null, 81, 83, null, 81, 78, null,
      76, 78, 76, null, 74, null, null, null,
    ],
    chords: [
      [50, 57, 62],
      [47, 54, 59],
      [43, 50, 55],
      [45, 52, 57],
    ],
  },
};

/** Which loop suits a chapter: the opening is bleak, things warm up from Chapter 2. */
export function trackForChapter(chapter: number): MusicTrack {
  return chapter <= 1 ? 'ruin' : 'foundations';
}
