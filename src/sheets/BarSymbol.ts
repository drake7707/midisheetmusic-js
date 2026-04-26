import type { MusicSymbol } from './MusicSymbol';
import { LineSpace, NoteWidth, LineWidth } from './SheetMusicConstants';

/** Represents a vertical bar line delimiting measures. */
export class BarSymbol implements MusicSymbol {
  private starttime: number;
  private width: number;

  constructor(starttime: number) {
    this.starttime = starttime;
    this.width = this.getMinWidth();
  }

  getStartTime(): number { return this.starttime; }
  getMinWidth(): number { return 2 * LineSpace; }
  getWidth(): number { return this.width; }
  setWidth(value: number): void { this.width = value; }
  getAboveStaff(): number { return 0; }
  getBelowStaff(): number { return 0; }

  Draw(ctx: CanvasRenderingContext2D, ytop: number): void {
    const y    = ytop;
    const yend = y + LineSpace * 4 + LineWidth * 4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.floor(NoteWidth / 2), y);
    ctx.lineTo(Math.floor(NoteWidth / 2), yend);
    ctx.stroke();
  }

  toString(): string {
    return `BarSymbol starttime=${this.starttime} width=${this.width}`;
  }
}
