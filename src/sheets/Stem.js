import { NoteDuration } from '@/midi/NoteDuration';
import { NoteHeight, NoteWidth, LineSpace } from './SheetMusicConstants';
/** Draws the stem portion of a chord symbol. */
export class Stem {
    static Up = 1;
    static Down = 2;
    static LeftSide = 1;
    static RightSide = 2;
    static PARTIAL_BEAM_NONE = 0;
    static PARTIAL_BEAM_BOTH_ENDS = 1;
    static PARTIAL_BEAM_RIGHT = 2;
    static PARTIAL_BEAM_LEFT = 3;
    duration;
    direction;
    top;
    bottom;
    end;
    notesoverlap;
    side;
    pair = null;
    width_to_pair = 0;
    receiver_in_pair = false;
    tripletBeam = false;
    partialSixteenthBeam = Stem.PARTIAL_BEAM_NONE;
    getDirection() { return this.direction; }
    setDirection(value) { this.ChangeDirection(value); }
    getDuration() { return this.duration; }
    getTop() { return this.top; }
    getBottom() { return this.bottom; }
    getEnd() { return this.end; }
    setEnd(value) { this.end = value; }
    getReceiver() { return this.receiver_in_pair; }
    setReceiver(value) { this.receiver_in_pair = value; }
    isTriplet() { return this.tripletBeam; }
    setTriplet(value) { this.tripletBeam = value; }
    getPartialSixteenthBeam() { return this.partialSixteenthBeam; }
    setPartialSixteenthBeam(value) { this.partialSixteenthBeam = value; }
    hasMixedOuterSixteenths() { return this.partialSixteenthBeam !== Stem.PARTIAL_BEAM_NONE; }
    constructor(bottom, top, duration, direction, overlap) {
        this.top = top;
        this.bottom = bottom;
        this.duration = duration;
        this.direction = direction;
        this.notesoverlap = overlap;
        this.side = (direction === Stem.Up || overlap) ? Stem.RightSide : Stem.LeftSide;
        this.end = this.CalculateEnd();
    }
    CalculateEnd() {
        if (this.direction === Stem.Up) {
            let w = this.top.Add(6);
            if (this.duration === NoteDuration.Sixteenth)
                w = w.Add(2);
            if (this.duration === NoteDuration.ThirtySecond)
                w = w.Add(4);
            return w;
        }
        else {
            let w = this.bottom.Add(-6);
            if (this.duration === NoteDuration.Sixteenth)
                w = w.Add(-2);
            if (this.duration === NoteDuration.ThirtySecond)
                w = w.Add(-4);
            return w;
        }
    }
    ChangeDirection(newdirection) {
        this.direction = newdirection;
        this.side = (newdirection === Stem.Up || this.notesoverlap) ? Stem.RightSide : Stem.LeftSide;
        this.end = this.CalculateEnd();
    }
    SetPair(pair, width_to_pair) {
        this.pair = pair;
        this.width_to_pair = width_to_pair;
    }
    IsBeam() {
        return this.receiver_in_pair || (this.pair !== null);
    }
    Draw(ctx, ytop, topstaff) {
        if (this.duration === NoteDuration.Whole)
            return;
        this.DrawVerticalLine(ctx, ytop, topstaff);
        if (this.duration === NoteDuration.Quarter ||
            this.duration === NoteDuration.DottedQuarter ||
            this.duration === NoteDuration.Half ||
            this.duration === NoteDuration.DottedHalf ||
            this.receiver_in_pair) {
            return;
        }
        if (this.pair !== null)
            this.DrawHorizBarStem(ctx, ytop, topstaff);
        else
            this.DrawCurvyStem(ctx, ytop, topstaff);
    }
    DrawVerticalLine(ctx, ytop, topstaff) {
        const xstart = this.side === Stem.LeftSide
            ? Math.floor(LineSpace / 4) + 1
            : Math.floor(LineSpace / 4) + NoteWidth;
        if (this.direction === Stem.Up) {
            const y1 = ytop + topstaff.Dist(this.bottom) * Math.floor(NoteHeight / 2) + Math.floor(NoteHeight / 4);
            const ystem = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2);
            ctx.beginPath();
            ctx.moveTo(xstart, y1);
            ctx.lineTo(xstart, ystem);
            ctx.stroke();
        }
        else if (this.direction === Stem.Down) {
            let y1 = ytop + topstaff.Dist(this.top) * Math.floor(NoteHeight / 2) + NoteHeight;
            y1 = this.side === Stem.LeftSide ? y1 - Math.floor(NoteHeight / 4) : y1 - Math.floor(NoteHeight / 2);
            const ystem = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2) + NoteHeight;
            ctx.beginPath();
            ctx.moveTo(xstart, y1);
            ctx.lineTo(xstart, ystem);
            ctx.stroke();
        }
    }
    DrawCurvyStem(ctx, ytop, topstaff) {
        ctx.lineWidth = 2;
        const xstart = this.side === Stem.LeftSide
            ? Math.floor(LineSpace / 4) + 1
            : Math.floor(LineSpace / 4) + NoteWidth;
        if (this.direction === Stem.Up) {
            let ystem = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2);
            const drawTail = (ys) => {
                ctx.beginPath();
                ctx.moveTo(xstart, ys);
                ctx.bezierCurveTo(xstart, ys + Math.floor(3 * LineSpace / 2), xstart + LineSpace * 2, ys + NoteHeight * 2, xstart + Math.floor(LineSpace / 2), ys + NoteHeight * 3);
                ctx.stroke();
            };
            if ([NoteDuration.Eighth, NoteDuration.DottedEighth, NoteDuration.Triplet,
                NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                drawTail(ystem);
            }
            ystem += NoteHeight;
            if ([NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                drawTail(ystem);
            }
            ystem += NoteHeight;
            if (this.duration === NoteDuration.ThirtySecond) {
                drawTail(ystem);
            }
        }
        else if (this.direction === Stem.Down) {
            let ystem = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2) + NoteHeight;
            const drawTail = (ys) => {
                ctx.beginPath();
                ctx.moveTo(xstart, ys);
                ctx.bezierCurveTo(xstart, ys - LineSpace, xstart + LineSpace * 2, ys - NoteHeight * 2, xstart + LineSpace, ys - NoteHeight * 2 - Math.floor(LineSpace / 2));
                ctx.stroke();
            };
            if ([NoteDuration.Eighth, NoteDuration.DottedEighth, NoteDuration.Triplet,
                NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                drawTail(ystem);
            }
            ystem -= NoteHeight;
            if ([NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                drawTail(ystem);
            }
            ystem -= NoteHeight;
            if (this.duration === NoteDuration.ThirtySecond) {
                drawTail(ystem);
            }
        }
        ctx.lineWidth = 1;
    }
    DrawHorizBarStem(ctx, ytop, topstaff) {
        if (this.pair === null)
            return;
        ctx.lineWidth = Math.floor(NoteHeight / 2);
        ctx.lineCap = 'butt';
        const xstart = this.side === Stem.LeftSide
            ? Math.floor(LineSpace / 4) + 1
            : Math.floor(LineSpace / 4) + NoteWidth;
        const xstart2 = this.pair.side === Stem.LeftSide
            ? Math.floor(LineSpace / 4) + 1
            : Math.floor(LineSpace / 4) + NoteWidth;
        if (this.direction === Stem.Up) {
            const xend = this.width_to_pair + xstart2;
            let ystart = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2);
            let yend = ytop + topstaff.Dist(this.pair.end) * Math.floor(NoteHeight / 2);
            if ([NoteDuration.Eighth, NoteDuration.DottedEighth, NoteDuration.Triplet,
                NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                ctx.beginPath();
                ctx.moveTo(xstart, ystart);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            ystart += NoteHeight;
            yend += NoteHeight;
            if (this.duration === NoteDuration.DottedEighth) {
                const x = xend - NoteHeight;
                const slope = (yend - ystart) / (xend - xstart);
                const y = Math.round(slope * (x - xend) + yend);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_RIGHT && xend > xstart) {
                const xmid = xstart + Math.floor((xend - xstart) / 2);
                const slope = (yend - ystart) / (xend - xstart);
                const ymid = ystart + Math.round(slope * (xmid - xstart));
                ctx.beginPath();
                ctx.moveTo(xmid, ymid);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if ([NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_BOTH_ENDS && xend > xstart) {
                    const plen = NoteHeight;
                    const slope = (yend - ystart) / (xend - xstart);
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xstart + plen, Math.round(ystart + slope * plen));
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(xend - plen, Math.round(yend - slope * plen));
                    ctx.lineTo(xend, yend);
                    ctx.stroke();
                }
                else if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_LEFT && xend > xstart) {
                    const xmid = xstart + Math.floor((xend - xstart) / 2);
                    const slope = (yend - ystart) / (xend - xstart);
                    const ymid = ystart + Math.round(slope * (xmid - xstart));
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xmid, ymid);
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xend, yend);
                    ctx.stroke();
                }
            }
            ystart += NoteHeight;
            yend += NoteHeight;
            if (this.duration === NoteDuration.ThirtySecond) {
                ctx.beginPath();
                ctx.moveTo(xstart, ystart);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if (this.isTriplet()) {
                const ybeam = Math.min(ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2), ytop + topstaff.Dist(this.pair.end) * Math.floor(NoteHeight / 2));
                this.DrawTripletBracket(ctx, xstart, xend, ybeam, true);
            }
        }
        else {
            const xend = this.width_to_pair + xstart2;
            let ystart = ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2) + NoteHeight;
            let yend = ytop + topstaff.Dist(this.pair.end) * Math.floor(NoteHeight / 2) + NoteHeight;
            if ([NoteDuration.Eighth, NoteDuration.DottedEighth, NoteDuration.Triplet,
                NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                ctx.beginPath();
                ctx.moveTo(xstart, ystart);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            ystart -= NoteHeight;
            yend -= NoteHeight;
            if (this.duration === NoteDuration.DottedEighth) {
                const x = xend - NoteHeight;
                const slope = (yend - ystart) / (xend - xstart);
                const y = Math.round(slope * (x - xend) + yend);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_RIGHT && xend > xstart) {
                const xmid = xstart + Math.floor((xend - xstart) / 2);
                const slope = (yend - ystart) / (xend - xstart);
                const ymid = ystart + Math.round(slope * (xmid - xstart));
                ctx.beginPath();
                ctx.moveTo(xmid, ymid);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if ([NoteDuration.Sixteenth, NoteDuration.ThirtySecond].includes(this.duration)) {
                if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_BOTH_ENDS && xend > xstart) {
                    const plen = NoteHeight;
                    const slope = (yend - ystart) / (xend - xstart);
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xstart + plen, Math.round(ystart + slope * plen));
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(xend - plen, Math.round(yend - slope * plen));
                    ctx.lineTo(xend, yend);
                    ctx.stroke();
                }
                else if (this.partialSixteenthBeam === Stem.PARTIAL_BEAM_LEFT && xend > xstart) {
                    const xmid = xstart + Math.floor((xend - xstart) / 2);
                    const slope = (yend - ystart) / (xend - xstart);
                    const ymid = ystart + Math.round(slope * (xmid - xstart));
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xmid, ymid);
                    ctx.stroke();
                }
                else {
                    ctx.beginPath();
                    ctx.moveTo(xstart, ystart);
                    ctx.lineTo(xend, yend);
                    ctx.stroke();
                }
            }
            ystart -= NoteHeight;
            yend -= NoteHeight;
            if (this.duration === NoteDuration.ThirtySecond) {
                ctx.beginPath();
                ctx.moveTo(xstart, ystart);
                ctx.lineTo(xend, yend);
                ctx.stroke();
            }
            if (this.isTriplet()) {
                const ybeam = Math.max(ytop + topstaff.Dist(this.end) * Math.floor(NoteHeight / 2) + NoteHeight, ytop + topstaff.Dist(this.pair.end) * Math.floor(NoteHeight / 2) + NoteHeight);
                this.DrawTripletBracket(ctx, xstart, xend, ybeam, false);
            }
        }
        ctx.lineWidth = 1;
    }
    DrawTripletBracket(ctx, xstart, xend, ybeam, above) {
        const xcenter = Math.floor((xstart + xend) / 2);
        const bracketGap = NoteHeight;
        const ybracket = above ? ybeam - bracketGap : ybeam + bracketGap;
        // Estimate "3" glyph half-width
        const halfTextWidth = 6; // approximate
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        // Horizontal line with gap for "3"
        ctx.beginPath();
        ctx.moveTo(xstart, ybracket);
        ctx.lineTo(xcenter - halfTextWidth, ybracket);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(xcenter + halfTextWidth, ybracket);
        ctx.lineTo(xend, ybracket);
        ctx.stroke();
        // Vertical hooks
        const hookLen = Math.floor(NoteHeight / 2);
        if (above) {
            ctx.beginPath();
            ctx.moveTo(xstart, ybracket);
            ctx.lineTo(xstart, ybracket + hookLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xend, ybracket);
            ctx.lineTo(xend, ybracket + hookLen);
            ctx.stroke();
        }
        else {
            ctx.beginPath();
            ctx.moveTo(xstart, ybracket);
            ctx.lineTo(xstart, ybracket - hookLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xend, ybracket);
            ctx.lineTo(xend, ybracket - hookLen);
            ctx.stroke();
        }
        // "3" text
        const savedFill = ctx.fillStyle;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('3', xcenter, ybracket);
        ctx.fillStyle = savedFill;
    }
    toString() {
        return `Stem duration=${this.duration} direction=${this.direction} top=${this.top} bottom=${this.bottom} end=${this.end} overlap=${this.notesoverlap} side=${this.side} width_to_pair=${this.width_to_pair} receiver_in_pair=${this.receiver_in_pair}`;
    }
}
