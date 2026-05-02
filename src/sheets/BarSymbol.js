import { LineSpace, NoteWidth, LineWidth } from './SheetMusicConstants';
/** Represents a vertical bar line delimiting measures. */
export class BarSymbol {
    starttime;
    width;
    constructor(starttime) {
        this.starttime = starttime;
        this.width = this.getMinWidth();
    }
    getStartTime() { return this.starttime; }
    getMinWidth() { return 2 * LineSpace; }
    getWidth() { return this.width; }
    setWidth(value) { this.width = value; }
    getAboveStaff() { return 0; }
    getBelowStaff() { return 0; }
    Draw(ctx, ytop) {
        const y = ytop;
        const yend = y + LineSpace * 4 + LineWidth * 4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.floor(NoteWidth / 2), y);
        ctx.lineTo(Math.floor(NoteWidth / 2), yend);
        ctx.stroke();
    }
    toString() {
        return `BarSymbol starttime=${this.starttime} width=${this.width}`;
    }
}
