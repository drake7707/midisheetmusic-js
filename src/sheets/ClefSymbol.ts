import type { MusicSymbol } from './MusicSymbol';
import { Clef } from './Clef';
import { NoteWidth, NoteHeight, StaffHeight } from './SheetMusicConstants';

/** Renders a Treble or Bass clef using Unicode music symbols. */
export class ClefSymbol implements MusicSymbol {
  private starttime: number;
  private smallsize: boolean;
  private clef: Clef;
  private width: number;

  constructor(clef: Clef, starttime: number, small: boolean) {
    this.clef = clef;
    this.starttime = starttime;
    this.smallsize = small;
    this.width = this.getMinWidth();
  }

  getStartTime(): number { return this.starttime; }

  getMinWidth(): number {
    return this.smallsize ? NoteWidth * 2 : NoteWidth * 3;
  }

  getWidth(): number { return this.width; }
  setWidth(value: number): void { this.width = value; }

  getAboveStaff(): number {
    if (this.clef === Clef.Treble && !this.smallsize)
      return NoteHeight * 2;
    return 0;
  }

  getBelowStaff(): number {
    if (this.clef === Clef.Treble && !this.smallsize)
      return NoteHeight * 2;
    if (this.clef === Clef.Treble && this.smallsize)
      return NoteHeight;
    return 0;
  }

  Draw(ctx: CanvasRenderingContext2D, ytop: number): void {
    ctx.save();
    ctx.translate(this.getWidth() - this.getMinWidth(), 0);

    let y: number;
    let fontSize: number;
    let symbol: string;

    if (this.clef === Clef.Treble) {
      symbol = '\u{1D11E}'; // 𝄞 treble clef
      if (this.smallsize) {
        fontSize = StaffHeight + Math.floor(StaffHeight / 4);
        y = ytop + Math.floor(StaffHeight * 3 / 4);
      } else {
        fontSize = Math.floor(3 * StaffHeight / 2) + Math.floor(NoteHeight / 2);
        y = ytop + StaffHeight - NoteHeight;
      }
    } else {
      symbol = '\u{1D122}'; // 𝄢 bass clef
      if (this.smallsize) {
        fontSize = StaffHeight - Math.floor(3 * NoteHeight / 2);
        y = ytop + StaffHeight - Math.floor(3 * NoteHeight / 2);
      } else {
        fontSize = StaffHeight - NoteHeight;
        y = ytop + StaffHeight - NoteHeight;
      }
    }

    ctx.font = `${fontSize}px serif`;
    ctx.textBaseline = 'bottom';

    // Measure the actual rendered glyph size and scale down if the font (e.g. an
    // emoji/symbol fallback) renders it larger than the space reserved for it.
    const metrics = ctx.measureText(symbol);
    const glyphH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    // Maximum allowed height: above-staff + staff + below-staff
    const maxH = this.getAboveStaff() + StaffHeight + this.getBelowStaff();
    if (glyphH > 0 && glyphH > maxH) {
      const scale = maxH / glyphH;
      ctx.scale(scale, scale);
      y = y / scale;
    }

    ctx.fillText(symbol, 0, y);

    ctx.restore();
  }

  toString(): string {
    return `ClefSymbol clef=${this.clef} small=${this.smallsize} width=${this.width}`;
  }
}
