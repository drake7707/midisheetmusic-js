/**
 * SheetMusic.ts — TypeScript port of SheetMusic.java
 * Renders MIDI sheet music onto a CanvasRenderingContext2D.
 * All drawing is done at zoom=1; the caller should scale the canvas.
 */

import { MidiFile } from '@/midi/MidiFile';
import type { MidiOptions } from '@/midi/MidiFile';
import { MidiNote } from '@/midi/MidiNote';
import { MidiTrack } from '@/midi/MidiTrack';
import { KeySignature } from '@/midi/KeySignature';
import { TimeSignature } from '@/midi/TimeSignature';
import { NoteScale } from '@/midi/NoteScale';
import { Staff } from '@/sheets/Staff';
import { ChordSymbol } from '@/sheets/ChordSymbol';
import { ClefMeasures } from '@/sheets/ClefMeasures';
import { BarSymbol } from '@/sheets/BarSymbol';
import { BlankSymbol } from '@/sheets/BlankSymbol';
import { RestSymbol } from '@/sheets/RestSymbol';
import { ClefSymbol } from '@/sheets/ClefSymbol';
import { LyricSymbol } from '@/sheets/LyricSymbol';
import { SymbolWidths } from '@/sheets/SymbolWidths';
import type { MusicSymbol } from '@/sheets/MusicSymbol';
import type { ISheetMusic } from '@/sheets/ISheetMusic';
import { NoteDuration } from '@/midi/NoteDuration';
import { colorToCSS, rgb } from '@/sheets/ColorUtil';
import {
  NoteHeight, NoteWidth, LeftMargin, PageWidth, KeySignatureWidth,
} from '@/sheets/SheetMusicConstants';

// Re-export constants for external use
export { NoteHeight, NoteWidth, LeftMargin, PageWidth };
import { LineWidth, LineSpace, StaffHeight } from '@/sheets/SheetMusicConstants';
export { LineWidth, LineSpace, StaffHeight };

export const PageHeight = 1050;
export const TitleHeight = 14;

export const ImmediateScroll = 1;
export const GradualScroll   = 2;
export const DontScroll      = 3;

// ---------------------------------------------------------------------------
// TimeSigSymbol – local helper (not in sheets/ but needed by SheetMusic)
// ---------------------------------------------------------------------------
class TimeSigSymbol implements MusicSymbol {
  private numerator: number;
  private denominator: number;
  private starttime: number = 0;
  private width: number;

  constructor(numerator: number, denominator: number) {
    this.numerator = numerator;
    this.denominator = denominator;
    this.width = NoteWidth * 2;
  }
  getAboveStaff(): number { return 0; }
  getBelowStaff(): number { return 0; }
  getStartTime(): number { return this.starttime; }
  getMinWidth(): number  { return NoteWidth * 2; }
  getWidth(): number     { return this.width; }
  setWidth(w: number)    { this.width = w; }
  Draw(ctx: CanvasRenderingContext2D, ytop: number): void {
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = `bold ${NoteWidth * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('' + this.numerator,   this.width / 2, ytop + NoteHeight);
    ctx.fillText('' + this.denominator, this.width / 2, ytop + NoteHeight * 3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// SheetMusic
// ---------------------------------------------------------------------------
export class SheetMusic implements ISheetMusic {
  private staffs: Staff[];
  private mainkey: KeySignature;
  private filename: string;
  private numtracks: number;
  private scrollVert: boolean;
  private showNoteLetters: number = 0;
  private NoteColors: number[];
  private shade1: number;
  private shade2: number;
  private sheetwidth: number  = 0;
  private sheetheight: number = 0;
  private pageWidth: number = PageWidth;

  constructor(file: MidiFile, options: MidiOptions) {
    this.filename = file.getFileName();
    this.scrollVert = options.scrollVert;
    this.showNoteLetters = options.showNoteLetters;
    this.shade1 = options.shade1Color;
    this.shade2 = options.shade2Color;
    this.pageWidth = options.pageWidth ?? PageWidth;

    // Build NoteColors (12 per chromatic scale)
    this.NoteColors = new Array(12).fill(0);
    if (options.colorAccidentals) {
      for (let i = 0; i < 12; i++) {
        this.NoteColors[i] = NoteScale.IsBlackKey(i) ? rgb(255, 0, 0) : rgb(0, 0, 0);
      }
    } else {
      this.NoteColors.fill(rgb(0, 0, 0));
    }
    if (options.useColors && options.noteColors) {
      for (let i = 0; i < Math.min(12, options.noteColors.length); i++) {
        this.NoteColors[i] = options.noteColors[i];
      }
    }

    const tracks = file.ChangeMidiNotes(options);
    let time = file.getTime();
    if (options.time !== null) time = options.time;

    SheetMusic.SplitCrossMeasureNotes(tracks, time);

    if (options.key === -1) {
      this.mainkey = SheetMusic.GetKeySignature(tracks);
    } else {
      this.mainkey = new KeySignature(options.key);
    }
    this.numtracks = tracks.length;

    const lastStart = file.EndTime() + options.shifttime;
    const allsymbols: MusicSymbol[][] = [];

    for (let t = 0; t < this.numtracks; t++) {
      const track = tracks[t];
      const clefs = new ClefMeasures(track.getNotes(), time.getMeasure());
      const chords = this.createChords(track.getNotes(), this.mainkey, time, clefs);
      allsymbols.push(this.createSymbols(chords, clefs, time, lastStart));
    }

    let lyrics: LyricSymbol[][] | null = null;
    if (options.showLyrics) {
      lyrics = SheetMusic.GetLyrics(tracks);
    }

    const widths = new SymbolWidths(allsymbols, lyrics);
    this.alignSymbols(allsymbols, widths, options);

    this.staffs = this.createStaffs(allsymbols, this.mainkey, options, time.getMeasure());
    this.createAllBeamedChords(allsymbols, time);
    if (lyrics !== null) {
      SheetMusic.AddLyricsToStaffs(this.staffs, lyrics);
    }

    const swingLabel = SheetMusic.DetectSwing(file.getTracks(), time);
    if (swingLabel !== null && this.staffs.length > 0) {
      this.staffs[0].setSwingLabel(swingLabel);
    }

    for (const staff of this.staffs) {
      staff.CalculateHeight();
    }

    this.calculateSize();
  }

  // ---- Public accessors -----------------------------------------------

  getMainKey():       KeySignature { return this.mainkey; }
  getShowNoteLetters(): number      { return this.showNoteLetters; }
  getShade1():        number        { return this.shade1; }
  getShade2():        number        { return this.shade2; }
  getWidth():         number        { return this.sheetwidth; }
  getHeight():        number        { return this.sheetheight; }
  getStaffs():        Staff[]       { return this.staffs; }
  getTextColor():     number        { return rgb(70, 70, 70); }

  static getTextColor(): number { return rgb(70, 70, 70); }

  NoteColor(number: number): number {
    return this.NoteColors[NoteScale.FromNumber(number)];
  }

  // ---- Size / layout -----------------------------------------------

  private calculateSize(): void {
    this.sheetwidth = 0;
    this.sheetheight = 0;
    for (const staff of this.staffs) {
      this.sheetwidth = Math.max(this.sheetwidth, staff.getWidth());
      this.sheetheight += staff.getHeight();
    }
    this.sheetwidth += 2;
    this.sheetheight += LeftMargin;
  }

  // ---- Drawing -----------------------------------------------

  /** Draw the full sheet music onto the canvas at zoom=1. */
  Draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.sheetwidth, this.sheetheight);
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';

    let ypos = 0;
    for (const staff of this.staffs) {
      ctx.save();
      ctx.translate(0, ypos);
      staff.Draw(ctx, { left: 0, top: 0, width: this.sheetwidth, height: this.sheetheight });
      ctx.restore();
      ypos += staff.getHeight();
    }

    // Title
    ctx.font = '14px sans-serif';
    ctx.fillStyle = colorToCSS(rgb(70, 70, 70));
    let title = this.filename.replace('.mid', '').replace('.midi', '').replace(/_/g, ' ');
    ctx.fillText(title, LeftMargin, 14);
    ctx.restore();
  }

  /** Return the pixel position the playback cursor should scroll to for the
   *  given pulse time, without modifying the canvas.  Mirrors the logic in
   *  ShadeNotes so the viewport can scroll BEFORE drawing. */
  getShadePosition(currentPulseTime: number): { xShade: number; yShade: number } {
    let xShade = 0, yShade = 0;
    for (const staff of this.staffs) {
      if (currentPulseTime >= staff.getEndTime()) {
        yShade += staff.getHeight();
      } else {
        if (currentPulseTime >= staff.getStartTime()) {
          xShade = staff.getShadeXPos(currentPulseTime);
        }
        break;
      }
    }
    return { xShade, yShade };
  }

  /** Shade notes at currentPulse, unshade at prevPulse.
   *  Returns {x, y} pixel position of the shaded note (for scrolling).
   */
  ShadeNotes(
    ctx: CanvasRenderingContext2D,
    currentPulseTime: number,
    prevPulseTime: number,
  ): { xShade: number; yShade: number } {
    let xShade = 0;
    let yShade = 0;
    let ypos = 0;

    for (const staff of this.staffs) {
      ctx.save();
      ctx.translate(0, ypos);
      xShade = staff.ShadeNotes(ctx, colorToCSS(this.shade1), currentPulseTime, prevPulseTime, xShade);
      ctx.restore();
      if (currentPulseTime >= staff.getEndTime()) {
        yShade += staff.getHeight();
      }
      ypos += staff.getHeight();
    }
    return { xShade, yShade };
  }

  /** Return the pulse time that corresponds to the pixel point (x, y). */
  PulseTimeForPoint(x: number, y: number): number {
    let ypos = 0;
    for (const staff of this.staffs) {
      if (y >= ypos && y <= ypos + staff.getHeight()) {
        return staff.PulseTimeForPoint({ x, y: y - ypos });
      }
      ypos += staff.getHeight();
    }
    return -1;
  }

  /** Return the MusicSymbol whose startTime >= currentTime (across all staffs). */
  getCurrentNote(currentTime: number, sig: TimeSignature): MusicSymbol | null {
    let firstStartTime = Number.MAX_SAFE_INTEGER;
    let firstNote: MusicSymbol | null = null;
    for (const staff of this.staffs) {
      const note = staff.getCurrentNote(currentTime, sig);
      if (note !== null && note.getStartTime() < firstStartTime) {
        firstStartTime = note.getStartTime();
        firstNote = note;
      }
    }
    return firstNote;
  }

  /** Return the last MusicSymbol whose startTime < currentTime. */
  getPrevNote(currentTime: number): MusicSymbol | null {
    let result: MusicSymbol | null = null;
    for (const staff of this.staffs) {
      const note = staff.getPrevNote(currentTime);
      if (note !== null && (result === null || note.getStartTime() > result.getStartTime())) {
        result = note;
      }
    }
    return result;
  }

  // ---- Key signature -----------------------------------------------

  static GetKeySignature(tracks: MidiTrack[]): KeySignature {
    const notenums: number[] = [];
    for (const track of tracks) {
      for (const note of track.getNotes()) {
        notenums.push(note.getNumber());
      }
    }
    return KeySignature.Guess(notenums);
  }

  // ---- Chord creation -----------------------------------------------

  private createChords(
    midinotes: MidiNote[],
    key: KeySignature,
    time: TimeSignature,
    clefs: ClefMeasures,
  ): ChordSymbol[] {
    let i = 0;
    const chords: ChordSymbol[] = [];
    const len = midinotes.length;

    while (i < len) {
      let starttime = midinotes[i].getStartTime();
      const clef = clefs.GetClef(starttime);
      const notegroup: MidiNote[] = [];
      notegroup.push(midinotes[i]);
      i++;
      while (i < len && midinotes[i].getStartTime() === starttime) {
        notegroup.push(midinotes[i]);
        i++;
      }
      starttime = time.alignNote(starttime);
      const chord = new ChordSymbol(notegroup, key, time, clef, this, starttime);
      chords.push(chord);
    }
    return chords;
  }

  private createSymbols(
    chords: ChordSymbol[],
    clefs: ClefMeasures,
    time: TimeSignature,
    lastStart: number,
  ): MusicSymbol[] {
    let symbols: MusicSymbol[] = this.addBars(chords, time, lastStart);
    symbols = this.addRests(symbols, time);
    symbols = this.addClefChanges(symbols, clefs, time);
    return symbols;
  }

  private addBars(chords: ChordSymbol[], time: TimeSignature, lastStart: number): MusicSymbol[] {
    const symbols: MusicSymbol[] = [];
    const timesig = new TimeSigSymbol(time.getNumerator(), time.getDenominator());
    symbols.push(timesig);

    let measuretime = 0;
    let i = 0;
    while (i < chords.length) {
      if (measuretime <= chords[i].getStartTime()) {
        symbols.push(new BarSymbol(measuretime));
        measuretime += time.getMeasure();
      } else {
        symbols.push(chords[i]);
        i++;
      }
    }
    while (measuretime < lastStart) {
      symbols.push(new BarSymbol(measuretime));
      measuretime += time.getMeasure();
    }
    symbols.push(new BarSymbol(measuretime));
    return symbols;
  }

  private addRests(symbols: MusicSymbol[], time: TimeSignature): MusicSymbol[] {
    let prevtime = 0;
    const result: MusicSymbol[] = [];

    for (const symbol of symbols) {
      const starttime = symbol.getStartTime();
      const rests = this.getRests(time, prevtime, starttime);
      if (rests) result.push(...rests);
      result.push(symbol);
      if (symbol instanceof ChordSymbol) {
        prevtime = Math.max((symbol as ChordSymbol).getEndTime(), prevtime);
      } else {
        prevtime = Math.max(starttime, prevtime);
      }
    }
    return result;
  }

  private getRests(time: TimeSignature, start: number, end: number): RestSymbol[] | null {
    if (end - start < 0) return null;
    const dur = time.GetNoteDuration(end - start);
    const beat = time.getBeatInMeasure(start);

    if (
      dur === NoteDuration.Whole ||
      dur === NoteDuration.Half ||
      dur === NoteDuration.Quarter ||
      dur === NoteDuration.Eighth ||
      dur === NoteDuration.Sixteenth
    ) {
      return [new RestSymbol(start, dur)];
    } else if (dur === NoteDuration.DottedHalf) {
      if (beat !== Math.floor(beat)) {
        return [
          new RestSymbol(start, NoteDuration.Quarter),
          new RestSymbol(start + time.getQuarter(), NoteDuration.Half),
        ];
      } else {
        return [
          new RestSymbol(start, NoteDuration.Half),
          new RestSymbol(start + time.getQuarter() * 2, NoteDuration.Quarter),
        ];
      }
    } else if (dur === NoteDuration.DottedQuarter) {
      if (beat !== Math.floor(beat)) {
        return [
          new RestSymbol(start, NoteDuration.Eighth),
          new RestSymbol(start + time.getQuarter() / 2, NoteDuration.Quarter),
        ];
      } else {
        return [
          new RestSymbol(start, NoteDuration.Quarter),
          new RestSymbol(start + time.getQuarter(), NoteDuration.Eighth),
        ];
      }
    } else if (dur === NoteDuration.DottedEighth) {
      if (beat !== Math.floor(beat)) {
        return [
          new RestSymbol(start, NoteDuration.Sixteenth),
          new RestSymbol(start + time.getQuarter() / 4, NoteDuration.Eighth),
        ];
      } else {
        return [
          new RestSymbol(start, NoteDuration.Eighth),
          new RestSymbol(start + time.getQuarter() / 2, NoteDuration.Sixteenth),
        ];
      }
    }
    return null;
  }

  private addClefChanges(
    symbols: MusicSymbol[],
    clefs: ClefMeasures,
    _time: TimeSignature,
  ): MusicSymbol[] {
    const result: MusicSymbol[] = [];
    let prevclef = clefs.GetClef(0);
    for (const symbol of symbols) {
      if (symbol instanceof BarSymbol) {
        const clef = clefs.GetClef(symbol.getStartTime());
        if (clef !== prevclef) {
          result.push(new ClefSymbol(clef, symbol.getStartTime() - 1, true));
        }
        prevclef = clef;
      }
      result.push(symbol);
    }
    return result;
  }

  // ---- Symbol alignment -----------------------------------------------

  private alignSymbols(
    allsymbols: MusicSymbol[][],
    widths: SymbolWidths,
    options: MidiOptions,
  ): void {
    if (options.showMeasures) {
      for (const symbols of allsymbols) {
        for (const sym of symbols) {
          if (sym instanceof BarSymbol) {
            sym.setWidth(sym.getWidth() + NoteWidth);
          }
        }
      }
    }

    for (let track = 0; track < allsymbols.length; track++) {
      const symbols = allsymbols[track];
      const result: MusicSymbol[] = [];
      let i = 0;

      for (const start of widths.getStartTimes()) {
        while (i < symbols.length && (symbols[i] instanceof BarSymbol) && symbols[i].getStartTime() <= start) {
          result.push(symbols[i]);
          i++;
        }
        if (i < symbols.length && symbols[i].getStartTime() === start) {
          while (i < symbols.length && symbols[i].getStartTime() === start) {
            result.push(symbols[i]);
            i++;
          }
        } else {
          result.push(new BlankSymbol(start, 0));
        }
      }

      // extra width
      let j = 0;
      while (j < result.length) {
        if (result[j] instanceof BarSymbol) { j++; continue; }
        const start = result[j].getStartTime();
        const extra = widths.GetExtraWidth(track, start);
        result[j].setWidth(result[j].getWidth() + extra);
        while (j < result.length && result[j].getStartTime() === start) j++;
      }
      allsymbols[track] = result;
    }
  }

  // ---- Beam detection -----------------------------------------------

  private static FindConsecutiveChords(
    symbols: MusicSymbol[],
    _time: TimeSignature,
    startIndex: number,
    chordIndexes: number[],
  ): { found: boolean; horizDistance: number } {
    let i = startIndex;
    const numChords = chordIndexes.length;
    let horizDistance = 0;

    while (true) {
      horizDistance = 0;
      while (i < symbols.length - numChords) {
        if (symbols[i] instanceof ChordSymbol && (symbols[i] as ChordSymbol).getStem() !== null) break;
        i++;
      }
      if (i >= symbols.length - numChords) {
        chordIndexes[0] = -1;
        return { found: false, horizDistance };
      }
      chordIndexes[0] = i;
      let foundChords = true;
      for (let chordIndex = 1; chordIndex < numChords; chordIndex++) {
        i++;
        const remaining = numChords - 1 - chordIndex;
        while (i < symbols.length - remaining && symbols[i] instanceof BlankSymbol) {
          horizDistance += symbols[i].getWidth();
          i++;
        }
        if (i >= symbols.length - remaining) return { found: false, horizDistance };
        if (!(symbols[i] instanceof ChordSymbol)) { foundChords = false; break; }
        chordIndexes[chordIndex] = i;
        horizDistance += symbols[i].getWidth();
      }
      if (foundChords) return { found: true, horizDistance };
    }
  }

  private createBeamedChords(
    allsymbols: MusicSymbol[][],
    time: TimeSignature,
    numChords: number,
    startBeat: boolean,
  ): void {
    const chordIndexes: number[] = new Array(numChords).fill(0);
    const chords: ChordSymbol[] = new Array(numChords);

    for (const symbols of allsymbols) {
      let startIndex = 0;
      while (true) {
        const { found, horizDistance } = SheetMusic.FindConsecutiveChords(symbols, time, startIndex, chordIndexes);
        if (!found) break;
        for (let i = 0; i < numChords; i++) {
          chords[i] = symbols[chordIndexes[i]] as ChordSymbol;
        }
        if (ChordSymbol.CanCreateBeam(chords, time, startBeat)) {
          ChordSymbol.CreateBeam(chords, horizDistance);
          startIndex = chordIndexes[numChords - 1] + 1;
        } else {
          startIndex = chordIndexes[0] + 1;
        }
      }
    }
  }

  private createAllBeamedChords(allsymbols: MusicSymbol[][], time: TimeSignature): void {
    if (
      (time.getNumerator() === 3 && time.getDenominator() === 4) ||
      (time.getNumerator() === 6 && time.getDenominator() === 8) ||
      (time.getNumerator() === 6 && time.getDenominator() === 4)
    ) {
      this.createBeamedChords(allsymbols, time, 6, true);
    }
    this.createBeamedChords(allsymbols, time, 3, true);
    this.createBeamedChords(allsymbols, time, 4, true);
    this.createBeamedChords(allsymbols, time, 2, true);
    this.createBeamedChords(allsymbols, time, 2, false);
  }

  // ---- Staff creation -----------------------------------------------

  private createStaffsForTrack(
    symbols: MusicSymbol[],
    measurelen: number,
    key: KeySignature,
    options: MidiOptions,
    track: number,
    totaltracks: number,
    originalTrackNum: number,
  ): Staff[] {
    const keysigWidth = KeySignatureWidth(key);
    let startindex = 0;
    const thestaffs: Staff[] = [];

    while (startindex < symbols.length) {
      let endindex = startindex;
      let width = keysigWidth;
      const maxwidth = this.scrollVert ? this.pageWidth : 2_000_000;

      while (endindex < symbols.length && width + symbols[endindex].getWidth() < maxwidth) {
        width += symbols[endindex].getWidth();
        endindex++;
      }
      endindex--;

      if (endindex === symbols.length - 1) {
        // keep
      } else if (
        Math.floor(symbols[startindex].getStartTime() / measurelen) ===
        Math.floor(symbols[endindex].getStartTime() / measurelen)
      ) {
        // keep
      } else {
        const endmeasure = Math.floor(symbols[endindex + 1].getStartTime() / measurelen);
        while (Math.floor(symbols[endindex].getStartTime() / measurelen) === endmeasure) {
          endindex--;
        }
      }

      if (this.scrollVert) width = this.pageWidth;
      const staffSymbols: MusicSymbol[] = symbols.slice(startindex, endindex + 1);
      thestaffs.push(new Staff(staffSymbols, key, options, track, totaltracks, originalTrackNum, this.pageWidth));
      startindex = endindex + 1;
    }
    return thestaffs;
  }

  private createStaffs(
    allsymbols: MusicSymbol[][],
    key: KeySignature,
    options: MidiOptions,
    measurelen: number,
  ): Staff[] {
    const totaltracks = allsymbols.length;
    const originalTrackNums: number[] = new Array(totaltracks).fill(-1);

    if (!options.twoStaffs && options.tracks) {
      let filteredIdx = 0;
      for (let origIdx = 0; origIdx < options.tracks.length && filteredIdx < totaltracks; origIdx++) {
        if (options.tracks[origIdx]) originalTrackNums[filteredIdx++] = origIdx;
      }
    }

    const trackstaffs: Staff[][] = [];
    for (let t = 0; t < totaltracks; t++) {
      trackstaffs.push(
        this.createStaffsForTrack(allsymbols[t], measurelen, key, options, t, totaltracks, originalTrackNums[t]),
      );
    }

    // Update EndTime for each staff
    for (const list of trackstaffs) {
      for (let i = 0; i < list.length - 1; i++) {
        list[i].setEndTime(list[i + 1].getStartTime());
      }
    }

    // Interleave
    let maxstaffs = 0;
    for (const list of trackstaffs) maxstaffs = Math.max(maxstaffs, list.length);
    const result: Staff[] = [];
    for (let i = 0; i < maxstaffs; i++) {
      for (const list of trackstaffs) {
        if (i < list.length) result.push(list[i]);
      }
    }
    return result;
  }

  // ---- Lyrics -----------------------------------------------

  static GetLyrics(tracks: MidiTrack[]): LyricSymbol[][] | null {
    let hasLyrics = false;
    const result: LyricSymbol[][] = [];
    for (const track of tracks) {
      const lyrics: LyricSymbol[] = [];
      result.push(lyrics);
      const lyricsEvents = track.getLyrics();
      if (lyricsEvents === null) continue;
      hasLyrics = true;
      for (const ev of lyricsEvents) {
        const text = new TextDecoder('utf-8').decode(ev.Value);
        lyrics.push(new LyricSymbol(ev.StartTime, text));
      }
    }
    return hasLyrics ? result : null;
  }

  static AddLyricsToStaffs(staffs: Staff[], tracklyrics: LyricSymbol[][]): void {
    for (const staff of staffs) {
      const lyrics = tracklyrics[staff.getTrack()];
      staff.AddLyrics(lyrics);
    }
  }

  // ---- Cross-measure note splitting -----------------------------------------------

  static SplitCrossMeasureNotes(tracks: MidiTrack[], time: TimeSignature): void {
    const measureLen = time.getMeasure();
    const quarter    = time.getQuarter();
    if (measureLen <= 0 || quarter <= 0) return;
    const END_TOLERANCE = 2;
    const MIN_FRAGMENT  = Math.floor(quarter / 8);

    for (const track of tracks) {
      const notes = track.getNotes();
      let i = 0;
      while (i < notes.length) {
        const note     = notes[i];
        const noteStart = note.getStartTime();
        const measureEnd = (Math.floor(noteStart / measureLen) + 1) * measureLen;

        let noteEnd = note.getEndTime();
        if (noteEnd < measureEnd && (measureEnd - noteEnd) <= END_TOLERANCE) {
          note.setDuration(measureEnd - noteStart);
          noteEnd = note.getEndTime();
        }

        let splitPoint = -1;
        if (noteEnd > measureEnd) {
          if (noteStart % quarter !== 0) {
            const nextBeat = (Math.floor(noteStart / quarter) + 1) * quarter;
            splitPoint = (nextBeat - noteStart >= MIN_FRAGMENT) ? nextBeat : measureEnd;
          } else {
            splitPoint = measureEnd;
          }
        }

        if (splitPoint > noteStart && splitPoint < noteEnd) {
          const firstDur = splitPoint - noteStart;
          const contDur  = noteEnd - splitPoint;
          note.setDuration(firstDur);
          note.setTiedToNext(true);

          const cont = new MidiNote(splitPoint, note.getChannel(), note.getNumber(), contDur);
          cont.setTiedToPrev(true);

          let insertIdx = i + 1;
          while (insertIdx < notes.length && notes[insertIdx].getStartTime() < splitPoint) insertIdx++;
          while (
            insertIdx < notes.length &&
            notes[insertIdx].getStartTime() === splitPoint &&
            notes[insertIdx].getNumber() < cont.getNumber()
          ) insertIdx++;
          notes.splice(insertIdx, 0, cont);
        }
        i++;
      }
    }
  }

  // ---- Swing detection -----------------------------------------------

  static DetectSwing(tracks: MidiTrack[], time: TimeSignature): string | null {
    const quarter   = time.getQuarter();
    const eighth    = Math.floor(quarter / 2);
    const tolerance = Math.floor(quarter / 8);
    if (eighth <= 0) return null;

    const timeSet = new Set<number>();
    for (const track of tracks) {
      for (const note of track.getNotes()) {
        timeSet.add(note.getStartTime());
      }
    }
    const times = Array.from(timeSet).sort((a, b) => a - b);

    let swingEighths = 0, straightEighths = 0;
    let swingSixteenths = 0, straightSixteenths = 0;

    for (let i = 0; i < times.length - 1; i++) {
      const t   = times[i];
      const gap = times[i + 1] - t;
      const beatMod = t % quarter;

      if (beatMod <= tolerance) {
        if (Math.abs(gap - Math.floor(quarter * 2 / 3)) <= tolerance) swingEighths++;
        else if (Math.abs(gap - eighth) <= tolerance) straightEighths++;
      } else if ((t % eighth) <= tolerance) {
        const straight = Math.abs(gap - Math.floor(eighth / 2));
        const swing    = Math.abs(gap - Math.floor(eighth * 2 / 3));
        if (straight < swing) straightSixteenths++;
        else swingSixteenths++;
      }
    }

    if (swingEighths >= 4 && swingEighths > straightEighths) return 'Swing';
    if (swingSixteenths >= 4 && swingSixteenths > straightSixteenths) return 'Swing (16ths)';
    return null;
  }
}

// Export createDefaultOptions helper
export function createDefaultOptions(file: MidiFile, InstrumentAbbreviations: string[]): MidiOptions {
  const numTracks = file.getTracks().length;
  const tracks = new Array<boolean>(numTracks).fill(true);
  const mute   = new Array<boolean>(numTracks).fill(false);
  const volume  = new Array<number>(numTracks).fill(100);
  const instruments = file.getTracks().map(t => t.getInstrument());
  const trackOctaveShift = new Array<number>(numTracks).fill(0);
  const trackInstrumentNames = file.getTracks().map(t => {
    const instr = t.getInstrument();
    return instr < InstrumentAbbreviations.length ? InstrumentAbbreviations[instr] : '';
  });

  const noteColors: number[] = [
    rgb(180, 0, 0), rgb(230, 0, 0), rgb(220, 128, 0), rgb(130, 130, 0),
    rgb(187, 187, 0), rgb(0, 100, 0), rgb(0, 140, 0), rgb(0, 180, 180),
    rgb(0, 0, 120), rgb(0, 0, 180), rgb(88, 0, 147), rgb(129, 0, 215),
  ];

  return {
    tempo: file.getTime().getTempo(),
    instruments,
    mute,
    tracks,
    transpose: 0,
    combineInterval: 40,
    time: null,
    twoStaffs: numTracks === 1,
    shifttime: 0,
    pauseTime: 0,
    useDefaultInstruments: true,
    volume,
    trackOctaveShift,
    showMeasures: false,
    showBeatMarkers: false,
    showTrackLabels: true,
    trackInstrumentNames,
    defaultTime: file.getTime(),
    scrollVert: true,
    playMeasuresInLoop: false,
    playMeasuresInLoopStart: 0,
    playMeasuresInLoopEnd: 0,
    showNoteLetters: 0,
    key: -1,
    showPiano: true,
    largeNoteSize: false,
    showLyrics: true,
    shade1Color: rgb(210, 205, 220),
    shade2Color: rgb(150, 200, 220),
    useColors: false,
    colorAccidentals: false,
    useFullHeight: false,
    countInMeasures: 0,
    noteColors,
    midiShift: 0,
    lastMeasure: 0,
  };
}
