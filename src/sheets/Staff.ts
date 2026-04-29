import type { MusicSymbol } from './MusicSymbol';
import type { MidiOptions } from '@/midi/MidiFile';
import { KeySignature } from '@/midi/KeySignature';
import { TimeSignature } from '@/midi/TimeSignature';
import { AccidSymbol } from './AccidSymbol';
import { BarSymbol } from './BarSymbol';
import { BlankSymbol } from './BlankSymbol';
import { ChordSymbol } from './ChordSymbol';
import { ClefSymbol } from './ClefSymbol';
import { Clef } from './Clef';
import { LyricSymbol } from './LyricSymbol';
import { RestSymbol } from './RestSymbol';
import { Stem } from './Stem';
import { WhiteNote } from './WhiteNote';
import {
  LineWidth, LineSpace, NoteHeight, NoteWidth,
  LeftMargin, StaffHeight, PageWidth, KeySignatureWidth,
} from './SheetMusicConstants';

const LOOP_TINT_COLOR = 'rgba(255,0,0,0.2)';

export class Staff {
  private symbols: MusicSymbol[];
  private lyrics: LyricSymbol[] | null = null;
  private ytop: number = 0;
  private clefsym: ClefSymbol;
  private keys: AccidSymbol[];
  private showMeasures: boolean;
  private showBeatMarkers: boolean;
  private showTrackLabels: boolean;
  private trackLabel: string | null = null;
  private keysigWidth: number;
  private width: number = 0;
  private height: number = 0;
  private tracknum: number;
  private totaltracks: number;
  private starttime: number = 0;
  private endtime: number = 0;
  private measureLength: number;
  private beatInterval: number;
  private options: MidiOptions;
  private swingLabel: string | null = null;

  constructor(
    symbols: MusicSymbol[],
    key: KeySignature,
    options: MidiOptions,
    tracknum: number,
    totaltracks: number,
    originalTrackNum: number
  ) {
    this.keysigWidth   = KeySignatureWidth(key);
    this.tracknum      = tracknum;
    this.totaltracks   = totaltracks;
    this.showMeasures  = options.showMeasures && tracknum === 0;
    this.showBeatMarkers = options.showBeatMarkers && tracknum === 0;
    this.showTrackLabels = options.showTrackLabels;
    if (
      this.showTrackLabels && options.trackInstrumentNames != null &&
      originalTrackNum >= 0 && originalTrackNum < options.trackInstrumentNames.length
    ) {
      const name = options.trackInstrumentNames[originalTrackNum];
      this.trackLabel = `${originalTrackNum}: ${name ?? ''}`;
    }

    const tsig = options.time ?? options.defaultTime;
    this.measureLength = tsig.getMeasure();
    this.beatInterval  = tsig.getNumerator() > 0
      ? Math.floor(this.measureLength / tsig.getNumerator())
      : this.measureLength;

    const clef  = Staff.FindClef(symbols);
    this.clefsym = new ClefSymbol(clef, 0, false);
    this.keys    = key.GetSymbols(clef);
    this.symbols = symbols;
    this.options = options;
    this.CalculateWidth(options.scrollVert);
    this.CalculateHeight();
    this.CalculateStartEndTime();
    this.FullJustify();
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
  getTrack(): number { return this.tracknum; }
  getStartTime(): number { return this.starttime; }
  getEndTime(): number { return this.endtime; }
  setEndTime(value: number): void { this.endtime = value; }
  setSwingLabel(label: string | null): void { this.swingLabel = label; }

  /** Return the canvas X position of the symbol at or just after `pulseTime`,
   *  matching the same logic used by ShadeNotes to place the shade highlight. */
  getShadeXPos(pulseTime: number): number {
    let xpos = this.keysigWidth;
    let x_shade = 0;
    for (let i = 0; i < this.symbols.length; i++) {
      const sym = this.symbols[i];
      if (sym instanceof BarSymbol) { xpos += sym.getWidth(); continue; }
      const start = sym.getStartTime();
      let end = 0;
      if (i + 2 < this.symbols.length && this.symbols[i + 1] instanceof BarSymbol) {
        end = this.symbols[i + 2].getStartTime();
      } else if (i + 1 < this.symbols.length) {
        end = this.symbols[i + 1].getStartTime();
      } else {
        end = this.endtime;
      }
      if (start > pulseTime) { if (x_shade === 0) x_shade = xpos; return x_shade; }
      if (start <= pulseTime && pulseTime < end) { return xpos; }
      xpos += sym.getWidth();
    }
    return x_shade;
  }

  private static FindClef(list: MusicSymbol[]): Clef {
    for (const m of list) {
      if (m instanceof ChordSymbol) return (m as ChordSymbol).getClef();
    }
    return Clef.Treble;
  }

  CalculateHeight(): void {
    let above = 0, below = 0;
    for (const s of this.symbols) {
      above = Math.max(above, s.getAboveStaff());
      below = Math.max(below, s.getBelowStaff());
    }
    above = Math.max(above, this.clefsym.getAboveStaff());
    below = Math.max(below, this.clefsym.getBelowStaff());
    if (this.showMeasures || this.swingLabel != null) above = Math.max(above, NoteHeight * 3);
    if (this.showBeatMarkers && !this.showMeasures) above = Math.max(above, NoteHeight * 2);
    if (this.showTrackLabels) above = Math.max(above, NoteHeight * 2);
    if (this.swingLabel != null && this.showTrackLabels) above = Math.max(above, NoteHeight * 4);
    this.ytop = above + NoteHeight;
    this.height = NoteHeight * 5 + this.ytop + below;
    if (this.lyrics != null) this.height += Math.floor(NoteHeight * 3 / 2);
    if (this.tracknum === this.totaltracks - 1) this.height += NoteHeight * 3;
  }

  private CalculateWidth(scrollVert: boolean): void {
    if (scrollVert) { this.width = PageWidth; return; }
    this.width = this.keysigWidth;
    for (const s of this.symbols) this.width += s.getWidth();
  }

  private CalculateStartEndTime(): void {
    this.starttime = this.endtime = 0;
    if (this.symbols.length === 0) return;
    this.starttime = this.symbols[0].getStartTime();
    for (const m of this.symbols) {
      if (this.endtime < m.getStartTime()) this.endtime = m.getStartTime();
      if (m instanceof ChordSymbol) {
        if (this.endtime < (m as ChordSymbol).getEndTime())
          this.endtime = (m as ChordSymbol).getEndTime();
      }
    }
  }

  private FullJustify(): void {
    if (this.width !== PageWidth) return;
    let totalwidth = this.keysigWidth, totalsymbols = 0, i = 0;
    while (i < this.symbols.length) {
      const start = this.symbols[i].getStartTime();
      totalsymbols++;
      totalwidth += this.symbols[i].getWidth();
      i++;
      while (i < this.symbols.length && this.symbols[i].getStartTime() === start) {
        totalwidth += this.symbols[i].getWidth();
        i++;
      }
    }
    let extrawidth = Math.floor((PageWidth - totalwidth - 1) / totalsymbols);
    if (extrawidth > NoteHeight * 2) extrawidth = NoteHeight * 2;
    i = 0;
    while (i < this.symbols.length) {
      const start = this.symbols[i].getStartTime();
      this.symbols[i].setWidth(this.symbols[i].getWidth() + extrawidth);
      i++;
      while (i < this.symbols.length && this.symbols[i].getStartTime() === start) i++;
    }
  }

  AddLyrics(tracklyrics: LyricSymbol[] | null): void {
    if (!tracklyrics || tracklyrics.length === 0) return;
    this.lyrics = [];
    let xpos = 0, symbolindex = 0;
    for (const lyric of tracklyrics) {
      if (lyric.getStartTime() < this.starttime) continue;
      if (lyric.getStartTime() > this.endtime) break;
      while (symbolindex < this.symbols.length && this.symbols[symbolindex].getStartTime() < lyric.getStartTime()) {
        xpos += this.symbols[symbolindex].getWidth();
        symbolindex++;
      }
      lyric.setX(xpos);
      if (symbolindex < this.symbols.length && this.symbols[symbolindex] instanceof BarSymbol)
        lyric.setX(lyric.getX() + NoteWidth);
      this.lyrics.push(lyric);
    }
    if (this.lyrics.length === 0) this.lyrics = null;
  }

  private DrawLyrics(ctx: CanvasRenderingContext2D): void {
    const xpos = this.keysigWidth;
    const ypos = this.height - Math.floor(NoteHeight * 3 / 2);
    for (const lyric of this.lyrics!) {
      ctx.fillText(lyric.getText(), xpos + lyric.getX(), ypos);
    }
  }

  private DrawTrackLabel(ctx: CanvasRenderingContext2D): void {
    if (!this.trackLabel) return;
    ctx.save();
    ctx.font = ctx.font.replace(/\d+px/, s => `${Math.round(parseInt(s) * 0.75)}px`);
    ctx.fillText(this.trackLabel, LeftMargin + 2, this.ytop - NoteHeight);
    ctx.restore();
  }

  private DrawMeasureNumbers(ctx: CanvasRenderingContext2D): void {
    let xpos = this.keysigWidth;
    const ypos = this.ytop - NoteHeight * 3;
    for (const s of this.symbols) {
      if (s instanceof BarSymbol) {
        const measure = 1 + Math.floor(s.getStartTime() / this.measureLength);
        ctx.fillText(String(measure), xpos + Math.floor(NoteWidth / 2), ypos);
      }
      xpos += s.getWidth();
    }
  }

  private DrawBeatMarkers(ctx: CanvasRenderingContext2D): void {
    if (this.beatInterval <= 0 || this.measureLength <= 0) return;
    const chordMinWidth = 2 * NoteHeight + Math.floor(NoteHeight * 3 / 4);
    const entries: { time: number; x: number }[] = [];
    let xpos = this.keysigWidth;
    for (const s of this.symbols) {
      if (s instanceof ChordSymbol) {
        entries.push({ time: s.getStartTime(), x: xpos + (s as ChordSymbol).getNoteXLeft() + Math.floor(NoteWidth / 2) });
      } else if (s instanceof BlankSymbol || s instanceof RestSymbol) {
        const w = s.getWidth();
        const cx = w >= chordMinWidth
          ? xpos + w - chordMinWidth + Math.floor(LineSpace / 4) + Math.floor(NoteWidth / 2)
          : xpos + Math.floor(w / 2);
        entries.push({ time: s.getStartTime(), x: cx });
      }
      xpos += s.getWidth();
    }
    if (entries.length === 0) return;

    const savedStroke = ctx.strokeStyle;
    const savedWidth  = ctx.lineWidth;
    ctx.strokeStyle = '#888888';
    ctx.lineWidth   = 1;
    const tickTop    = this.ytop - NoteHeight * 2;
    const tickBottom = tickTop + Math.floor(NoteHeight * 3 / 4);
    let firstBeat = Math.floor(this.starttime / this.beatInterval) * this.beatInterval;
    if (firstBeat < this.starttime) firstBeat += this.beatInterval;
    const lastSymTime = entries[entries.length - 1].time;
    for (let t = firstBeat; t <= lastSymTime; t += this.beatInterval) {
      const bx = this.xposForTime(entries, xpos, t);
      ctx.beginPath(); ctx.moveTo(bx, tickTop); ctx.lineTo(bx, tickBottom); ctx.stroke();
    }
    ctx.strokeStyle = savedStroke;
    ctx.lineWidth   = savedWidth;
  }

  private xposForTime(entries: { time: number; x: number }[], endX: number, time: number): number {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].time === time) return entries[i].x;
      if (entries[i].time > time) {
        if (i === 0) return entries[0].x;
        const t0 = entries[i - 1].time, x0 = entries[i - 1].x;
        const t1 = entries[i].time,     x1 = entries[i].x;
        if (t1 === t0) return x0;
        return Math.round(x0 + (time - t0) / (t1 - t0) * (x1 - x0));
      }
    }
    return endX;
  }

  private DrawLoopHighlight(ctx: CanvasRenderingContext2D): void {
    if (!this.options.playMeasuresInLoop) return;
    const loopStartTime = this.options.playMeasuresInLoopStart * this.measureLength;
    const loopEndTime   = (this.options.playMeasuresInLoopEnd + 1) * this.measureLength;
    if (loopEndTime <= this.starttime || loopStartTime > this.endtime) return;

    let xpos = this.keysigWidth, loopStartX = -1, loopEndX = -1;
    for (const s of this.symbols) {
      if (s instanceof BarSymbol) {
        const t = s.getStartTime();
        if (t === loopStartTime) loopStartX = xpos + Math.floor(NoteWidth / 2);
        if (t === loopEndTime)   loopEndX   = xpos + Math.floor(NoteWidth / 2);
      }
      xpos += s.getWidth();
    }
    if (loopStartX < 0 && loopStartTime <= this.starttime) loopStartX = LeftMargin;
    if (loopEndX   < 0 && loopEndTime   >= this.endtime)   loopEndX   = this.width - 1;
    if (loopStartX < 0 || loopEndX < 0) return;

    const ystart = this.ytop - LineWidth;
    const yend   = ystart + StaffHeight;
    const saved  = ctx.fillStyle;
    ctx.fillStyle = LOOP_TINT_COLOR;
    ctx.fillRect(loopStartX, ystart, loopEndX - loopStartX, yend - ystart);
    ctx.fillStyle = saved;
  }

  private isWithinLoopRegion(pulseTime: number): boolean {
    if (!this.options.playMeasuresInLoop) return false;
    const s = this.options.playMeasuresInLoopStart * this.measureLength;
    const e = (this.options.playMeasuresInLoopEnd + 1) * this.measureLength;
    return pulseTime >= s && pulseTime < e;
  }

  private DrawHorizLines(ctx: CanvasRenderingContext2D): void {
    let y = this.ytop - LineWidth;
    ctx.lineWidth = 1;
    for (let line = 1; line <= 5; line++) {
      ctx.beginPath(); ctx.moveTo(LeftMargin, y); ctx.lineTo(this.width - 1, y); ctx.stroke();
      y += LineWidth + LineSpace;
    }
  }

  private DrawEndLines(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 1;
    const ystart = this.tracknum === 0 ? this.ytop - LineWidth : 0;
    const yend   = this.tracknum === this.totaltracks - 1 ? this.ytop + 4 * NoteHeight : this.height;
    ctx.beginPath(); ctx.moveTo(LeftMargin, ystart); ctx.lineTo(LeftMargin, yend); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.width - 1, ystart); ctx.lineTo(this.width - 1, yend); ctx.stroke();
  }

  Draw(ctx: CanvasRenderingContext2D, clip: { left: number; top: number; width: number; height: number }): void {
    ctx.strokeStyle = 'black';
    ctx.fillStyle   = 'black';

    this.DrawLoopHighlight(ctx);
    if (this.showBeatMarkers) this.DrawBeatMarkers(ctx);

    let xpos = LeftMargin + 5;
    ctx.save(); ctx.translate(xpos, 0);
    this.clefsym.Draw(ctx, this.ytop);
    ctx.restore();
    xpos += this.clefsym.getWidth();

    for (const a of this.keys) {
      ctx.save(); ctx.translate(xpos, 0);
      a.Draw(ctx, this.ytop);
      ctx.restore();
      xpos += a.getWidth();
    }

    for (const s of this.symbols) {
      if ((xpos <= clip.left + clip.width + 50) && (xpos + s.getWidth() + 50 >= clip.left)) {
        ctx.save(); ctx.translate(xpos, 0);
        s.Draw(ctx, this.ytop);
        ctx.restore();
      }
      xpos += s.getWidth();
    }

    ctx.strokeStyle = 'black';
    ctx.fillStyle   = 'black';
    this.DrawHorizLines(ctx);
    this.DrawEndLines(ctx);
    if (this.showMeasures) this.DrawMeasureNumbers(ctx);
    if (this.showTrackLabels) this.DrawTrackLabel(ctx);
    if (this.swingLabel) this.DrawSwingMarker(ctx);
    if (this.lyrics) this.DrawLyrics(ctx);
    this.DrawTieArcs(ctx);
  }

  private DrawSwingMarker(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const ySwing = this.showTrackLabels ? this.ytop - NoteHeight * 3 : this.ytop - NoteHeight * 2;
    ctx.fillText(this.swingLabel!, LeftMargin, ySwing);
    ctx.restore();
  }

  private DrawTieArcs(ctx: CanvasRenderingContext2D): void {
    const xpos: number[] = [];
    let x = this.keysigWidth;
    for (let i = 0; i < this.symbols.length; i++) { xpos[i] = x; x += this.symbols[i].getWidth(); }

    const savedStroke = ctx.strokeStyle;
    const savedWidth  = ctx.lineWidth;
    ctx.strokeStyle = 'black';
    ctx.lineWidth   = 1.5;

    for (let i = 0; i < this.symbols.length; i++) {
      if (!(this.symbols[i] instanceof ChordSymbol)) continue;
      const chord = this.symbols[i] as ChordSymbol;

      if (chord.hasTie()) {
        let partnerIdx = -1;
        for (let j = i + 1; j < this.symbols.length; j++) {
          if (this.symbols[j] instanceof ChordSymbol) {
            if ((this.symbols[j] as ChordSymbol).isTiedToPrev()) partnerIdx = j;
            break;
          }
        }
        const topstaff  = WhiteNote.Top(chord.getClef());
        const tieBelow  = !chord.getStem() || chord.getStem()!.getDirection() === Stem.Up;
        const x1        = xpos[i] + chord.getNoteXRight();

        for (const wn of (chord.getTiedNotes() ?? [])) {
          const ynote = this.ytop + topstaff.Dist(wn) * Math.floor(NoteHeight / 2) - LineWidth + Math.floor(NoteHeight / 2);
          if (partnerIdx >= 0) {
            const partner = this.symbols[partnerIdx] as ChordSymbol;
            Staff.drawTieArc(ctx, x1, xpos[partnerIdx] + partner.getNoteXLeft(), ynote, tieBelow, false);
          } else {
            Staff.drawTieArc(ctx, x1, this.width - NoteWidth, ynote, tieBelow, true);
          }
        }
      }

      if (chord.isTiedToPrev() && chord.getTiedFromPrevNotes()) {
        const unresolved = [...(chord.getTiedFromPrevNotes()!)];
        for (let j = 0; j < i && unresolved.length > 0; j++) {
          if (this.symbols[j] instanceof ChordSymbol) {
            const prev = this.symbols[j] as ChordSymbol;
            if (prev.hasTie()) {
              for (const pwn of (prev.getTiedNotes() ?? [])) {
                const idx = unresolved.findIndex(wn => wn.Dist(pwn) === 0);
                if (idx >= 0) unresolved.splice(idx, 1);
              }
            }
          }
        }
        if (unresolved.length > 0) {
          const topstaff = WhiteNote.Top(chord.getClef());
          const tieBelow = !chord.getStem() || chord.getStem()!.getDirection() === Stem.Up;
          const x2 = xpos[i] + chord.getNoteXLeft();
          for (const wn of unresolved) {
            const ynote = this.ytop + topstaff.Dist(wn) * Math.floor(NoteHeight / 2) - LineWidth + Math.floor(NoteHeight / 2);
            Staff.drawIncomingHalfArc(ctx, this.keysigWidth, x2, ynote, tieBelow);
          }
        }
      }
    }
    ctx.strokeStyle = savedStroke;
    ctx.lineWidth   = savedWidth;
  }

  private static drawTieArc(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, tieBelow: boolean, halfArc: boolean): void {
    const span = x2 - x1;
    if (span <= 0) return;
    let bow = Math.max(4, Math.min(14, Math.floor(span / 5)));
    if (!tieBelow) bow = -bow;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    if (halfArc) ctx.quadraticCurveTo(x1 + span * 0.6, y + bow, x2, y + bow / 2);
    else ctx.bezierCurveTo(x1 + span / 3, y + bow, x2 - span / 3, y + bow, x2, y);
    ctx.stroke();
  }

  private static drawIncomingHalfArc(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, tieBelow: boolean): void {
    const span = x2 - x1;
    if (span <= 0) return;
    let bow = Math.max(4, Math.min(14, Math.floor(span / 5)));
    if (!tieBelow) bow = -bow;
    ctx.beginPath();
    ctx.moveTo(x1, y + bow / 2);
    ctx.quadraticCurveTo(x1 + span * 0.4, y + bow, x2, y);
    ctx.stroke();
  }

  getCurrentNote(currentPulseTime: number, sig: TimeSignature): MusicSymbol | null {
    for (let i = 0; i < this.symbols.length; i++) {
      const cur = this.symbols[i];
      if (cur instanceof ChordSymbol || cur instanceof RestSymbol) {
        if (cur.getStartTime() >= currentPulseTime) {
          const endTime = cur instanceof ChordSymbol
            ? (cur as ChordSymbol).getEndTime()
            : (cur as RestSymbol).getEndTime(sig);
          if (currentPulseTime > endTime) {
            for (let j = i; j < this.symbols.length; j++) {
              if (this.symbols[j] instanceof ChordSymbol || this.symbols[j] instanceof RestSymbol)
                return this.symbols[j];
            }
          } else return cur;
        }
      }
    }
    return null;
  }

  getPrevNote(currentPulseTime: number): MusicSymbol | null {
    let result: MusicSymbol | null = null;
    for (const cur of this.symbols) {
      if (cur instanceof ChordSymbol || cur instanceof RestSymbol) {
        if (cur.getStartTime() < currentPulseTime) result = cur;
        else break;
      }
    }
    return result;
  }

  ShadeNotes(ctx: CanvasRenderingContext2D, shade: string, currentPulseTime: number, prevPulseTime: number, x_shade: number): number {
    if ((this.starttime > prevPulseTime || this.endtime < prevPulseTime) &&
        (this.starttime > currentPulseTime || this.endtime < currentPulseTime)) return x_shade;

    let xpos = this.keysigWidth;
    let prevChord: ChordSymbol | null = null;
    let prev_xpos = 0;

    for (let i = 0; i < this.symbols.length; i++) {
      const curr = this.symbols[i];
      if (curr instanceof BarSymbol) { xpos += curr.getWidth(); continue; }

      const start = curr.getStartTime();
      let end = 0;
      if (i + 2 < this.symbols.length && this.symbols[i + 1] instanceof BarSymbol) end = this.symbols[i + 2].getStartTime();
      else if (i + 1 < this.symbols.length) end = this.symbols[i + 1].getStartTime();
      else end = this.endtime;

      if (start > prevPulseTime && start > currentPulseTime) { if (x_shade === 0) x_shade = xpos; return x_shade; }
      if (start <= currentPulseTime && currentPulseTime < end && start <= prevPulseTime && prevPulseTime < end) { x_shade = xpos; return x_shade; }

      let redrawLines = false;

      if (start <= prevPulseTime && prevPulseTime < end) {
        ctx.save(); ctx.translate(xpos - 2, -2);
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, curr.getWidth() + 4, this.height + 4);
        if (this.isWithinLoopRegion(start)) {
          const ys = this.ytop - LineWidth, ye = ys + StaffHeight;
          ctx.fillStyle = LOOP_TINT_COLOR; ctx.fillRect(0, ys + 2, curr.getWidth() + 4, ye - ys);
        }
        ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';
        ctx.restore();
        ctx.save(); ctx.translate(xpos, 0); curr.Draw(ctx, this.ytop); ctx.restore();
        redrawLines = true;
      }

      if (start <= currentPulseTime && currentPulseTime < end) {
        x_shade = xpos;
        ctx.save(); ctx.translate(xpos, 0);
        ctx.fillStyle = shade; ctx.fillRect(0, 0, curr.getWidth(), this.height);
        ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';
        curr.Draw(ctx, this.ytop);
        ctx.restore();
        redrawLines = true;
      }

      if (redrawLines) {
        let y = this.ytop - LineWidth;
        ctx.lineWidth = 1; ctx.strokeStyle = 'black';
        ctx.save(); ctx.translate(xpos - 2, 0);
        for (let line = 1; line <= 5; line++) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(curr.getWidth() + 4, y); ctx.stroke();
          y += LineWidth + LineSpace;
        }
        ctx.restore();
        if (this.showBeatMarkers) this.DrawBeatMarkers(ctx);
        if (prevChord) { ctx.save(); ctx.translate(prev_xpos, 0); prevChord.Draw(ctx, this.ytop); ctx.restore(); }
        if (this.showMeasures) this.DrawMeasureNumbers(ctx);
        if (this.lyrics) this.DrawLyrics(ctx);
        this.DrawTieArcs(ctx);
      }

      if (curr instanceof ChordSymbol) {
        const chord = curr as ChordSymbol;
        if (chord.getStem() && !chord.getStem()!.getReceiver()) { prevChord = chord; prev_xpos = xpos; }
      }
      xpos += curr.getWidth();
    }
    return x_shade;
  }

  PulseTimeForPoint(point: { x: number; y: number }): number {
    let xpos = this.keysigWidth;
    let pulseTime = this.starttime;
    for (const sym of this.symbols) {
      pulseTime = sym.getStartTime();
      if (point.x <= xpos + sym.getWidth()) return pulseTime;
      xpos += sym.getWidth();
    }
    return pulseTime;
  }

  toString(): string {
    let result = `Staff clef=${this.clefsym}\n  Keys:\n`;
    for (const a of this.keys) result += `    ${a}\n`;
    result += '  Symbols:\n';
    for (const m of this.symbols) result += `    ${m}\n`;
    return result + 'End Staff\n';
  }
}
