import { MidiNote } from './MidiNote';
// MIDI event flag constants (mirrored from MidiFile constants)
const EventNoteOff = 0x80;
const EventNoteOn = 0x90;
const EventProgramChange = 0xC0;
const MetaEvent = 0xFF;
const MetaEventLyric = 0x05;
/**
 * Represents a single track in a MIDI file, holding parsed notes and metadata.
 */
export class MidiTrack {
    tracknum;
    notes;
    instrument;
    lyrics;
    constructor(eventsOrTracknum, tracknumArg) {
        if (typeof eventsOrTracknum === 'number') {
            this.tracknum = eventsOrTracknum;
            this.notes = [];
            this.instrument = 0;
            this.lyrics = null;
        }
        else {
            this.tracknum = tracknumArg;
            this.notes = [];
            this.instrument = 0;
            this.lyrics = null;
            this.parseEvents(eventsOrTracknum);
        }
    }
    parseEvents(events) {
        // pending NoteOn events awaiting a matching NoteOff: keyed by channel*128 + notenumber
        const pending = new Map();
        for (const ev of events) {
            if (ev.EventFlag === EventNoteOn && ev.Velocity > 0) {
                const note = new MidiNote(ev.StartTime, ev.Channel, ev.Notenumber, 0);
                pending.set(ev.Channel * 128 + ev.Notenumber, note);
                this.notes.push(note);
            }
            else if (ev.EventFlag === EventNoteOff ||
                (ev.EventFlag === EventNoteOn && ev.Velocity === 0)) {
                const key = ev.Channel * 128 + ev.Notenumber;
                const note = pending.get(key);
                if (note !== undefined) {
                    note.NoteOff(ev.StartTime);
                    pending.delete(key);
                }
            }
            else if (ev.EventFlag === EventProgramChange) {
                this.instrument = ev.Instrument;
            }
            else if (ev.EventFlag === MetaEvent && ev.Metaevent === MetaEventLyric) {
                if (this.lyrics === null)
                    this.lyrics = [];
                this.lyrics.push(ev);
            }
        }
        // Sort notes by start time, then by note number
        this.notes.sort((a, b) => {
            if (a.getStartTime() !== b.getStartTime())
                return a.getStartTime() - b.getStartTime();
            return a.getNumber() - b.getNumber();
        });
        // MIDI channel 9 is always percussion — override any program-change instrument.
        if (this.notes.some(n => n.getChannel() === 9)) {
            this.instrument = 128;
        }
    }
    trackNumber() { return this.tracknum; }
    getNotes() { return this.notes; }
    getInstrument() { return this.instrument; }
    setInstrument(value) { this.instrument = value; }
    getLyrics() { return this.lyrics; }
    setLyrics(value) { this.lyrics = value; }
    AddNote(note) {
        this.notes.push(note);
    }
    /** Remove the NoteOff by setting the duration of the matching NoteOn note. */
    NoteOff(channel, notenumber, endtime) {
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            if (note.getChannel() === channel &&
                note.getNumber() === notenumber &&
                note.getDuration() === 0) {
                note.NoteOff(endtime);
                return;
            }
        }
    }
    AddLyric(ev) {
        if (this.lyrics === null)
            this.lyrics = [];
        this.lyrics.push(ev);
    }
    Clone() {
        const t = new MidiTrack(this.tracknum);
        t.instrument = this.instrument;
        t.notes = this.notes.map(n => n.Clone());
        t.lyrics = this.lyrics ? [...this.lyrics.map(l => l.Clone())] : null;
        return t;
    }
    toString() {
        let s = `MidiTrack tracknum=${this.tracknum} instrument=${this.instrument} notes=${this.notes.length}\n`;
        for (const note of this.notes) {
            s += `  ${note.toString()}\n`;
        }
        return s;
    }
}
