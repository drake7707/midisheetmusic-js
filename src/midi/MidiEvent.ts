/** Represents a single event parsed from a MIDI file track. */
export class MidiEvent {
  DeltaTime: number = 0;
  StartTime: number = 0;
  HasEventflag: boolean = false;
  EventFlag: number = 0;
  Channel: number = 0;
  Notenumber: number = 0;
  Velocity: number = 0;
  Instrument: number = 0;
  KeyPressure: number = 0;
  ChanPressure: number = 0;
  ControlNum: number = 0;
  ControlValue: number = 0;
  PitchBend: number = 0;
  Numerator: number = 0;
  Denominator: number = 0;
  Tempo: number = 0;
  Metaevent: number = 0;
  Metalength: number = 0;
  Value: Uint8Array = new Uint8Array(0);

  Clone(): MidiEvent {
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

  compare(x: MidiEvent, y: MidiEvent): number {
    return x.StartTime - y.StartTime;
  }
}
