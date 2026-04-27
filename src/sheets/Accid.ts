/** Accidental symbols used in sheet music notation. */
export type Accid = 0 | 1 | 2 | 3 | 4;

export const Accid = {
  None:        0 as Accid,
  Sharp:       1 as Accid,
  Flat:        2 as Accid,
  Natural:     3 as Accid,
  DoubleSharp: 4 as Accid,
} as const;
