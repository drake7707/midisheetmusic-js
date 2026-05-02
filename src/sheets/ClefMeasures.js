import { Clef } from './Clef';
import { WhiteNote } from './WhiteNote';
/** Reports which Clef (Treble or Bass) a given measure uses for a single track. */
export class ClefMeasures {
    clefs;
    measure;
    constructor(notes, measurelen) {
        this.measure = measurelen;
        const mainclef = ClefMeasures.MainClef(notes);
        let nextmeasure = measurelen;
        let pos = 0;
        let clef = mainclef;
        this.clefs = [];
        while (pos < notes.length) {
            let sumnotes = 0;
            let notecount = 0;
            while (pos < notes.length && notes[pos].getStartTime() < nextmeasure) {
                sumnotes += notes[pos].getNumber();
                notecount++;
                pos++;
            }
            if (notecount === 0)
                notecount = 1;
            const avgnote = Math.floor(sumnotes / notecount);
            if (avgnote === 0) {
                // keep previous clef
            }
            else if (avgnote >= WhiteNote.BottomTreble.getNumber()) {
                clef = Clef.Treble;
            }
            else if (avgnote <= WhiteNote.TopBass.getNumber()) {
                clef = Clef.Bass;
            }
            else {
                clef = mainclef;
            }
            this.clefs.push(clef);
            nextmeasure += measurelen;
        }
        this.clefs.push(clef);
    }
    GetClef(starttime) {
        const idx = Math.floor(starttime / this.measure);
        if (idx >= this.clefs.length)
            return this.clefs[this.clefs.length - 1];
        return this.clefs[idx];
    }
    static MainClef(notes) {
        if (notes.length === 0)
            return Clef.Treble;
        const middleC = WhiteNote.MiddleC.getNumber();
        let total = 0;
        for (const m of notes)
            total += m.getNumber();
        return (Math.floor(total / notes.length) >= middleC) ? Clef.Treble : Clef.Bass;
    }
}
