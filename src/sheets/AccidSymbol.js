import { Accid } from './Accid';
import { WhiteNote } from './WhiteNote';
import { NoteHeight, LineSpace, LineWidth, } from './SheetMusicConstants';
/** An accidental symbol (sharp, flat, or natural) displayed at a specific note position. */
export class AccidSymbol {
    accid;
    whitenote;
    clef;
    width;
    constructor(accid, note, clef) {
        this.accid = accid;
        this.whitenote = note;
        this.clef = clef;
        this.width = this.getMinWidth();
    }
    getNote() { return this.whitenote; }
    getStartTime() { return -1; }
    getMinWidth() { return Math.floor(3 * NoteHeight / 2); }
    getWidth() { return this.width; }
    setWidth(value) { this.width = value; }
    getAboveStaff() {
        let dist = WhiteNote.Top(this.clef).Dist(this.whitenote) * Math.floor(NoteHeight / 2);
        if (this.accid === Accid.Sharp || this.accid === Accid.Natural)
            dist -= NoteHeight;
        else if (this.accid === Accid.Flat)
            dist -= Math.floor(3 * NoteHeight / 2);
        return dist < 0 ? -dist : 0;
    }
    getBelowStaff() {
        let dist = WhiteNote.Bottom(this.clef).Dist(this.whitenote) * Math.floor(NoteHeight / 2) + NoteHeight;
        if (this.accid === Accid.Sharp || this.accid === Accid.Natural)
            dist += NoteHeight;
        return dist > 0 ? dist : 0;
    }
    Draw(ctx, ytop) {
        ctx.save();
        ctx.translate(this.getWidth() - this.getMinWidth(), 0);
        const ynote = ytop + WhiteNote.Top(this.clef).Dist(this.whitenote) * Math.floor(NoteHeight / 2);
        if (this.accid === Accid.Sharp)
            this.DrawSharp(ctx, ynote);
        else if (this.accid === Accid.Flat)
            this.DrawFlat(ctx, ynote);
        else if (this.accid === Accid.Natural)
            this.DrawNatural(ctx, ynote);
        ctx.restore();
    }
    DrawSharp(ctx, ynote) {
        const ystart = ynote - NoteHeight;
        const yend = ynote + 2 * NoteHeight;
        let x = Math.floor(NoteHeight / 2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, ystart + 2);
        ctx.lineTo(x, yend);
        ctx.stroke();
        x += Math.floor(NoteHeight / 2);
        ctx.beginPath();
        ctx.moveTo(x, ystart);
        ctx.lineTo(x, yend - 2);
        ctx.stroke();
        const xstart = Math.floor(NoteHeight / 2) - Math.floor(NoteHeight / 4);
        const xend = NoteHeight + Math.floor(NoteHeight / 4);
        let ys = ynote + LineWidth;
        let ye = ys - LineWidth - Math.floor(LineSpace / 4);
        ctx.lineWidth = Math.floor(LineSpace / 2);
        ctx.beginPath();
        ctx.moveTo(xstart, ys);
        ctx.lineTo(xend, ye);
        ctx.stroke();
        ys += LineSpace;
        ye += LineSpace;
        ctx.beginPath();
        ctx.moveTo(xstart, ys);
        ctx.lineTo(xend, ye);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
    DrawFlat(ctx, ynote) {
        const x = Math.floor(LineSpace / 4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, ynote - NoteHeight - Math.floor(NoteHeight / 2));
        ctx.lineTo(x, ynote + NoteHeight);
        ctx.stroke();
        // Three increasingly-bulging bezier curves
        const curves = [
            [
                x + Math.floor(LineSpace / 2), ynote - Math.floor(LineSpace / 2),
                x + LineSpace, ynote + Math.floor(LineSpace / 3),
                x, ynote + LineSpace + LineWidth + 1,
            ],
            [
                x + Math.floor(LineSpace / 2), ynote - Math.floor(LineSpace / 2),
                x + LineSpace + Math.floor(LineSpace / 4), ynote + Math.floor(LineSpace / 3) - Math.floor(LineSpace / 4),
                x, ynote + LineSpace + LineWidth + 1,
            ],
            [
                x + Math.floor(LineSpace / 2), ynote - Math.floor(LineSpace / 2),
                x + LineSpace + Math.floor(LineSpace / 2), ynote + Math.floor(LineSpace / 3) - Math.floor(LineSpace / 2),
                x, ynote + LineSpace + LineWidth + 1,
            ],
        ];
        for (const [cx1, cy1, cx2, cy2, ex, ey] of curves) {
            ctx.beginPath();
            ctx.moveTo(x, ynote + Math.floor(LineSpace / 4));
            ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
            ctx.stroke();
        }
    }
    DrawNatural(ctx, ynote) {
        let ystart = ynote - LineSpace - LineWidth;
        let yend = ynote + LineSpace + LineWidth;
        let x = Math.floor(LineSpace / 2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, ystart);
        ctx.lineTo(x, yend);
        ctx.stroke();
        x += LineSpace - Math.floor(LineSpace / 4);
        ystart = ynote - Math.floor(LineSpace / 4);
        yend = ynote + 2 * LineSpace + LineWidth - Math.floor(LineSpace / 4);
        ctx.beginPath();
        ctx.moveTo(x, ystart);
        ctx.lineTo(x, yend);
        ctx.stroke();
        const xstart = Math.floor(LineSpace / 2);
        const xend = xstart + LineSpace - Math.floor(LineSpace / 4);
        let ys = ynote + LineWidth;
        let ye = ys - LineWidth - Math.floor(LineSpace / 4);
        ctx.lineWidth = Math.floor(LineSpace / 2);
        ctx.beginPath();
        ctx.moveTo(xstart, ys);
        ctx.lineTo(xend, ye);
        ctx.stroke();
        ys += LineSpace;
        ye += LineSpace;
        ctx.beginPath();
        ctx.moveTo(xstart, ys);
        ctx.lineTo(xend, ye);
        ctx.stroke();
        ctx.lineWidth = 1;
    }
    toString() {
        return `AccidSymbol accid=${this.accid} whitenote=${this.whitenote} clef=${this.clef} width=${this.width}`;
    }
}
