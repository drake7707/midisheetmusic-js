/**
 * Constants and helper methods for the chromatic note scale.
 * Notes are numbered 0–11 within an octave: A=0, A#=1, B=2, …
 */
export class NoteScale {
  static readonly A      = 0;
  static readonly Asharp = 1;
  static readonly Bflat  = 1;
  static readonly B      = 2;
  static readonly C      = 3;
  static readonly Csharp = 4;
  static readonly Dflat  = 4;
  static readonly D      = 5;
  static readonly Dsharp = 6;
  static readonly Eflat  = 6;
  static readonly E      = 7;
  static readonly F      = 8;
  static readonly Fsharp = 9;
  static readonly Gflat  = 9;
  static readonly G      = 10;
  static readonly Gsharp = 11;
  static readonly Aflat  = 11;

  /**
   * Return the MIDI note number for the given note scale value and octave.
   * Middle C (C4) = 60.
   */
  static ToNumber(notescale: number, octave: number): number {
    // A0 = 21 in MIDI; our A=0 starts at octave 0
    // The mapping: MIDI note = (octave+1)*12 + offset_from_C
    // But the original Java uses: A=0, so we need to map properly.
    // From WhiteNote.java: A2=33, C4=60
    // A is note 0 in our scale; MIDI A0=21
    // So MIDI = octave*12 + 21 + notescale  ... but A0=21 and our A=0,octave=0 -> 21 ✓
    // Actually: A0=21, A1=33, A2=45, A3=57, A4=69
    // octave*12 + 21 + notescale... A0: 0*12+21+0=21 ✓, C4: NoteScale.C=3, octave=4 -> 4*12+21+3=72 ✗ (C4=60)
    // Let's recalculate: C4=60. NoteScale.C=3. So: C0 = 12. 0*12+12+3-3=12 ✓ if we do (octave+1)*12 + offset_from_C_in_octave
    // offset of C from our A-based scale: C=3, so C is 3 semitones above A.
    // MIDI number = octave*12 + 12 + notescale  (where C0 = 12, A0 = 12-3 = 9... no)
    // 
    // Standard MIDI: C-1=0, C0=12, C4=60, A4=69
    // Our NoteScale: A=0 means A is the "first" note in the scale.
    // WhiteNote uses NoteScale to build note numbers. From WhiteNote.java:
    //   A3=45, so octave=3, NoteScale.A=0: ToNumber(0,3)=45
    //   C4=60, so octave=4, NoteScale.C=3: ToNumber(3,4)=60
    // Formula: result = octave*12 + 21 + notescale
    //   ToNumber(0,3) = 3*12+21+0 = 57 ✗ (should be 45)
    // Try: result = (octave-1)*12 + 21 + notescale
    //   ToNumber(0,3) = 2*12+21+0 = 45 ✓
    //   ToNumber(3,4) = 3*12+21+3 = 60 ✓
    //   ToNumber(0,4) = 3*12+21+0 = 57 = A4 ✓ (A4=69? no, A4=69 in standard MIDI)
    // Hmm. Let me check: standard MIDI A4=69. But from Java WhiteNote comments:
    //   A3=45, A4=57, A#4=58, B4=59, C4=60  <- non-standard! Uses C4=60 but A4=57
    // So the Java uses a non-standard mapping where C starts the octave differently.
    // From the comment: "A 4 = 57, A#4 = 58, B 4 = 59, C 4 = 60"
    // This means octave increments at C, not at A. A4 < C4 in numbering.
    // So A3=45, B3=47, C4=60? No wait: A4=57, B4=59, C4=60 - increment by 2 from A4 to B4?
    // Actually: A=0(0 semitones from A), A#=1, B=2, C=3, C#=4, D=5, D#=6, E=7, F=8, F#=9, G=10, G#=11
    // A3: 45. A4 = 45+12 = 57. That matches! C4 = 60.
    // A3=45 = 3*12+9 in standard (where A4=69=4*12+9). Hmm but here A3=45.
    // Standard: A3=57, C4=60. But Java says A3=45, C4=60.
    // Actually standard MIDI: C4=60, A4=69 (not 57). Java has A4=57 which is non-standard.
    // The Java seems to use: MIDI = octave*12 + 9 + notescale where octave starts at C.
    // Let me try: MIDI = octave*12 + 9 + notescale (A4 = 4*12+9+0 = 57 ✓, C4 = 4*12+9+3 = 60 ✓)
    // Wait: C4 = 4*12 + 9 + 3 = 60 ✓. A4 = 4*12 + 9 + 0 = 57 ✓. 
    // But A#4 = 4*12+9+1 = 58 ✓, B4 = 4*12+9+2 = 59 ✓. 
    // A3 = 3*12+9+0 = 45 ✓.
    return octave * 12 + 9 + notescale;
  }

  /**
   * Return the note scale (0–11, A=0) for the given MIDI note number.
   */
  static FromNumber(number: number): number {
    // Reverse of ToNumber: notescale = (number - 9) mod 12
    return ((number - 9) % 12 + 12) % 12;
  }

  /** Return true if the given note scale value corresponds to a black key. */
  static IsBlackKey(notescale: number): boolean {
    return (
      notescale === NoteScale.Asharp ||
      notescale === NoteScale.Csharp ||
      notescale === NoteScale.Dsharp ||
      notescale === NoteScale.Fsharp ||
      notescale === NoteScale.Gsharp
    );
  }
}
