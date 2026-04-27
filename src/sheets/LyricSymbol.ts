/** A lyric to display at a specific start time. */
export class LyricSymbol {
  private starttime: number;
  private text: string;
  private x: number = 0;

  constructor(starttime: number, text: string) {
    this.starttime = starttime;
    this.text = text;
  }

  getStartTime(): number { return this.starttime; }
  setStartTime(value: number): void { this.starttime = value; }

  getText(): string { return this.text; }
  setText(value: string): void { this.text = value; }

  getX(): number { return this.x; }
  setX(value: number): void { this.x = value; }

  getMinWidth(): number {
    const widthPerChar = 10.0 * 2.0 / 3.0;
    let width = this.text.length * widthPerChar;
    if (this.text.includes('i')) width -= widthPerChar / 2;
    if (this.text.includes('j')) width -= widthPerChar / 2;
    if (this.text.includes('l')) width -= widthPerChar / 2;
    return Math.floor(width);
  }

  toString(): string {
    return `Lyric start=${this.starttime} x=${this.x} text=${this.text}`;
  }
}
