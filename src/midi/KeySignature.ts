import { Accid } from '@/sheets/Accid';
import { Clef } from '@/sheets/Clef';
import { WhiteNote } from '@/sheets/WhiteNote';
import { AccidSymbol } from '@/sheets/AccidSymbol';

export class KeySignature {
  static readonly sharpsC = 0;
  static readonly sharpsG = 1;
  static readonly sharpsD = 2;
  static readonly sharpsA = 3;
  static readonly sharpsE = 4;
  static readonly sharpsB = 5;

  static readonly flatsF     = 1;
  static readonly flatsBflat = 2;
  static readonly flatsEflat = 3;
  static readonly flatsAflat = 4;
  static readonly flatsDflat = 5;
  static readonly flatsGflat = 6;

  private num_sharps: number;
  private num_flats: number;
  private keymap: Accid[] = new Array(12).fill(Accid.None);
  private prevmeasure: number = -1;

  /** Chromatic scale indices (NoteScale-based, A=0) of sharps/flats in order */
  private static readonly sharpNoteScales = [9, 4, 11, 6, 1, 8, 3]; // F#,C#,G#,D#,A#,E#,B#
  private static readonly flatNoteScales  = [2, 7, 0, 5, 10, 3, 8]; // Bb,Eb,Ab,Db,Gb,Cb,Fb

  private static readonly trebleSharpNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.F, 5), new WhiteNote(WhiteNote.C, 5),
    new WhiteNote(WhiteNote.G, 5), new WhiteNote(WhiteNote.D, 5),
    new WhiteNote(WhiteNote.A, 5), new WhiteNote(WhiteNote.E, 5),
    new WhiteNote(WhiteNote.B, 5),
  ];
  private static readonly trebleFlatNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.B, 4), new WhiteNote(WhiteNote.E, 5),
    new WhiteNote(WhiteNote.A, 4), new WhiteNote(WhiteNote.D, 5),
    new WhiteNote(WhiteNote.G, 4), new WhiteNote(WhiteNote.C, 5),
    new WhiteNote(WhiteNote.F, 5),
  ];
  private static readonly bassSharpNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.F, 4), new WhiteNote(WhiteNote.C, 4),
    new WhiteNote(WhiteNote.G, 4), new WhiteNote(WhiteNote.D, 4),
    new WhiteNote(WhiteNote.A, 4), new WhiteNote(WhiteNote.E, 4),
    new WhiteNote(WhiteNote.B, 4),
  ];
  private static readonly bassFlatNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.B, 3), new WhiteNote(WhiteNote.E, 4),
    new WhiteNote(WhiteNote.A, 3), new WhiteNote(WhiteNote.D, 4),
    new WhiteNote(WhiteNote.G, 3), new WhiteNote(WhiteNote.C, 4),
    new WhiteNote(WhiteNote.F, 4),
  ];

  constructor(num_sharps: number, num_flats: number = 0) {
    this.num_sharps = num_sharps;
    this.num_flats  = num_flats;
    this.buildKeymap();
  }

  private buildKeymap(): void {
    this.keymap = new Array(12).fill(Accid.None);
    for (let i = 0; i < this.num_sharps; i++) {
      this.keymap[KeySignature.sharpNoteScales[i]] = Accid.Sharp;
    }
    for (let i = 0; i < this.num_flats; i++) {
      this.keymap[KeySignature.flatNoteScales[i]] = Accid.Flat;
    }
  }

  getNumSharps(): number { return this.num_sharps; }
  getNumFlats(): number { return this.num_flats; }

  GetWhiteNote(notenumber: number): WhiteNote {
    const scale = notenumber % 12;
    const octave = Math.floor(notenumber / 12) - 1;
    // Map chromatic scale (A=0 based) to white note letter
    const scaleToLetter: number[] = [
      WhiteNote.A, WhiteNote.A, WhiteNote.B,
      WhiteNote.C, WhiteNote.C, WhiteNote.D, WhiteNote.D,
      WhiteNote.E, WhiteNote.F, WhiteNote.F,
      WhiteNote.G, WhiteNote.G,
    ];
    const letter = scaleToLetter[scale];
    const noteOctave = octave + (scale >= 3 ? 1 : 0);
    return new WhiteNote(letter, noteOctave);
  }

  GetAccidental(notenumber: number, measure: number): Accid {
    if (measure !== this.prevmeasure) {
      this.prevmeasure = measure;
      this.buildKeymap();
    }
    const scale = notenumber % 12;
    return this.keymap[scale];
  }

  GetSymbols(clef: Clef): AccidSymbol[] {
    const result: AccidSymbol[] = [];
    if (this.num_sharps > 0) {
      const notes = (clef === Clef.Treble)
        ? KeySignature.trebleSharpNotes
        : KeySignature.bassSharpNotes;
      for (let i = 0; i < this.num_sharps && i < notes.length; i++) {
        result.push(new AccidSymbol(Accid.Sharp, notes[i], clef));
      }
    } else if (this.num_flats > 0) {
      const notes = (clef === Clef.Treble)
        ? KeySignature.trebleFlatNotes
        : KeySignature.bassFlatNotes;
      for (let i = 0; i < this.num_flats && i < notes.length; i++) {
        result.push(new AccidSymbol(Accid.Flat, notes[i], clef));
      }
    }
    return result;
  }

  /** Return the root note scale (A=0) of this key signature. */
  Notescale(): number {
    if (this.num_sharps > 0) {
      const roots = [3, 10, 5, 0, 7, 2, 9];
      return roots[Math.min(this.num_sharps, roots.length - 1)];
    } else if (this.num_flats > 0) {
      const roots = [3, 8, 1, 6, 11, 4, 9, 2];
      return roots[Math.min(this.num_flats, roots.length - 1)];
    }
    return 3; // C major (A=0 based: C=3)
  }

  static Guess(_notenums: number[]): KeySignature {
    return new KeySignature(0, 0);
  }
}
