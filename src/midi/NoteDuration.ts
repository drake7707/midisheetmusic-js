/** Represents the duration of a note or rest in sheet music notation. */
export type NoteDuration =
  | 0  // ThirtySecond
  | 1  // Sixteenth
  | 2  // Triplet
  | 3  // Eighth
  | 4  // DottedEighth
  | 5  // Quarter
  | 6  // DottedQuarter
  | 7  // Half
  | 8  // DottedHalf
  | 9; // Whole

export const NoteDuration = {
  ThirtySecond:   0 as NoteDuration,
  Sixteenth:      1 as NoteDuration,
  Triplet:        2 as NoteDuration,
  Eighth:         3 as NoteDuration,
  DottedEighth:   4 as NoteDuration,
  Quarter:        5 as NoteDuration,
  DottedQuarter:  6 as NoteDuration,
  Half:           7 as NoteDuration,
  DottedHalf:     8 as NoteDuration,
  Whole:          9 as NoteDuration,
} as const;
