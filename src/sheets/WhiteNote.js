import { Clef } from './Clef';
import { NoteScale } from '../midi/NoteScale';
/**
 * Represents a white key (non-sharp, non-flat) note on the staff.
 * White notes consist of a letter (A–G) and an octave.
 * Octave changes from G to A: after G2 comes A3. Middle-C is C4.
 */
export class WhiteNote {
    static A = 0;
    static B = 1;
    static C = 2;
    static D = 3;
    static E = 4;
    static F = 5;
    static G = 6;
    static TopTreble = new WhiteNote(WhiteNote.E, 5);
    static BottomTreble = new WhiteNote(WhiteNote.F, 4);
    static TopBass = new WhiteNote(WhiteNote.G, 3);
    static BottomBass = new WhiteNote(WhiteNote.A, 3);
    static MiddleC = new WhiteNote(WhiteNote.C, 4);
    letter;
    octave;
    constructor(letter, octave) {
        if (letter < 0 || letter > 6)
            throw new Error('Invalid note letter');
        this.letter = letter;
        this.octave = octave;
    }
    getLetter() { return this.letter; }
    getOctave() { return this.octave; }
    /**
     * Return the distance (in white notes) between this note and note w: this - w.
     * For example, C4 - A4 = 2.
     */
    Dist(w) {
        return (this.octave - w.octave) * 7 + (this.letter - w.letter);
    }
    /**
     * Return this note plus the given amount (in white notes).
     * The amount may be positive or negative.
     */
    Add(amount) {
        let num = this.octave * 7 + this.letter;
        num += amount;
        if (num < 0)
            num = 0;
        return new WhiteNote(num % 7, Math.floor(num / 7));
    }
    /**
     * Return the MIDI note number for this white note.
     * Middle C (C4) = 60.
     */
    getNumber() {
        let offset = 0;
        switch (this.letter) {
            case WhiteNote.A:
                offset = NoteScale.A;
                break;
            case WhiteNote.B:
                offset = NoteScale.B;
                break;
            case WhiteNote.C:
                offset = NoteScale.C;
                break;
            case WhiteNote.D:
                offset = NoteScale.D;
                break;
            case WhiteNote.E:
                offset = NoteScale.E;
                break;
            case WhiteNote.F:
                offset = NoteScale.F;
                break;
            case WhiteNote.G:
                offset = NoteScale.G;
                break;
        }
        return NoteScale.ToNumber(offset, this.octave);
    }
    /** Compare two notes: < 0 if x < y, 0 if equal, > 0 if x > y */
    static compare(x, y) {
        return x.Dist(y);
    }
    static Max(x, y) {
        return x.Dist(y) > 0 ? x : y;
    }
    static Min(x, y) {
        return x.Dist(y) < 0 ? x : y;
    }
    /** Return the top note in the staff of the given clef. */
    static Top(clef) {
        return clef === Clef.Treble ? WhiteNote.TopTreble : WhiteNote.TopBass;
    }
    /** Return the bottom note in the staff of the given clef. */
    static Bottom(clef) {
        return clef === Clef.Treble ? WhiteNote.BottomTreble : WhiteNote.BottomBass;
    }
    toString() {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        return letters[this.letter] + this.octave;
    }
}
