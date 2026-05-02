/** Represents a single note parsed from a MIDI track. */
export class MidiNote {
    starttime;
    channel;
    notenumber;
    duration;
    soundingDuration = 0;
    tiedToNext = false;
    tiedToPrev = false;
    constructor(starttime, channel, notenumber, duration) {
        this.starttime = starttime;
        this.channel = channel;
        this.notenumber = notenumber;
        this.duration = duration;
    }
    getStartTime() { return this.starttime; }
    setStartTime(value) { this.starttime = value; }
    getChannel() { return this.channel; }
    setChannel(value) { this.channel = value; }
    getNumber() { return this.notenumber; }
    setNumber(value) { this.notenumber = value; }
    getDuration() { return this.duration; }
    setDuration(value) { this.duration = value; }
    getSoundingDuration() { return this.soundingDuration; }
    setSoundingDuration(value) { this.soundingDuration = value; }
    isTiedToNext() { return this.tiedToNext; }
    setTiedToNext(value) { this.tiedToNext = value; }
    isTiedToPrev() { return this.tiedToPrev; }
    setTiedToPrev(value) { this.tiedToPrev = value; }
    /** Return the end time of this note (starttime + duration). */
    getEndTime() { return this.starttime + this.duration; }
    /** Turn off this note by setting its duration. */
    NoteOff(endtime) {
        this.duration = endtime - this.starttime;
    }
    Clone() {
        const n = new MidiNote(this.starttime, this.channel, this.notenumber, this.duration);
        n.soundingDuration = this.soundingDuration;
        n.tiedToNext = this.tiedToNext;
        n.tiedToPrev = this.tiedToPrev;
        return n;
    }
    /** Comparator: sort by starttime, then by note number. */
    static compare(x, y) {
        if (x.getStartTime() !== y.getStartTime())
            return x.getStartTime() - y.getStartTime();
        return x.getNumber() - y.getNumber();
    }
    toString() {
        return `MidiNote channel=${this.channel} number=${this.notenumber} start=${this.starttime} dur=${this.duration}`;
    }
}
