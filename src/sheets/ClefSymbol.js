import { Clef } from './Clef';
import { NoteWidth, NoteHeight, StaffHeight } from './SheetMusicConstants';
/** Renders a Treble or Bass clef using Unicode music symbols. */
export class ClefSymbol {
    starttime;
    smallsize;
    clef;
    width;
    constructor(clef, starttime, small) {
        this.clef = clef;
        this.starttime = starttime;
        this.smallsize = small;
        this.width = this.getMinWidth();
    }
    getStartTime() { return this.starttime; }
    getMinWidth() {
        return this.smallsize ? NoteWidth * 2 : NoteWidth * 3;
    }
    getWidth() { return this.width; }
    setWidth(value) { this.width = value; }
    getAboveStaff() {
        if (this.clef === Clef.Treble && !this.smallsize)
            return NoteHeight * 2;
        return 0;
    }
    getBelowStaff() {
        if (this.clef === Clef.Treble && !this.smallsize)
            return NoteHeight * 2;
        if (this.clef === Clef.Treble && this.smallsize)
            return NoteHeight;
        return 0;
    }
    Draw(ctx, ytop) {
        ctx.save();
        ctx.translate(this.getWidth() - this.getMinWidth(), 0);
        let y;
        let fontSize;
        let symbol;
        if (this.clef === Clef.Treble) {
            symbol = '\u{1D11E}'; // 𝄞 treble clef
            if (this.smallsize) {
                fontSize = StaffHeight + Math.floor(StaffHeight / 4);
                y = ytop + Math.floor(StaffHeight * 3 / 4);
            }
            else {
                fontSize = Math.floor(3 * StaffHeight / 2) + Math.floor(NoteHeight / 2);
                y = ytop + StaffHeight + NoteHeight;
            }
        }
        else {
            symbol = '\u{1D122}'; // 𝄢 bass clef
            if (this.smallsize) {
                fontSize = StaffHeight - Math.floor(3 * NoteHeight / 2);
                y = ytop + StaffHeight - Math.floor(3 * NoteHeight / 2);
            }
            else {
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
    toString() {
        return `ClefSymbol clef=${this.clef} small=${this.smallsize} width=${this.width}`;
    }
}
