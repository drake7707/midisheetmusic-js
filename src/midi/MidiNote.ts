/** Represents a single note parsed from a MIDI track. */
export class MidiNote {
  private starttime: number;
  private channel: number;
  private notenumber: number;
  private duration: number;
  private soundingDuration: number = 0;
  private tiedToNext: boolean = false;
  private tiedToPrev: boolean = false;

  constructor(starttime: number, channel: number, notenumber: number, duration: number) {
    this.starttime = starttime;
    this.channel = channel;
    this.notenumber = notenumber;
    this.duration = duration;
  }

  getStartTime(): number { return this.starttime; }
  setStartTime(value: number): void { this.starttime = value; }

  getChannel(): number { return this.channel; }
  setChannel(value: number): void { this.channel = value; }

  getNumber(): number { return this.notenumber; }
  setNumber(value: number): void { this.notenumber = value; }

  getDuration(): number { return this.duration; }
  setDuration(value: number): void { this.duration = value; }

  getSoundingDuration(): number { return this.soundingDuration; }
  setSoundingDuration(value: number): void { this.soundingDuration = value; }

  isTiedToNext(): boolean { return this.tiedToNext; }
  setTiedToNext(value: boolean): void { this.tiedToNext = value; }

  isTiedToPrev(): boolean { return this.tiedToPrev; }
  setTiedToPrev(value: boolean): void { this.tiedToPrev = value; }

  /** Return the end time of this note (starttime + duration). */
  getEndTime(): number { return this.starttime + this.duration; }

  /** Turn off this note by setting its duration. */
  NoteOff(endtime: number): void {
    this.duration = endtime - this.starttime;
  }

  Clone(): MidiNote {
    const n = new MidiNote(this.starttime, this.channel, this.notenumber, this.duration);
    n.soundingDuration = this.soundingDuration;
    n.tiedToNext = this.tiedToNext;
    n.tiedToPrev = this.tiedToPrev;
    return n;
  }

  /** Comparator: sort by starttime, then by note number. */
  static compare(x: MidiNote, y: MidiNote): number {
    if (x.getStartTime() !== y.getStartTime()) return x.getStartTime() - y.getStartTime();
    return x.getNumber() - y.getNumber();
  }

  toString(): string {
    return `MidiNote channel=${this.channel} number=${this.notenumber} start=${this.starttime} dur=${this.duration}`;
  }
}
