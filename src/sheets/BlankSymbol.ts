import type { MusicSymbol } from './MusicSymbol';

/** A music symbol that draws nothing; used for alignment. */
export class BlankSymbol implements MusicSymbol {
  private starttime: number;
  private width: number;

  constructor(starttime: number, width: number) {
    this.starttime = starttime;
    this.width = width;
  }

  getStartTime(): number { return this.starttime; }
  getMinWidth(): number { return 0; }
  getWidth(): number { return this.width; }
  setWidth(value: number): void { this.width = value; }
  getAboveStaff(): number { return 0; }
  getBelowStaff(): number { return 0; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Draw(_ctx: CanvasRenderingContext2D, _ytop: number): void {}

  toString(): string {
    return `BlankSymbol starttime=${this.starttime} width=${this.width}`;
  }
}
