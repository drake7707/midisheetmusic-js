import { MidiEvent } from './MidiEvent';
import { MidiNote } from './MidiNote';

// MIDI event flag constants (mirrored from MidiFile constants)
const EventNoteOff       = 0x80;
const EventNoteOn        = 0x90;
const EventProgramChange = 0xC0;
const MetaEvent          = 0xFF;
const MetaEventLyric     = 0x05;

/**
 * Represents a single track in a MIDI file, holding parsed notes and metadata.
 */
export class MidiTrack {
  private tracknum: number;
  private notes: MidiNote[];
  private instrument: number;
  private lyrics: MidiEvent[] | null;

  /** Create an empty track with the given track number. */
  constructor(tracknum: number);
  /** Create a track by parsing a list of raw MIDI events. */
  constructor(events: MidiEvent[], tracknum: number);
  constructor(eventsOrTracknum: MidiEvent[] | number, tracknumArg?: number) {
    if (typeof eventsOrTracknum === 'number') {
      this.tracknum = eventsOrTracknum;
      this.notes = [];
      this.instrument = 0;
      this.lyrics = null;
    } else {
      this.tracknum = tracknumArg!;
      this.notes = [];
      this.instrument = 0;
      this.lyrics = null;
      this.parseEvents(eventsOrTracknum);
    }
  }

  private parseEvents(events: MidiEvent[]): void {
    // pending NoteOn events awaiting a matching NoteOff: keyed by channel*128 + notenumber
    const pending = new Map<number, MidiNote>();

    for (const ev of events) {
      if (ev.EventFlag === EventNoteOn && ev.Velocity > 0) {
        const note = new MidiNote(ev.StartTime, ev.Channel, ev.Notenumber, 0);
        pending.set(ev.Channel * 128 + ev.Notenumber, note);
        this.notes.push(note);
      } else if (
        ev.EventFlag === EventNoteOff ||
        (ev.EventFlag === EventNoteOn && ev.Velocity === 0)
      ) {
        const key = ev.Channel * 128 + ev.Notenumber;
        const note = pending.get(key);
        if (note !== undefined) {
          note.NoteOff(ev.StartTime);
          pending.delete(key);
        }
      } else if (ev.EventFlag === EventProgramChange) {
        this.instrument = ev.Instrument;
      } else if (ev.EventFlag === MetaEvent && ev.Metaevent === MetaEventLyric) {
        if (this.lyrics === null) this.lyrics = [];
        this.lyrics.push(ev);
      }
    }

    // Sort notes by start time, then by note number
    this.notes.sort((a, b) => {
      if (a.getStartTime() !== b.getStartTime()) return a.getStartTime() - b.getStartTime();
      return a.getNumber() - b.getNumber();
    });

    // MIDI channel 9 is always percussion — override any program-change instrument.
    if (this.notes.some(n => n.getChannel() === 9)) {
      this.instrument = 128;
    }
  }

  trackNumber(): number { return this.tracknum; }

  getNotes(): MidiNote[] { return this.notes; }

  getInstrument(): number { return this.instrument; }
  setInstrument(value: number): void { this.instrument = value; }

  getLyrics(): MidiEvent[] | null { return this.lyrics; }
  setLyrics(value: MidiEvent[]): void { this.lyrics = value; }

  AddNote(note: MidiNote): void {
    this.notes.push(note);
  }

  /** Remove the NoteOff by setting the duration of the matching NoteOn note. */
  NoteOff(channel: number, notenumber: number, endtime: number): void {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      if (
        note.getChannel() === channel &&
        note.getNumber() === notenumber &&
        note.getDuration() === 0
      ) {
        note.NoteOff(endtime);
        return;
      }
    }
  }

  AddLyric(ev: MidiEvent): void {
    if (this.lyrics === null) this.lyrics = [];
    this.lyrics.push(ev);
  }

  Clone(): MidiTrack {
    const t = new MidiTrack(this.tracknum);
    t.instrument = this.instrument;
    t.notes = this.notes.map(n => n.Clone());
    t.lyrics = this.lyrics ? [...this.lyrics.map(l => l.Clone())] : null;
    return t;
  }

  toString(): string {
    let s = `MidiTrack tracknum=${this.tracknum} instrument=${this.instrument} notes=${this.notes.length}\n`;
    for (const note of this.notes) {
      s += `  ${note.toString()}\n`;
    }
    return s;
  }
}
