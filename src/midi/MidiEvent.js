/** Represents a single event parsed from a MIDI file track. */
export class MidiEvent {
    DeltaTime = 0;
    StartTime = 0;
    HasEventflag = false;
    EventFlag = 0;
    Channel = 0;
    Notenumber = 0;
    Velocity = 0;
    Instrument = 0;
    KeyPressure = 0;
    ChanPressure = 0;
    ControlNum = 0;
    ControlValue = 0;
    PitchBend = 0;
    Numerator = 0;
    Denominator = 0;
    Tempo = 0;
    Metaevent = 0;
    Metalength = 0;
    Value = new Uint8Array(0);
    Clone() {
        const m = new MidiEvent();
        m.DeltaTime = this.DeltaTime;
        m.StartTime = this.StartTime;
        m.HasEventflag = this.HasEventflag;
        m.EventFlag = this.EventFlag;
        m.Channel = this.Channel;
        m.Notenumber = this.Notenumber;
        m.Velocity = this.Velocity;
        m.Instrument = this.Instrument;
        m.KeyPressure = this.KeyPressure;
        m.ChanPressure = this.ChanPressure;
        m.ControlNum = this.ControlNum;
        m.ControlValue = this.ControlValue;
        m.PitchBend = this.PitchBend;
        m.Numerator = this.Numerator;
        m.Denominator = this.Denominator;
        m.Tempo = this.Tempo;
        m.Metaevent = this.Metaevent;
        m.Metalength = this.Metalength;
        m.Value = new Uint8Array(this.Value);
        return m;
    }
    static compare(x, y) {
        return x.StartTime - y.StartTime;
    }
}
