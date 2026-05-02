import { NoteDuration } from '@/midi/NoteDuration';
import { NoteHeight, NoteWidth, LineSpace } from './SheetMusicConstants';
/** A rest symbol (whole, half, quarter, eighth, or sixteenth). */
export class RestSymbol {
    starttime;
    duration;
    width;
    constructor(start, dur) {
        this.starttime = start;
        this.duration = dur;
        this.width = this.getMinWidth();
    }
    getStartTime() { return this.starttime; }
    getEndTime(sig) { return this.getStartTime() + sig.DurationToTime(this.duration); }
    getWidth() { return this.width; }
    setWidth(value) { this.width = value; }
    getMinWidth() { return 2 * NoteHeight + Math.floor(NoteHeight / 2); }
    getAboveStaff() { return 0; }
    getBelowStaff() { return 0; }
    Draw(ctx, ytop) {
        ctx.save();
        ctx.translate(this.getWidth() - this.getMinWidth(), 0);
        ctx.translate(Math.floor(NoteHeight / 2), 0);
        switch (this.duration) {
            case NoteDuration.Whole:
                this.DrawWhole(ctx, ytop);
                break;
            case NoteDuration.Half:
                this.DrawHalf(ctx, ytop);
                break;
            case NoteDuration.Quarter:
                this.DrawQuarter(ctx, ytop);
                break;
            case NoteDuration.Eighth:
                this.DrawEighth(ctx, ytop);
                break;
            case NoteDuration.Sixteenth:
                this.DrawSixteenth(ctx, ytop);
                break;
        }
        ctx.restore();
    }
    DrawWhole(ctx, ytop) {
        const y = ytop + NoteHeight;
        ctx.fillRect(0, y, NoteWidth, Math.floor(NoteHeight / 2));
    }
    DrawHalf(ctx, ytop) {
        const y = ytop + NoteHeight + Math.floor(NoteHeight / 2);
        ctx.fillRect(0, y, NoteWidth, Math.floor(NoteHeight / 2));
    }
    DrawQuarter(ctx, ytop) {
        ctx.lineCap = 'butt';
        let y = ytop + Math.floor(NoteHeight / 2);
        const x = 2;
        const xend = x + Math.floor(2 * NoteHeight / 3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(xend - 1, y + NoteHeight - 1);
        ctx.stroke();
        ctx.lineWidth = Math.floor(LineSpace / 2);
        y = ytop + NoteHeight + 1;
        ctx.beginPath();
        ctx.moveTo(xend - 2, y);
        ctx.lineTo(x, y + NoteHeight);
        ctx.stroke();
        ctx.lineWidth = 1;
        y = ytop + NoteHeight * 2 - 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(xend + 2, y + NoteHeight);
        ctx.stroke();
        ctx.lineWidth = Math.floor(LineSpace / 2);
        if (NoteHeight === 6) {
            ctx.beginPath();
            ctx.moveTo(xend, y + 1 + Math.floor(3 * NoteHeight / 4));
            ctx.lineTo(Math.floor(x / 2), y + 1 + Math.floor(3 * NoteHeight / 4));
            ctx.stroke();
        }
        else {
            ctx.beginPath();
            ctx.moveTo(xend, y + Math.floor(3 * NoteHeight / 4));
            ctx.lineTo(Math.floor(x / 2), y + Math.floor(3 * NoteHeight / 4));
            ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + Math.floor(2 * NoteHeight / 3) + 1);
        ctx.lineTo(xend - 1, y + Math.floor(3 * NoteHeight / 2));
        ctx.stroke();
    }
    DrawEighth(ctx, ytop) {
        const y = ytop + NoteHeight - 1;
        const cx = (LineSpace - 1) / 2;
        const rx = (LineSpace - 1) / 2;
        const ry = (LineSpace - 1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, y + 1 + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.floor((LineSpace - 2) / 2), y + LineSpace - 1);
        ctx.lineTo(Math.floor(3 * LineSpace / 2), y + Math.floor(LineSpace / 2));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(Math.floor(3 * LineSpace / 2), y + Math.floor(LineSpace / 2));
        ctx.lineTo(Math.floor(3 * LineSpace / 4), y + NoteHeight * 2);
        ctx.stroke();
    }
    DrawSixteenth(ctx, ytop) {
        const y = ytop + NoteHeight - 1;
        const offset = 2;
        // 8th oval
        let rx = (LineSpace - 1) / 2;
        let ry = (LineSpace - 1) / 2;
        ctx.beginPath();
        ctx.ellipse(offset + rx, y + 1 + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        // 16th oval
        ctx.beginPath();
        ctx.ellipse(rx, y + 1 + NoteHeight + ry, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 1;
        // flag for 16th
        ctx.beginPath();
        ctx.moveTo(Math.floor((LineSpace - 2) / 2) + offset, y + LineSpace - 1 + LineSpace);
        ctx.lineTo(Math.floor(2 * LineSpace / 2) + offset, y + Math.floor(LineSpace / 2) + LineSpace);
        ctx.stroke();
        // flag for 8th
        ctx.beginPath();
        ctx.moveTo(Math.floor((LineSpace - 2) / 2), y + LineSpace - 1);
        ctx.lineTo(Math.floor(3 * LineSpace / 2), y + Math.floor(LineSpace / 2));
        ctx.stroke();
        // stem
        ctx.beginPath();
        ctx.moveTo(Math.floor(3 * LineSpace / 2), y + Math.floor(LineSpace / 2));
        ctx.lineTo(Math.floor(3 * LineSpace / 4), y + NoteHeight * 3);
        ctx.stroke();
    }
    toString() {
        return `RestSymbol starttime=${this.starttime} duration=${this.duration} width=${this.width}`;
    }
}
