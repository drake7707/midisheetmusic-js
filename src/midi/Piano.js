/**
 * Piano.ts — TypeScript port of Piano.java
 * Draws a piano keyboard on a CanvasRenderingContext2D and shades notes.
 */
import { MidiFile } from '@/midi/MidiFile';
import { NoteNameLetter, NoteNameFixedNumber, NoteNameNone } from '@/midi/MidiFile';
export class Piano {
    static KeysPerOctave = 7;
    static MaxOctave = 6;
    whiteKeyWidth = 0;
    whiteKeyHeight = 0;
    blackKeyWidth = 0;
    blackKeyHeight = 0;
    margin = 0;
    blackBorder = 0;
    blackKeyOffsets = [];
    notes = [];
    useTwoColors = false;
    shade1 = 0xffd2cddc; // rgb(210,205,220)
    shade2 = 0xff96c8dc; // rgb(150,200,220)
    maxShadeDuration = 0;
    showNoteLetters = NoteNameNone;
    // Color constants
    gray1 = '#606060';
    gray2 = '#808080';
    gray3 = '#a0a0a0';
    constructor() { }
    /** Get the preferred pixel size for this piano given screen dimensions. */
    static getPreferredSize(screenWidth, _screenHeight) {
        const keywidth = Math.floor(screenWidth / (2.0 + Piano.KeysPerOctave * Piano.MaxOctave));
        const whiteKeyHeight = keywidth * 5;
        const blackBorder = Math.floor(keywidth / 2);
        const border = blackBorder;
        const result = {
            width: 2 + border * 2 + keywidth * Piano.KeysPerOctave * Piano.MaxOctave,
            height: 2 + border * 3 + whiteKeyHeight,
        };
        return result;
    }
    /** Initialise dimensions based on available screen width. */
    init(screenWidth) {
        let wkw = Math.floor(screenWidth / (2.0 + Piano.KeysPerOctave * Piano.MaxOctave));
        if (wkw % 2 !== 0)
            wkw--;
        this.whiteKeyWidth = wkw;
        this.blackBorder = Math.floor(wkw / 2);
        this.whiteKeyHeight = wkw * 5;
        this.blackKeyWidth = Math.floor(wkw / 2);
        this.blackKeyHeight = Math.floor(this.whiteKeyHeight * 5 / 9);
        const bkw = this.blackKeyWidth;
        const wkw2 = this.whiteKeyWidth;
        this.blackKeyOffsets = [
            wkw2 - Math.floor(bkw / 2) - 1,
            wkw2 + Math.floor(bkw / 2) - 1,
            2 * wkw2 - Math.floor(bkw / 2),
            2 * wkw2 + Math.floor(bkw / 2),
            4 * wkw2 - Math.floor(bkw / 2) - 1,
            4 * wkw2 + Math.floor(bkw / 2) - 1,
            5 * wkw2 - Math.floor(bkw / 2),
            5 * wkw2 + Math.floor(bkw / 2),
            6 * wkw2 - Math.floor(bkw / 2),
            6 * wkw2 + Math.floor(bkw / 2),
        ];
    }
    getWidth() { return this.margin * 2 + this.blackBorder * 2 + this.whiteKeyWidth * Piano.KeysPerOctave * Piano.MaxOctave; }
    getHeight() { return this.margin * 2 + this.blackBorder * 3 + this.whiteKeyHeight; }
    SetMidiFile(midifile, options) {
        const tracks = midifile.ChangeMidiNotes(options);
        const track = MidiFile.CombineToSingleTrack(tracks);
        this.notes = track.getNotes();
        this.maxShadeDuration = midifile.getTime().getQuarter() * 2;
        for (let t = 0; t < tracks.length; t++) {
            for (const note of tracks[t].getNotes()) {
                note.setChannel(t);
            }
        }
        this.useTwoColors = tracks.length === 2;
        this.showNoteLetters = options.showNoteLetters;
    }
    SetShadeColors(c1, c2) {
        this.shade1 = c1;
        this.shade2 = c2;
    }
    /** Draw the piano onto the canvas. Canvas should already be translated to the piano origin. */
    Draw(ctx) {
        if (this.whiteKeyWidth === 0)
            return;
        ctx.save();
        // Background
        const h = this.getHeight();
        const w = this.getWidth();
        ctx.fillStyle = this.gray1;
        ctx.fillRect(0, 0, w, h);
        ctx.translate(this.margin + this.blackBorder, this.margin + this.blackBorder);
        // White keys
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.whiteKeyWidth * Piano.KeysPerOctave * Piano.MaxOctave, this.whiteKeyHeight);
        // Black keys
        this.drawBlackKeys(ctx);
        // Outlines
        this.drawOutline(ctx);
        ctx.translate(-(this.margin + this.blackBorder), -(this.margin + this.blackBorder));
        this.drawBlackBorder(ctx);
        // Note letters
        if (this.showNoteLetters !== NoteNameNone) {
            this.drawNoteLetters(ctx);
        }
        ctx.restore();
    }
    drawOctaveOutline(ctx) {
        const right = this.whiteKeyWidth * Piano.KeysPerOctave;
        const wkh = this.whiteKeyHeight;
        const bkh = this.blackKeyHeight;
        ctx.strokeStyle = this.gray1;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, wkh);
        ctx.moveTo(right, 0);
        ctx.lineTo(right, wkh);
        ctx.moveTo(0, wkh);
        ctx.lineTo(right, wkh);
        ctx.stroke();
        ctx.strokeStyle = this.gray3;
        ctx.beginPath();
        ctx.moveTo(right - 1, 0);
        ctx.lineTo(right - 1, wkh);
        ctx.moveTo(1, 0);
        ctx.lineTo(1, wkh);
        ctx.stroke();
        // Line between E and F
        ctx.strokeStyle = this.gray1;
        ctx.beginPath();
        ctx.moveTo(3 * this.whiteKeyWidth, 0);
        ctx.lineTo(3 * this.whiteKeyWidth, wkh);
        ctx.stroke();
        ctx.strokeStyle = this.gray3;
        ctx.beginPath();
        ctx.moveTo(3 * this.whiteKeyWidth - 1, 0);
        ctx.lineTo(3 * this.whiteKeyWidth - 1, wkh);
        ctx.moveTo(3 * this.whiteKeyWidth + 1, 0);
        ctx.lineTo(3 * this.whiteKeyWidth + 1, wkh);
        ctx.stroke();
        // Black key sides/bottoms
        for (let i = 0; i < 10; i += 2) {
            const x1 = this.blackKeyOffsets[i];
            const x2 = this.blackKeyOffsets[i + 1];
            ctx.strokeStyle = this.gray1;
            ctx.beginPath();
            ctx.moveTo(x1, 0);
            ctx.lineTo(x1, bkh);
            ctx.moveTo(x2, 0);
            ctx.lineTo(x2, bkh);
            ctx.moveTo(x1, bkh);
            ctx.lineTo(x2, bkh);
            ctx.stroke();
            ctx.strokeStyle = this.gray2;
            ctx.beginPath();
            ctx.moveTo(x1 - 1, 0);
            ctx.lineTo(x1 - 1, bkh + 1);
            ctx.moveTo(x2 + 1, 0);
            ctx.lineTo(x2 + 1, bkh + 1);
            ctx.moveTo(x1 - 1, bkh + 1);
            ctx.lineTo(x2 + 1, bkh + 1);
            ctx.stroke();
            ctx.strokeStyle = this.gray3;
            ctx.beginPath();
            ctx.moveTo(x1 - 2, 0);
            ctx.lineTo(x1 - 2, bkh + 2);
            ctx.moveTo(x2 + 2, 0);
            ctx.lineTo(x2 + 2, bkh + 2);
            ctx.moveTo(x1 - 2, bkh + 2);
            ctx.lineTo(x2 + 2, bkh + 2);
            ctx.stroke();
        }
        // Bottom of white keys
        for (let i = 1; i < Piano.KeysPerOctave; i++) {
            if (i === 3)
                continue;
            ctx.strokeStyle = this.gray1;
            ctx.beginPath();
            ctx.moveTo(i * this.whiteKeyWidth, bkh);
            ctx.lineTo(i * this.whiteKeyWidth, wkh);
            ctx.stroke();
            ctx.strokeStyle = this.gray2;
            ctx.beginPath();
            ctx.moveTo(i * this.whiteKeyWidth - 1, bkh + 1);
            ctx.lineTo(i * this.whiteKeyWidth - 1, wkh);
            ctx.stroke();
            ctx.strokeStyle = this.gray3;
            ctx.beginPath();
            ctx.moveTo(i * this.whiteKeyWidth + 1, bkh + 1);
            ctx.lineTo(i * this.whiteKeyWidth + 1, wkh);
            ctx.stroke();
        }
    }
    drawOutline(ctx) {
        for (let octave = 0; octave < Piano.MaxOctave; octave++) {
            ctx.save();
            ctx.translate(octave * this.whiteKeyWidth * Piano.KeysPerOctave, 0);
            this.drawOctaveOutline(ctx);
            ctx.restore();
        }
    }
    drawBlackKeys(ctx) {
        for (let octave = 0; octave < Piano.MaxOctave; octave++) {
            ctx.save();
            ctx.translate(octave * this.whiteKeyWidth * Piano.KeysPerOctave, 0);
            for (let i = 0; i < 10; i += 2) {
                const x1 = this.blackKeyOffsets[i];
                ctx.fillStyle = this.gray1;
                ctx.fillRect(x1, 0, this.blackKeyWidth, this.blackKeyHeight);
                ctx.fillStyle = this.gray2;
                const hl = this.blackKeyHeight - Math.floor(this.blackKeyHeight / 8);
                ctx.fillRect(x1 + 1, hl, this.blackKeyWidth - 2, Math.floor(this.blackKeyHeight / 8));
            }
            ctx.restore();
        }
    }
    drawBlackBorder(ctx) {
        const pw = this.whiteKeyWidth * Piano.KeysPerOctave * Piano.MaxOctave;
        const bb = this.blackBorder;
        const m = this.margin;
        const wkh = this.whiteKeyHeight;
        ctx.fillStyle = this.gray1;
        ctx.fillRect(m, m, m + pw + bb * 2, m + bb - 2);
        ctx.fillRect(m, m, m + bb, m + wkh + bb * 3);
        ctx.fillRect(m, m + bb + wkh, m + bb * 2 + pw, m + bb + wkh + bb * 2);
        ctx.fillRect(m + bb + pw, m, m + bb + pw + bb, m + wkh + bb * 3);
        ctx.strokeStyle = this.gray2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(m + bb, m + bb - 1);
        ctx.lineTo(m + bb + pw, m + bb - 1);
        ctx.stroke();
        ctx.save();
        ctx.translate(m + bb, m + bb);
        ctx.fillStyle = this.gray2;
        for (let i = 0; i < Piano.KeysPerOctave * Piano.MaxOctave; i++) {
            ctx.fillRect(i * this.whiteKeyWidth + 1, wkh + 2, this.whiteKeyWidth - 2, Math.floor(bb / 2));
        }
        ctx.restore();
    }
    drawNoteLetters(ctx) {
        const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const numbers = ['1', '3', '5', '6', '8', '10', '12'];
        const names = this.showNoteLetters === NoteNameLetter
            ? letters
            : this.showNoteLetters === NoteNameFixedNumber ? numbers : null;
        if (!names)
            return;
        ctx.save();
        ctx.translate(this.margin + this.blackBorder, this.margin + this.blackBorder);
        ctx.fillStyle = 'white';
        ctx.font = `${Math.floor(this.whiteKeyWidth * 0.7)}px sans-serif`;
        ctx.textAlign = 'center';
        for (let octave = 0; octave < Piano.MaxOctave; octave++) {
            for (let i = 0; i < Piano.KeysPerOctave; i++) {
                const x = (octave * Piano.KeysPerOctave + i) * this.whiteKeyWidth + Math.floor(this.whiteKeyWidth / 2);
                ctx.fillText(names[i], x, this.whiteKeyHeight + this.blackBorder + 4);
            }
        }
        ctx.restore();
    }
    shadeOneNote(ctx, notenumber, color) {
        let octave = Math.floor(notenumber / 12) - 2;
        const notescale = notenumber % 12;
        if (octave < 0 || octave >= Piano.MaxOctave)
            return;
        ctx.save();
        ctx.translate(octave * this.whiteKeyWidth * Piano.KeysPerOctave, 0);
        ctx.fillStyle = color;
        const bkh = this.blackKeyHeight;
        const wkh = this.whiteKeyHeight;
        const bottomH = wkh - (bkh + 3);
        const bk = this.blackKeyOffsets;
        const wkw = this.whiteKeyWidth;
        const bkw = this.blackKeyWidth;
        let x1, x2, x3;
        const isGray = (color === this.gray1);
        switch (notescale) {
            case 0: // C
                x1 = 2;
                x2 = bk[0] - 2;
                ctx.fillRect(x1, 0, x2 - x1, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 1: // C#
                x1 = bk[0];
                x2 = bk[1];
                ctx.fillRect(x1, 0, x2 - x1, bkh);
                if (isGray) {
                    ctx.fillStyle = this.gray2;
                    ctx.fillRect(x1 + 1, bkh - Math.floor(bkh / 8), bkw - 2, Math.floor(bkh / 8));
                }
                break;
            case 2: // D
                x1 = wkw + 2;
                x2 = bk[1] + 3;
                x3 = bk[2] - 2;
                ctx.fillRect(x2, 0, x3 - x2, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 3: // D#
                x1 = bk[2];
                x2 = bk[3];
                ctx.fillRect(x1, 0, bkw, bkh);
                if (isGray) {
                    ctx.fillStyle = this.gray2;
                    ctx.fillRect(x1 + 1, bkh - Math.floor(bkh / 8), bkw - 2, Math.floor(bkh / 8));
                }
                break;
            case 4: // E
                x1 = wkw * 2 + 2;
                x2 = bk[3] + 3;
                x3 = wkw * 3 - 1;
                ctx.fillRect(x2, 0, x3 - x2, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 5: // F
                x1 = wkw * 3 + 2;
                x2 = bk[4] - 2;
                ctx.fillRect(x1, 0, x2 - x1, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 6: // F#
                x1 = bk[4];
                x2 = bk[5];
                ctx.fillRect(x1, 0, bkw, bkh);
                if (isGray) {
                    ctx.fillStyle = this.gray2;
                    ctx.fillRect(x1 + 1, bkh - Math.floor(bkh / 8), bkw - 2, Math.floor(bkh / 8));
                }
                break;
            case 7: // G
                x1 = wkw * 4 + 2;
                x2 = bk[5] + 3;
                x3 = bk[6] - 2;
                ctx.fillRect(x2, 0, x3 - x2, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 8: // G#
                x1 = bk[6];
                x2 = bk[7];
                ctx.fillRect(x1, 0, bkw, bkh);
                if (isGray) {
                    ctx.fillStyle = this.gray2;
                    ctx.fillRect(x1 + 1, bkh - Math.floor(bkh / 8), bkw - 2, Math.floor(bkh / 8));
                }
                break;
            case 9: // A
                x1 = wkw * 5 + 2;
                x2 = bk[7] + 3;
                x3 = bk[8] - 2;
                ctx.fillRect(x2, 0, x3 - x2, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
            case 10: // A#
                x1 = bk[8];
                x2 = bk[9];
                ctx.fillRect(x1, 0, bkw, bkh);
                if (isGray) {
                    ctx.fillStyle = this.gray2;
                    ctx.fillRect(x1 + 1, bkh - Math.floor(bkh / 8), bkw - 2, Math.floor(bkh / 8));
                }
                break;
            case 11: // B
                x1 = wkw * 6 + 2;
                x2 = bk[9] + 3;
                x3 = wkw * Piano.KeysPerOctave - 1;
                ctx.fillRect(x2, 0, x3 - x2, bkh + 3);
                ctx.fillRect(x1, bkh + 3, wkw - 3, bottomH);
                break;
        }
        ctx.restore();
    }
    findClosestStartTime(pulseTime) {
        let left = 0;
        let right = this.notes.length - 1;
        while (right - left > 1) {
            const i = Math.floor((right + left) / 2);
            if (this.notes[left].getStartTime() === pulseTime)
                break;
            else if (this.notes[i].getStartTime() <= pulseTime)
                left = i;
            else
                right = i;
        }
        while (left >= 1 && this.notes[left - 1].getStartTime() === this.notes[left].getStartTime())
            left--;
        return left;
    }
    nextStartTimeSameTrack(i) {
        const start = this.notes[i].getStartTime();
        let end = this.notes[i].getEndTime();
        const track = this.notes[i].getChannel();
        let j = i;
        while (j < this.notes.length) {
            if (this.notes[j].getChannel() !== track) {
                j++;
                continue;
            }
            if (this.notes[j].getStartTime() > start)
                return this.notes[j].getStartTime();
            end = Math.max(end, this.notes[j].getEndTime());
            j++;
        }
        return end;
    }
    nextStartTime(i) {
        const start = this.notes[i].getStartTime();
        let end = this.notes[i].getEndTime();
        let j = i;
        while (j < this.notes.length) {
            if (this.notes[j].getStartTime() > start)
                return this.notes[j].getStartTime();
            end = Math.max(end, this.notes[j].getEndTime());
            j++;
        }
        return end;
    }
    colorToCSS(packed) {
        const r = (packed >> 16) & 0xFF;
        const g = (packed >> 8) & 0xFF;
        const b = packed & 0xFF;
        return `rgb(${r},${g},${b})`;
    }
    /** Shade the piano notes on the given canvas context.
     *  ctx should be translated to the top-left of the piano.
     */
    ShadeNotes(ctx, currentPulseTime, prevPulseTime) {
        if (this.notes.length === 0)
            return;
        ctx.save();
        ctx.translate(this.margin + this.blackBorder, this.margin + this.blackBorder);
        const lastShadedIndex = this.findClosestStartTime(prevPulseTime - this.maxShadeDuration * 2);
        for (let i = lastShadedIndex; i < this.notes.length; i++) {
            const start = this.notes[i].getStartTime();
            const end_raw = this.notes[i].getEndTime();
            const notenumber = this.notes[i].getNumber();
            const nextStart = this.nextStartTime(i);
            const nextStartTrack = this.nextStartTimeSameTrack(i);
            let end = Math.max(end_raw, nextStartTrack);
            end = Math.min(end, start + this.maxShadeDuration - 1);
            if (start > prevPulseTime && start > currentPulseTime)
                break;
            if (start <= currentPulseTime && currentPulseTime < nextStart && currentPulseTime < end &&
                start <= prevPulseTime && prevPulseTime < nextStart && prevPulseTime < end)
                break;
            if (start <= currentPulseTime && currentPulseTime < end) {
                if (this.useTwoColors && this.notes[i].getChannel() === 1) {
                    this.shadeOneNote(ctx, notenumber, this.colorToCSS(this.shade2));
                }
                else {
                    this.shadeOneNote(ctx, notenumber, this.colorToCSS(this.shade1));
                }
            }
            else if (start <= prevPulseTime && prevPulseTime < end) {
                const num = notenumber % 12;
                if (num === 1 || num === 3 || num === 6 || num === 8 || num === 10) {
                    this.shadeOneNote(ctx, notenumber, this.gray1);
                }
                else {
                    this.shadeOneNote(ctx, notenumber, 'white');
                }
            }
        }
        ctx.restore();
    }
    ShadeOneNotePublic(ctx, notenumber, color) {
        ctx.save();
        ctx.translate(this.margin + this.blackBorder, this.margin + this.blackBorder);
        this.shadeOneNote(ctx, notenumber, color);
        ctx.restore();
    }
    UnShadeOneNote(ctx, notenumber) {
        ctx.save();
        ctx.translate(this.margin + this.blackBorder, this.margin + this.blackBorder);
        const num = notenumber % 12;
        if (num === 1 || num === 3 || num === 6 || num === 8 || num === 10) {
            this.shadeOneNote(ctx, notenumber, this.gray1);
        }
        else {
            this.shadeOneNote(ctx, notenumber, 'white');
        }
        ctx.restore();
    }
}
