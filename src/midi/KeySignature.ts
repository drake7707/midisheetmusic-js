import { Accid } from '@/sheets/Accid';
import { Clef } from '@/sheets/Clef';
import { WhiteNote } from '@/sheets/WhiteNote';
import { AccidSymbol } from '@/sheets/AccidSymbol';
import { NoteScale } from '@/midi/NoteScale';

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
  /** Per-notenumber accidental map (size 160, indexed by MIDI note number) */
  private keymap: Accid[] = new Array(160).fill(Accid.None);
  private prevmeasure: number = -1;

  /**
   * Accidental maps for each key signature.
   * Indexed [numSharps_or_numFlats][NoteScale], gives the Accid for a note in that key.
   * sharpkeys[0] = C major, sharpkeys[1] = G major, …
   * flatkeys[0] = C major (same), flatkeys[1] = F major, …
   */
  private static sharpkeys: Accid[][] | null = null;
  private static flatkeys:  Accid[][] | null = null;

  private static readonly trebleSharpNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.F, 5), new WhiteNote(WhiteNote.C, 5),
    new WhiteNote(WhiteNote.G, 5), new WhiteNote(WhiteNote.D, 5),
    new WhiteNote(WhiteNote.A, 5), new WhiteNote(WhiteNote.E, 5),
    new WhiteNote(WhiteNote.B, 5),
  ];
  private static readonly trebleFlatNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.B, 5), new WhiteNote(WhiteNote.E, 5),
    new WhiteNote(WhiteNote.A, 5), new WhiteNote(WhiteNote.D, 5),
    new WhiteNote(WhiteNote.G, 4), new WhiteNote(WhiteNote.C, 5),
    new WhiteNote(WhiteNote.F, 5),
  ];
  private static readonly bassSharpNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.F, 3), new WhiteNote(WhiteNote.C, 3),
    new WhiteNote(WhiteNote.G, 3), new WhiteNote(WhiteNote.D, 3),
    new WhiteNote(WhiteNote.A, 4), new WhiteNote(WhiteNote.E, 3),
    new WhiteNote(WhiteNote.B, 3),
  ];
  private static readonly bassFlatNotes: WhiteNote[] = [
    new WhiteNote(WhiteNote.B, 3), new WhiteNote(WhiteNote.E, 3),
    new WhiteNote(WhiteNote.A, 3), new WhiteNote(WhiteNote.D, 3),
    new WhiteNote(WhiteNote.G, 2), new WhiteNote(WhiteNote.C, 3),
    new WhiteNote(WhiteNote.F, 4),
  ];

  /** whole_sharps[notescale] → white note letter when using sharps notation */
  private static readonly whole_sharps: number[] = [
    WhiteNote.A, WhiteNote.A, WhiteNote.B,
    WhiteNote.C, WhiteNote.C, WhiteNote.D, WhiteNote.D,
    WhiteNote.E, WhiteNote.F, WhiteNote.F,
    WhiteNote.G, WhiteNote.G,
  ];

  /** whole_flats[notescale] → white note letter when using flats notation */
  private static readonly whole_flats: number[] = [
    WhiteNote.A, WhiteNote.B, WhiteNote.B,
    WhiteNote.C, WhiteNote.D, WhiteNote.D,
    WhiteNote.E, WhiteNote.E, WhiteNote.F,
    WhiteNote.G, WhiteNote.G, WhiteNote.A,
  ];

  constructor(num_sharps: number, num_flats: number = 0) {
    this.num_sharps = num_sharps;
    this.num_flats  = num_flats;
    KeySignature.createAccidentalMaps();
    this.resetKeyMap();
  }

  /** Build (once) the static sharpkeys and flatkeys tables, matching Java. */
  private static createAccidentalMaps(): void {
    if (KeySignature.sharpkeys !== null) return;

    const Sh = Accid.Sharp;
    const Fl = Accid.Flat;
    const Na = Accid.Natural;

    // Shorthand: build a 12-element array from NoteScale-keyed object
    function row(entries: Record<number, Accid>): Accid[] {
      const arr = new Array<Accid>(12).fill(Accid.None);
      for (const [k, v] of Object.entries(entries)) arr[Number(k)] = v;
      return arr;
    }

    const A = NoteScale.A, As = NoteScale.Asharp, B = NoteScale.B,
          C = NoteScale.C, Cs = NoteScale.Csharp, D = NoteScale.D,
          Ds = NoteScale.Dsharp, E = NoteScale.E, F = NoteScale.F,
          Fs = NoteScale.Fsharp, G = NoteScale.G, Gs = NoteScale.Gsharp;

    KeySignature.sharpkeys = [
      // C major (0 sharps)
      row({ [As]: Fl, [Cs]: Sh, [Ds]: Sh, [Fs]: Sh, [Gs]: Sh }),
      // G major (1 sharp: F#)
      row({ [As]: Fl, [Cs]: Sh, [Ds]: Sh, [F]: Na, [Gs]: Sh }),
      // D major (2 sharps: F#, C#)
      row({ [As]: Fl, [C]: Na, [Ds]: Sh, [F]: Na, [Gs]: Sh }),
      // A major (3 sharps: F#, C#, G#)
      row({ [As]: Fl, [C]: Na, [Ds]: Sh, [F]: Na, [G]: Na }),
      // E major (4 sharps: F#, C#, G#, D#)
      row({ [As]: Fl, [C]: Na, [D]: Na, [F]: Na, [G]: Na }),
      // B major (5 sharps: F#, C#, G#, D#, A#)
      row({ [A]: Na, [C]: Na, [D]: Na, [F]: Na, [G]: Na }),
      // F# major (6 sharps: F#, C#, G#, D#, A#, E#)
      row({ [A]: Na, [C]: Na, [D]: Na, [E]: Na, [G]: Na }),
      // C# major (7 sharps)
      row({ [A]: Na, [B]: Na, [C]: Na, [D]: Na, [E]: Na, [G]: Na }),
    ];

    KeySignature.flatkeys = [
      // C major (0 flats) — same as sharpkeys[0]
      row({ [As]: Fl, [Cs]: Sh, [Ds]: Sh, [Fs]: Sh, [Gs]: Sh }),
      // F major (1 flat: Bb)
      row({ [As]: Accid.None, [B]: Na, [Cs]: Sh, [Ds]: Fl, [Fs]: Sh, [Gs]: Fl }),
      // Bb major (2 flats: Bb, Eb)
      row({ [As]: Accid.None, [B]: Na, [Cs]: Sh, [Ds]: Accid.None, [E]: Na, [Fs]: Sh, [Gs]: Fl }),
      // Eb major (3 flats: Bb, Eb, Ab)
      row({ [A]: Na, [As]: Accid.None, [B]: Na, [Cs]: Fl, [Ds]: Accid.None, [E]: Na, [Fs]: Sh, [G]: Accid.None, [Gs]: Accid.None }),
      // Ab major (4 flats: Bb, Eb, Ab, Db)
      row({ [A]: Na, [As]: Accid.None, [B]: Na, [Cs]: Accid.None, [D]: Na, [Ds]: Accid.None, [E]: Na, [Fs]: Sh }),
      // Db major (5 flats: Bb, Eb, Ab, Db, Gb)
      row({ [A]: Na, [As]: Accid.None, [B]: Na, [Cs]: Accid.None, [D]: Na, [Ds]: Accid.None, [E]: Na, [Fs]: Accid.None, [G]: Na }),
      // Gb major (6 flats: Bb, Eb, Ab, Db, Gb, Cb)
      row({ [A]: Na, [As]: Accid.None, [B]: Accid.None, [C]: Na, [Cs]: Accid.None, [D]: Na, [Ds]: Accid.None, [E]: Na, [Fs]: Accid.None, [G]: Na }),
      // Cb major (7 flats)
      row({ [A]: Na, [As]: Accid.None, [B]: Accid.None, [C]: Accid.None, [Cs]: Accid.None, [D]: Na, [Ds]: Accid.None, [E]: Accid.None, [Fs]: Accid.None, [G]: Na }),
    ];
  }

  /** Reset keymap to the base key-signature accidentals for all note numbers. */
  private resetKeyMap(): void {
    KeySignature.createAccidentalMaps();
    const key = (this.num_flats > 0)
      ? KeySignature.flatkeys![this.num_flats]
      : KeySignature.sharpkeys![this.num_sharps];
    for (let n = 0; n < this.keymap.length; n++) {
      this.keymap[n] = key[NoteScale.FromNumber(n)];
    }
  }

  getNumSharps(): number { return this.num_sharps; }
  getNumFlats(): number { return this.num_flats; }

  /** Return the white note that should display the given MIDI note number. */
  GetWhiteNote(notenumber: number): WhiteNote {
    const notescale = NoteScale.FromNumber(notenumber);
    const octave = Math.floor((notenumber + 3) / 12) - 1;

    const accid = (notenumber >= 0 && notenumber < this.keymap.length)
      ? this.keymap[notenumber]
      : Accid.None;

    let letter: number;
    if (accid === Accid.Flat) {
      letter = KeySignature.whole_flats[notescale];
    } else if (accid === Accid.Sharp || accid === Accid.Natural) {
      letter = KeySignature.whole_sharps[notescale];
    } else {
      // accid === Accid.None: for black keys, check neighbors to determine
      // whether to use the flat (upper) or sharp (lower) note letter.
      // This mirrors the Java GetWhiteNote logic for key-signature notes.
      letter = KeySignature.whole_sharps[notescale];
      if (NoteScale.IsBlackKey(notescale) && notenumber > 0 && notenumber + 1 < this.keymap.length) {
        const prevAccid = this.keymap[notenumber - 1];
        const nextAccid = this.keymap[notenumber + 1];
        if (prevAccid === Accid.Natural && nextAccid === Accid.Natural) {
          letter = this.num_flats > 0
            ? KeySignature.whole_flats[notescale]
            : KeySignature.whole_sharps[notescale];
        } else if (prevAccid === Accid.Natural) {
          letter = KeySignature.whole_sharps[notescale];
        } else if (nextAccid === Accid.Natural) {
          letter = KeySignature.whole_flats[notescale];
        }
      }
    }

    // Special cases for G-flat major
    if (this.num_flats === KeySignature.flatsGflat && notescale === NoteScale.B) {
      letter = WhiteNote.C;
    }
    if (this.num_flats === KeySignature.flatsGflat && notescale === NoteScale.Bflat) {
      letter = WhiteNote.B;
    }

    // In flat keys, the A-flat note bumps the octave
    let noteOctave = octave;
    if (this.num_flats > 0 && notescale === NoteScale.Aflat) {
      noteOctave++;
    }

    return new WhiteNote(letter, noteOctave);
  }

  GetAccidental(notenumber: number, measure: number): Accid {
    if (measure !== this.prevmeasure) {
      this.prevmeasure = measure;
      this.resetKeyMap();
    }
    if (notenumber <= 1 || notenumber >= 127) return Accid.None;

    const result = this.keymap[notenumber];
    if (result === Accid.Sharp) {
      this.keymap[notenumber] = Accid.None;
      this.keymap[notenumber - 1] = Accid.Natural;
    } else if (result === Accid.Flat) {
      this.keymap[notenumber] = Accid.None;
      this.keymap[notenumber + 1] = Accid.Natural;
    } else if (result === Accid.Natural) {
      this.keymap[notenumber] = Accid.None;
      const nextkey = NoteScale.FromNumber(notenumber + 1);
      const prevkey = NoteScale.FromNumber(notenumber - 1);
      if (
        this.keymap[notenumber - 1] === Accid.None &&
        this.keymap[notenumber + 1] === Accid.None &&
        NoteScale.IsBlackKey(nextkey) &&
        NoteScale.IsBlackKey(prevkey)
      ) {
        if (this.num_flats === 0) {
          this.keymap[notenumber + 1] = Accid.Sharp;
        } else {
          this.keymap[notenumber - 1] = Accid.Flat;
        }
      } else if (this.keymap[notenumber - 1] === Accid.None && NoteScale.IsBlackKey(prevkey)) {
        this.keymap[notenumber - 1] = Accid.Flat;
      } else if (this.keymap[notenumber + 1] === Accid.None && NoteScale.IsBlackKey(nextkey)) {
        this.keymap[notenumber + 1] = Accid.Sharp;
      }
    }
    return result;
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
    const flatmajor  = [NoteScale.C, NoteScale.F, NoteScale.Bflat, NoteScale.Eflat, NoteScale.Aflat, NoteScale.Dflat, NoteScale.Gflat, NoteScale.B];
    const sharpmajor = [NoteScale.C, NoteScale.G, NoteScale.D, NoteScale.A, NoteScale.E, NoteScale.B, NoteScale.Fsharp, NoteScale.Csharp];
    if (this.num_flats > 0) return flatmajor[Math.min(this.num_flats, flatmajor.length - 1)];
    return sharpmajor[Math.min(this.num_sharps, sharpmajor.length - 1)];
  }

  /** Guess the best key signature for the given MIDI note numbers. */
  static Guess(notenums: number[]): KeySignature {
    KeySignature.createAccidentalMaps();

    // Count frequency of each note in the 12-tone scale
    const notecount = new Array<number>(12).fill(0);
    for (const n of notenums) {
      notecount[NoteScale.FromNumber(n)]++;
    }

    let bestkey = 0;
    let isBestSharp = true;
    let smallestAccidCount = notenums.length + 1;

    for (let key = 0; key < KeySignature.sharpkeys!.length; key++) {
      let count = 0;
      for (let n = 0; n < 12; n++) {
        if (KeySignature.sharpkeys![key][n] !== Accid.None) count += notecount[n];
      }
      if (count < smallestAccidCount) {
        smallestAccidCount = count;
        bestkey = key;
        isBestSharp = true;
      }
    }
    for (let key = 0; key < KeySignature.flatkeys!.length; key++) {
      let count = 0;
      for (let n = 0; n < 12; n++) {
        if (KeySignature.flatkeys![key][n] !== Accid.None) count += notecount[n];
      }
      if (count < smallestAccidCount) {
        smallestAccidCount = count;
        bestkey = key;
        isBestSharp = false;
      }
    }

    if (isBestSharp) return new KeySignature(bestkey, 0);
    return new KeySignature(0, bestkey);
  }
}
