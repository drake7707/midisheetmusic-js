import type { MusicSymbol } from './MusicSymbol';
import type { ISheetMusic } from './ISheetMusic';
import { Accid } from './Accid';
import { Clef } from './Clef';
import { WhiteNote } from './WhiteNote';
import { AccidSymbol } from './AccidSymbol';
import { Stem } from './Stem';
import { MidiNote } from '@/midi/MidiNote';
import { NoteData } from '@/midi/NoteData';
import { NoteScale } from '@/midi/NoteScale';
import { NoteDuration } from '@/midi/NoteDuration';
import { KeySignature } from '@/midi/KeySignature';
import { TimeSignature } from '@/midi/TimeSignature';
import {
  NoteNameNone,
  NoteNameLetter,
  NoteNameFixedDoReMi,
  NoteNameMovableDoReMi,
  NoteNameFixedNumber,
  NoteNameMovableNumber,
} from '@/midi/MidiFile';
import {
  NoteHeight, NoteWidth, LineSpace, LineWidth,
} from './SheetMusicConstants';

const STACCATO_RATIO    = 2;
const STACCATO_DOT_RADIUS = 2;

/** A group of notes played at the same time (a chord). */
export class ChordSymbol implements MusicSymbol {
  private clef: Clef;
  private starttime: number;
  private endtime: number;
  private notedata: NoteData[];
  private accidsymbols: AccidSymbol[];
  private width: number;
  private stem1: Stem | null;
  private stem2: Stem | null;
  private hastwostems: boolean;
  private sheetmusic: ISheetMusic | null;
  private tiedNotes: WhiteNote[] | null = null;
  private tiedFromPrevNotes: WhiteNote[] | null = null;
  private tiedToPrev: boolean = false;
  private staccato: boolean;

  constructor(
    midinotes: MidiNote[],
    key: KeySignature,
    time: TimeSignature,
    c: Clef,
    sheet: ISheetMusic | null,
    startTime: number
  ) {
    this.hastwostems = false;
    this.clef        = c;
    this.sheetmusic  = sheet;
    this.starttime   = startTime;
    this.endtime     = midinotes[0].getEndTime();

    for (let i = 0; i < midinotes.length; i++) {
      this.endtime = Math.max(this.endtime, midinotes[i].getEndTime());
    }

    this.notedata     = ChordSymbol.CreateNoteData(midinotes, key, time);
    this.accidsymbols = ChordSymbol.CreateAccidSymbols(this.notedata, c);

    // Propagate tie flags
    for (const midi of midinotes) {
      if (midi.isTiedToPrev()) {
        this.tiedToPrev = true;
        for (const nd of this.notedata) {
          if (nd.number === midi.getNumber()) {
            if (this.tiedFromPrevNotes === null) this.tiedFromPrevNotes = [];
            this.tiedFromPrevNotes.push(nd.whitenote);
            break;
          }
        }
      }
      if (midi.isTiedToNext()) {
        for (const nd of this.notedata) {
          if (nd.number === midi.getNumber()) {
            if (this.tiedNotes === null) this.tiedNotes = [];
            this.tiedNotes.push(nd.whitenote);
            break;
          }
        }
      }
    }

    const dur1 = this.notedata[0].duration;
    let dur2   = dur1;
    let change = -1;
    for (let i = 0; i < this.notedata.length; i++) {
      dur2 = this.notedata[i].duration;
      if (dur1 !== dur2) { change = i; break; }
    }

    if (dur1 !== dur2) {
      this.hastwostems = true;
      this.stem1 = new Stem(
        this.notedata[0].whitenote,
        this.notedata[change - 1].whitenote,
        dur1,
        Stem.Down,
        ChordSymbol.NotesOverlap(this.notedata, 0, change)
      );
      this.stem2 = new Stem(
        this.notedata[change].whitenote,
        this.notedata[this.notedata.length - 1].whitenote,
        dur2,
        Stem.Up,
        ChordSymbol.NotesOverlap(this.notedata, change, this.notedata.length)
      );
    } else {
      const direction = ChordSymbol.StemDirection(
        this.notedata[0].whitenote,
        this.notedata[this.notedata.length - 1].whitenote,
        c
      );
      this.stem1 = new Stem(
        this.notedata[0].whitenote,
        this.notedata[this.notedata.length - 1].whitenote,
        dur1,
        direction,
        ChordSymbol.NotesOverlap(this.notedata, 0, this.notedata.length)
      );
      this.stem2 = null;
    }

    if (dur1 === NoteDuration.Whole) this.stem1 = null;
    if (dur2 === NoteDuration.Whole) this.stem2 = null;

    this.width    = this.getMinWidth();
    this.staccato = ChordSymbol.computeStaccato(midinotes);
  }

  private static computeStaccato(midinotes: MidiNote[]): boolean {
    let eligible   = 0;
    let staccatoCount = 0;
    for (const note of midinotes) {
      if (note.isTiedToPrev()) continue;
      eligible++;
      const sounding = note.getSoundingDuration();
      const notated  = note.getDuration();
      if (sounding > 0 && sounding * STACCATO_RATIO <= notated) staccatoCount++;
    }
    return eligible > 0 && staccatoCount === eligible;
  }

  private static CreateNoteData(midinotes: MidiNote[], key: KeySignature, time: TimeSignature): NoteData[] {
    return midinotes.map((midi, i) => {
      const nd       = new NoteData();
      nd.number      = midi.getNumber();
      nd.leftside    = true;
      nd.whitenote   = key.GetWhiteNote(midi.getNumber());
      nd.duration    = time.GetNoteDuration(midi.getEndTime() - midi.getStartTime());
      nd.accid       = key.GetAccidental(midi.getNumber(), Math.floor(midi.getStartTime() / time.getMeasure()));
      if (i > 0) {
        const prev = midinotes[i - 1];
        const prevNd = { whitenote: key.GetWhiteNote(prev.getNumber()) };
        if (nd.whitenote.Dist(prevNd.whitenote) === 1) {
          nd.leftside = !true; // will be set from previous
        }
      }
      return nd;
    });
  }

  private static CreateAccidSymbols(notedata: NoteData[], clef: Clef): AccidSymbol[] {
    const result: AccidSymbol[] = [];
    for (const n of notedata) {
      if (n.accid !== Accid.None) {
        result.push(new AccidSymbol(n.accid, n.whitenote, clef));
      }
    }
    return result;
  }

  private static StemDirection(bottom: WhiteNote, top: WhiteNote, clef: Clef): number {
    const middle = clef === Clef.Treble
      ? new WhiteNote(WhiteNote.B, 5)
      : new WhiteNote(WhiteNote.D, 3);
    const dist = middle.Dist(bottom) + middle.Dist(top);
    return dist >= 0 ? Stem.Up : Stem.Down;
  }

  private static NotesOverlap(notedata: NoteData[], start: number, end: number): boolean {
    for (let i = start; i < end; i++) {
      if (!notedata[i].leftside) return true;
    }
    return false;
  }

  getStartTime(): number { return this.starttime; }
  getEndTime(): number { return this.endtime; }
  getClef(): Clef { return this.clef; }
  getHasTwoStems(): boolean { return this.hastwostems; }
  hasTie(): boolean { return this.tiedNotes !== null && this.tiedNotes.length > 0; }
  getTiedNotes(): WhiteNote[] | null { return this.tiedNotes; }
  isTiedToPrev(): boolean { return this.tiedToPrev; }
  getTiedFromPrevNotes(): WhiteNote[] | null { return this.tiedFromPrevNotes; }

  private getAccidWidth(): number {
    if (this.accidsymbols.length === 0) return 0;
    let xpos = 0;
    let prev: AccidSymbol | null = null;
    for (const symbol of this.accidsymbols) {
      if (prev !== null && symbol.getNote().Dist(prev.getNote()) < 6) {
        xpos += symbol.getWidth();
      }
      prev = symbol;
    }
    if (prev) xpos += prev.getWidth();
    return xpos;
  }

  getNoteXRight(): number {
    return this.width - (2 * NoteHeight + Math.floor(NoteHeight * 3 / 4))
      + Math.floor(LineSpace / 4) + NoteWidth;
  }

  getNoteXLeft(): number {
    return this.width - (2 * NoteHeight + Math.floor(NoteHeight * 3 / 4))
      + Math.floor(LineSpace / 4);
  }

  getStem(): Stem | null {
    if (this.stem1 === null) return this.stem2;
    if (this.stem2 === null) return this.stem1;
    // Return the shorter (smaller ordinal) duration stem
    return this.stem1.getDuration() < this.stem2.getDuration() ? this.stem1 : this.stem2;
  }

  getWidth(): number { return this.width; }
  setWidth(value: number): void { this.width = value; }

  getMinWidth(): number {
    let result = 2 * NoteHeight + Math.floor(NoteHeight * 3 / 4);
    if (this.accidsymbols.length > 0) {
      result += this.accidsymbols[0].getMinWidth();
      for (let i = 1; i < this.accidsymbols.length; i++) {
        const accid = this.accidsymbols[i];
        const prev  = this.accidsymbols[i - 1];
        if (accid.getNote().Dist(prev.getNote()) < 6) {
          result += accid.getMinWidth();
        }
      }
    }
    if (this.sheetmusic !== null && this.sheetmusic.getShowNoteLetters() !== NoteNameNone) {
      result += 8;
    }
    return result;
  }

  getAboveStaff(): number {
    let topnote = this.notedata[this.notedata.length - 1].whitenote;
    if (this.stem1) topnote = WhiteNote.Max(topnote, this.stem1.getEnd());
    if (this.stem2) topnote = WhiteNote.Max(topnote, this.stem2.getEnd());

    const dist = topnote.Dist(WhiteNote.Top(this.clef)) * Math.floor(NoteHeight / 2);
    let result = dist > 0 ? dist : 0;

    for (const symbol of this.accidsymbols) {
      if (symbol.getAboveStaff() > result) result = symbol.getAboveStaff();
    }
    if (this.stem1 && this.stem1.isTriplet() && this.stem1.getDirection() === Stem.Up) {
      result += 3 * NoteHeight;
    }
    return result;
  }

  getBelowStaff(): number {
    let bottomnote = this.notedata[0].whitenote;
    if (this.stem1) bottomnote = WhiteNote.Min(bottomnote, this.stem1.getEnd());
    if (this.stem2) bottomnote = WhiteNote.Min(bottomnote, this.stem2.getEnd());

    const dist = WhiteNote.Bottom(this.clef).Dist(bottomnote) * Math.floor(NoteHeight / 2);
    let result = dist > 0 ? dist : 0;

    for (const symbol of this.accidsymbols) {
      if (symbol.getBelowStaff() > result) result = symbol.getBelowStaff();
    }
    if (this.stem1 && this.stem1.isTriplet() && this.stem1.getDirection() === Stem.Down) {
      result += 3 * NoteHeight;
    }
    return result;
  }

  private NoteName(notenumber: number, whitenote: WhiteNote): string {
    const showLetters = this.sheetmusic?.getShowNoteLetters() ?? NoteNameNone;
    if (showLetters === NoteNameLetter) {
      return this.Letter(notenumber, whitenote);
    } else if (showLetters === NoteNameFixedDoReMi) {
      const fixedDoReMi = ['La','Li','Ti','Do','Di','Re','Ri','Mi','Fa','Fi','So','Si'];
      return fixedDoReMi[NoteScale.FromNumber(notenumber)];
    } else if (showLetters === NoteNameMovableDoReMi) {
      const fixedDoReMi = ['La','Li','Ti','Do','Di','Re','Ri','Mi','Fa','Fi','So','Si'];
      const mainscale   = this.sheetmusic!.getMainKey().Notescale();
      let n = notenumber + (NoteScale.C - mainscale);
      if (n < 0) n += 12;
      return fixedDoReMi[NoteScale.FromNumber(n)];
    } else if (showLetters === NoteNameFixedNumber) {
      const num = ['10','11','12','1','2','3','4','5','6','7','8','9'];
      return num[NoteScale.FromNumber(notenumber)];
    } else if (showLetters === NoteNameMovableNumber) {
      const num = ['10','11','12','1','2','3','4','5','6','7','8','9'];
      const mainscale = this.sheetmusic!.getMainKey().Notescale();
      let n = notenumber + (NoteScale.C - mainscale);
      if (n < 0) n += 12;
      return num[NoteScale.FromNumber(n)];
    }
    return '';
  }

  private Letter(notenumber: number, whitenote: WhiteNote): string {
    const notescale = NoteScale.FromNumber(notenumber);
    switch (notescale) {
      case NoteScale.A:      return 'A';
      case NoteScale.B:      return 'B';
      case NoteScale.C:      return 'C';
      case NoteScale.D:      return 'D';
      case NoteScale.E:      return 'E';
      case NoteScale.F:      return 'F';
      case NoteScale.G:      return 'G';
      case NoteScale.Asharp: return whitenote.getLetter() === WhiteNote.A ? 'A#' : 'Bb';
      case NoteScale.Csharp: return whitenote.getLetter() === WhiteNote.C ? 'C#' : 'Db';
      case NoteScale.Dsharp: return whitenote.getLetter() === WhiteNote.D ? 'D#' : 'Eb';
      case NoteScale.Fsharp: return whitenote.getLetter() === WhiteNote.F ? 'F#' : 'Gb';
      case NoteScale.Gsharp: return whitenote.getLetter() === WhiteNote.G ? 'G#' : 'Ab';
      default: return '';
    }
  }

  Draw(ctx: CanvasRenderingContext2D, ytop: number): void {
    ctx.save();
    ctx.translate(this.getWidth() - this.getMinWidth(), 0);

    const topstaff = WhiteNote.Top(this.clef);
    const xpos     = this.DrawAccid(ctx, ytop);

    ctx.save();
    ctx.translate(xpos, 0);
    this.DrawNotes(ctx, ytop, topstaff);

    if (this.sheetmusic !== null && this.sheetmusic.getShowNoteLetters() !== NoteNameNone) {
      this.DrawNoteLetters(ctx, ytop, topstaff);
    }
    if (this.stem1) this.stem1.Draw(ctx, ytop, topstaff);
    if (this.stem2) this.stem2.Draw(ctx, ytop, topstaff);
    if (this.staccato) this.DrawStaccato(ctx, ytop, topstaff);

    ctx.restore();
    ctx.restore();
  }

  private DrawStaccato(ctx: CanvasRenderingContext2D, ytop: number, topstaff: WhiteNote): void {
    const dotRadius = STACCATO_DOT_RADIUS;
    const gap       = Math.floor(LineSpace / 2);
    const xnote     = Math.floor(LineSpace / 4);
    const xCenter   = xnote + Math.floor(NoteWidth / 2);

    const stemUp = (this.stem1 !== null && this.stem1.getDirection() === Stem.Up)
                || (this.stem1 === null && this.stem2 === null);

    let yCenter: number;
    if (stemUp) {
      const yBottom = ytop + topstaff.Dist(this.notedata[0].whitenote) * Math.floor(NoteHeight / 2);
      yCenter = yBottom + NoteHeight + gap + dotRadius;
    } else {
      const yTop = ytop + topstaff.Dist(this.notedata[this.notedata.length - 1].whitenote) * Math.floor(NoteHeight / 2);
      yCenter = yTop - gap - dotRadius;
    }

    ctx.beginPath();
    ctx.ellipse(xCenter, yCenter, dotRadius, dotRadius, 0, 0, 2 * Math.PI);
    ctx.fill();
  }

  DrawAccid(ctx: CanvasRenderingContext2D, ytop: number): number {
    let xpos = 0;
    let prev: AccidSymbol | null = null;
    for (const symbol of this.accidsymbols) {
      if (prev !== null && symbol.getNote().Dist(prev.getNote()) < 6) {
        xpos += symbol.getWidth();
      }
      ctx.save();
      ctx.translate(xpos, 0);
      symbol.Draw(ctx, ytop);
      ctx.restore();
      prev = symbol;
    }
    if (prev) xpos += prev.getWidth();
    return xpos;
  }

  DrawNotes(ctx: CanvasRenderingContext2D, ytop: number, topstaff: WhiteNote): void {
    ctx.lineWidth = 1;
    for (const note of this.notedata) {
      const ynote = ytop + topstaff.Dist(note.whitenote) * Math.floor(NoteHeight / 2);
      let xnote   = Math.floor(LineSpace / 4);
      if (!note.leftside) xnote += NoteWidth;

      ctx.save();
      ctx.translate(xnote + Math.floor(NoteWidth / 2) + 1, ynote - LineWidth + Math.floor(NoteHeight / 2));
      ctx.rotate(-45 * Math.PI / 180);

      if (this.sheetmusic !== null) {
        const color = this.sheetmusic.NoteColor(note.number);
        ctx.strokeStyle = `rgb(${(color >> 16) & 0xFF},${(color >> 8) & 0xFF},${color & 0xFF})`;
        ctx.fillStyle   = ctx.strokeStyle;
      } else {
        ctx.strokeStyle = 'black';
        ctx.fillStyle   = 'black';
      }

      const rx = NoteWidth / 2;
      const ry = (NoteHeight - 1) / 2;

      if (
        note.duration === NoteDuration.Whole ||
        note.duration === NoteDuration.Half  ||
        note.duration === NoteDuration.DottedHalf
      ) {
        // Open (hollow) note: draw 3 layered ellipses to simulate thick outline
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry - k * 0.5, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      ctx.strokeStyle = 'black';
      ctx.fillStyle   = 'black';
      ctx.rotate(45 * Math.PI / 180);
      ctx.restore();

      // Dot for dotted durations
      if (
        note.duration === NoteDuration.DottedHalf    ||
        note.duration === NoteDuration.DottedQuarter ||
        note.duration === NoteDuration.DottedEighth
      ) {
        const dx = xnote + NoteWidth + Math.floor(LineSpace / 3);
        const dy = ynote + Math.floor(LineSpace / 3);
        ctx.beginPath();
        ctx.ellipse(dx + 2, dy + 2, 2, 2, 0, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Ledger lines above
      const top2  = topstaff.Add(1);
      let dist    = note.whitenote.Dist(top2);
      let y       = ytop - LineWidth;
      if (dist >= 2) {
        for (let i = 2; i <= dist; i += 2) {
          y -= NoteHeight;
          ctx.beginPath();
          ctx.moveTo(xnote - Math.floor(LineSpace / 4), y);
          ctx.lineTo(xnote + NoteWidth + Math.floor(LineSpace / 4), y);
          ctx.stroke();
        }
      }

      // Ledger lines below
      const bottom2 = top2.Add(-8);
      y = ytop + (LineSpace + LineWidth) * 4 - 1;
      dist = bottom2.Dist(note.whitenote);
      if (dist >= 2) {
        for (let i = 2; i <= dist; i += 2) {
          y += NoteHeight;
          ctx.beginPath();
          ctx.moveTo(xnote - Math.floor(LineSpace / 4), y);
          ctx.lineTo(xnote + NoteWidth + Math.floor(LineSpace / 4), y);
          ctx.stroke();
        }
      }
    }
  }

  DrawNoteLetters(ctx: CanvasRenderingContext2D, ytop: number, topstaff: WhiteNote): void {
    const overlap = ChordSymbol.NotesOverlap(this.notedata, 0, this.notedata.length);
    ctx.lineWidth = 1;
    if (this.sheetmusic) {
      const color = this.sheetmusic.getTextColor();
      ctx.fillStyle = `rgb(${(color >> 16) & 0xFF},${(color >> 8) & 0xFF},${color & 0xFF})`;
    }

    for (const note of this.notedata) {
      if (!note.leftside) continue;
      const ynote = ytop + topstaff.Dist(note.whitenote) * Math.floor(NoteHeight / 2);
      let xnote   = NoteWidth + Math.floor(NoteWidth / 2);
      if (
        note.duration === NoteDuration.DottedHalf    ||
        note.duration === NoteDuration.DottedQuarter ||
        note.duration === NoteDuration.DottedEighth  ||
        overlap
      ) {
        xnote += Math.floor(NoteWidth / 2);
      }
      ctx.fillText(
        this.NoteName(note.number, note.whitenote),
        xnote,
        ynote + Math.floor(NoteHeight / 2)
      );
    }
  }

  static CanCreateBeam(chords: ChordSymbol[], time: TimeSignature, startQuarter: boolean): boolean {
    const numChords = chords.length;
    const firstStem = chords[0].getStem();
    const lastStem  = chords[chords.length - 1].getStem();
    if (!firstStem || !lastStem) return false;

    const measure = Math.floor(chords[0].getStartTime() / time.getMeasure());
    const dur     = firstStem.getDuration();
    const dur2    = lastStem.getDuration();

    const dotted8_to_16 = numChords === 2 && dur === NoteDuration.DottedEighth && dur2 === NoteDuration.Sixteenth;

    let mixed_16_8_16 = false;
    let mixed_8_16_16 = false;
    let mixed_16_16_8 = false;
    if (numChords === 3) {
      const midStem = chords[1].getStem();
      if (midStem) {
        if (dur === NoteDuration.Sixteenth && midStem.getDuration() === NoteDuration.Eighth && dur2 === NoteDuration.Sixteenth) mixed_16_8_16 = true;
        else if (dur === NoteDuration.Eighth && midStem.getDuration() === NoteDuration.Sixteenth && dur2 === NoteDuration.Sixteenth) mixed_8_16_16 = true;
        else if (dur === NoteDuration.Sixteenth && midStem.getDuration() === NoteDuration.Sixteenth && dur2 === NoteDuration.Eighth) mixed_16_16_8 = true;
      }
    }
    const anyMixed3 = mixed_16_8_16 || mixed_8_16_16 || mixed_16_16_8;

    if (
      dur === NoteDuration.Whole || dur === NoteDuration.Half ||
      dur === NoteDuration.DottedHalf || dur === NoteDuration.Quarter ||
      dur === NoteDuration.DottedQuarter ||
      (dur === NoteDuration.DottedEighth && !dotted8_to_16)
    ) return false;

    if (numChords === 6) {
      if (dur !== NoteDuration.Eighth) return false;
      const correctTime =
        (time.getNumerator() === 3 && time.getDenominator() === 4) ||
        (time.getNumerator() === 6 && time.getDenominator() === 8) ||
        (time.getNumerator() === 6 && time.getDenominator() === 4);
      if (!correctTime) return false;
      if (time.getNumerator() === 6 && time.getDenominator() === 4) {
        const beat = time.getQuarter() * 3;
        if ((chords[0].getStartTime() % beat) > Math.floor(time.getQuarter() / 6)) return false;
      }
    } else if (numChords === 4) {
      if (time.getNumerator() === 3 && time.getDenominator() === 8) return false;
      const correctTime = time.getNumerator() === 2 || time.getNumerator() === 4 || time.getNumerator() === 8;
      if (!correctTime && dur !== NoteDuration.Sixteenth) return false;
      let beat = time.getQuarter();
      if (dur === NoteDuration.Eighth) beat = time.getQuarter() * 2;
      else if (dur === NoteDuration.ThirtySecond) beat = Math.floor(time.getQuarter() / 2);
      if ((chords[0].getStartTime() % beat) > Math.floor(time.getQuarter() / 6)) return false;
    } else if (numChords === 3) {
      const valid =
        dur === NoteDuration.Triplet ||
        (dur === NoteDuration.Eighth && time.getNumerator() === 12 && time.getDenominator() === 8) ||
        anyMixed3;
      if (!valid) return false;
      let beat = time.getQuarter();
      if (time.getNumerator() === 12 && time.getDenominator() === 8)
        beat = Math.floor(time.getQuarter() / 2) * 3;
      if ((chords[0].getStartTime() % beat) > Math.floor(time.getQuarter() / 6)) return false;
    } else if (numChords === 2) {
      if (startQuarter) {
        const beat = time.getQuarter();
        if ((chords[0].getStartTime() % beat) > Math.floor(time.getQuarter() / 6)) return false;
      }
    }

    for (const chord of chords) {
      if (Math.floor(chord.getStartTime() / time.getMeasure()) !== measure) return false;
      if (!chord.getStem()) return false;
      if (chord.getStem()!.getDuration() !== dur && !dotted8_to_16 && !anyMixed3) return false;
      if (chord.getStem()!.IsBeam()) return false;
    }

    let hasTwoStems = false;
    let direction   = Stem.Up;
    for (const chord of chords) {
      if (chord.getHasTwoStems()) {
        if (hasTwoStems && chord.getStem()!.getDirection() !== direction) return false;
        hasTwoStems = true;
        direction   = chord.getStem()!.getDirection();
      }
    }

    if (!hasTwoStems) {
      const note1 = firstStem.getDirection() === Stem.Up ? firstStem.getTop() : firstStem.getBottom();
      const note2 = lastStem.getDirection()  === Stem.Up ? lastStem.getTop()  : lastStem.getBottom();
      direction   = ChordSymbol.StemDirection(note1, note2, chords[0].getClef());
    }

    if (direction === Stem.Up)
      return Math.abs(firstStem.getTop().Dist(lastStem.getTop())) < 11;
    else
      return Math.abs(firstStem.getBottom().Dist(lastStem.getBottom())) < 11;
  }

  static CreateBeam(chords: ChordSymbol[], spacing: number): void {
    const firstStem = chords[0].getStem()!;
    const lastStem  = chords[chords.length - 1].getStem()!;

    let newdirection = -1;
    for (const chord of chords) {
      if (chord.getHasTwoStems()) {
        newdirection = chord.getStem()!.getDirection();
        break;
      }
    }
    if (newdirection === -1) {
      const note1 = firstStem.getDirection() === Stem.Up ? firstStem.getTop() : firstStem.getBottom();
      const note2 = lastStem.getDirection()  === Stem.Up ? lastStem.getTop()  : lastStem.getBottom();
      newdirection = ChordSymbol.StemDirection(note1, note2, chords[0].getClef());
    }
    for (const chord of chords) chord.getStem()!.setDirection(newdirection);

    if (chords.length === 2)
      ChordSymbol.BringStemsCloser(chords);
    else
      ChordSymbol.LineUpStemEnds(chords);

    firstStem.SetPair(lastStem, spacing);
    for (let i = 1; i < chords.length; i++) chords[i].getStem()!.setReceiver(true);

    const firstDur = firstStem.getDuration();
    if (chords.length === 3 && firstDur === NoteDuration.Triplet) {
      firstStem.setTriplet(true);
    }

    if (chords.length === 3) {
      const midStem  = chords[1].getStem();
      const lastDur  = lastStem.getDuration();
      if (midStem) {
        if (firstDur === NoteDuration.Sixteenth && midStem.getDuration() === NoteDuration.Eighth && lastDur === NoteDuration.Sixteenth)
          firstStem.setPartialSixteenthBeam(Stem.PARTIAL_BEAM_BOTH_ENDS);
        else if (firstDur === NoteDuration.Eighth && midStem.getDuration() === NoteDuration.Sixteenth && lastDur === NoteDuration.Sixteenth)
          firstStem.setPartialSixteenthBeam(Stem.PARTIAL_BEAM_RIGHT);
        else if (firstDur === NoteDuration.Sixteenth && midStem.getDuration() === NoteDuration.Sixteenth && lastDur === NoteDuration.Eighth)
          firstStem.setPartialSixteenthBeam(Stem.PARTIAL_BEAM_LEFT);
      }
    }
  }

  static BringStemsCloser(chords: ChordSymbol[]): void {
    const firstStem = chords[0].getStem()!;
    const lastStem  = chords[1].getStem()!;
    if (firstStem.getDuration() === NoteDuration.DottedEighth && lastStem.getDuration() === NoteDuration.Sixteenth) {
      if (firstStem.getDirection() === Stem.Up)
        firstStem.setEnd(firstStem.getEnd().Add(2));
      else
        firstStem.setEnd(firstStem.getEnd().Add(-2));
    }
    const distance = Math.abs(firstStem.getEnd().Dist(lastStem.getEnd()));
    if (firstStem.getDirection() === Stem.Up) {
      if (WhiteNote.Max(firstStem.getEnd(), lastStem.getEnd()) === firstStem.getEnd())
        lastStem.setEnd(lastStem.getEnd().Add(Math.floor(distance / 2)));
      else
        firstStem.setEnd(firstStem.getEnd().Add(Math.floor(distance / 2)));
    } else {
      if (WhiteNote.Min(firstStem.getEnd(), lastStem.getEnd()) === firstStem.getEnd())
        lastStem.setEnd(lastStem.getEnd().Add(-Math.floor(distance / 2)));
      else
        firstStem.setEnd(firstStem.getEnd().Add(-Math.floor(distance / 2)));
    }
  }

  static LineUpStemEnds(chords: ChordSymbol[]): void {
    const firstStem  = chords[0].getStem()!;
    const lastStem   = chords[chords.length - 1].getStem()!;
    const middleStem = chords[1].getStem()!;

    if (firstStem.getDirection() === Stem.Up) {
      let top = firstStem.getEnd();
      for (const chord of chords) top = WhiteNote.Max(top, chord.getStem()!.getEnd());
      if (top === firstStem.getEnd() && top.Dist(lastStem.getEnd()) >= 2) {
        firstStem.setEnd(top);
        middleStem.setEnd(top.Add(-1));
        lastStem.setEnd(top.Add(-2));
      } else if (top === lastStem.getEnd() && top.Dist(firstStem.getEnd()) >= 2) {
        firstStem.setEnd(top.Add(-2));
        middleStem.setEnd(top.Add(-1));
        lastStem.setEnd(top);
      } else {
        firstStem.setEnd(top);
        middleStem.setEnd(top);
        lastStem.setEnd(top);
      }
    } else {
      let bottom = firstStem.getEnd();
      for (const chord of chords) bottom = WhiteNote.Min(bottom, chord.getStem()!.getEnd());
      if (bottom === firstStem.getEnd() && lastStem.getEnd().Dist(bottom) >= 2) {
        middleStem.setEnd(bottom.Add(1));
        lastStem.setEnd(bottom.Add(2));
      } else if (bottom === lastStem.getEnd() && firstStem.getEnd().Dist(bottom) >= 2) {
        middleStem.setEnd(bottom.Add(1));
        firstStem.setEnd(bottom.Add(2));
      } else {
        firstStem.setEnd(bottom);
        middleStem.setEnd(bottom);
        lastStem.setEnd(bottom);
      }
    }
    for (let i = 1; i < chords.length - 1; i++) {
      chords[i].getStem()!.setEnd(middleStem.getEnd());
    }
  }

  getNotedata(): NoteData[] { return this.notedata; }

  toString(): string {
    let result = `ChordSymbol clef=${this.clef} start=${this.getStartTime()} end=${this.getEndTime()} width=${this.getWidth()} hastwostems=${this.hastwostems} `;
    for (const symbol of this.accidsymbols) result += symbol.toString() + ' ';
    for (const note of this.notedata) result += `Note whitenote=${note.whitenote} duration=${note.duration} leftside=${note.leftside} `;
    if (this.stem1) result += this.stem1.toString() + ' ';
    if (this.stem2) result += this.stem2.toString() + ' ';
    return result;
  }
}
