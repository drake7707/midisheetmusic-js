/** Clef types used in sheet music. */
export type Clef = 0 | 1 | 2 | 3 | 4;

export const Clef = {
  Treble: 0 as Clef,
  Bass:   1 as Clef,
  Alto:   2 as Clef,
  Tenor:  3 as Clef,
  Blank:  4 as Clef,
} as const;
