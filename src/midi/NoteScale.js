/**
 * Constants and helper methods for the chromatic note scale.
 * Notes are numbered 0–11 within an octave: A=0, A#=1, B=2, …
 */
export class NoteScale {
    static A = 0;
    static Asharp = 1;
    static Bflat = 1;
    static B = 2;
    static C = 3;
    static Csharp = 4;
    static Dflat = 4;
    static D = 5;
    static Dsharp = 6;
    static Eflat = 6;
    static E = 7;
    static F = 8;
    static Fsharp = 9;
    static Gflat = 9;
    static G = 10;
    static Gsharp = 11;
    static Aflat = 11;
    /**
     * Return the MIDI note number for the given note scale value and octave.
     * Middle C (C4) = 60.
     */
    static ToNumber(notescale, octave) {
        // Uses the Java MidiSheetMusic convention where octave boundaries fall at C,
        // not A. This is non-standard MIDI (standard has A4=69) but matches the
        // original Java: A4=57, C4=60. Formula: octave*12 + 9 + notescale.
        return octave * 12 + 9 + notescale;
    }
    /**
     * Return the note scale (0–11, A=0) for the given MIDI note number.
     */
    static FromNumber(number) {
        // Reverse of ToNumber: notescale = (number - 9) mod 12
        return ((number - 9) % 12 + 12) % 12;
    }
    /** Return true if the given note scale value corresponds to a black key. */
    static IsBlackKey(notescale) {
        return (notescale === NoteScale.Asharp ||
            notescale === NoteScale.Csharp ||
            notescale === NoteScale.Dsharp ||
            notescale === NoteScale.Fsharp ||
            notescale === NoteScale.Gsharp);
    }
}
