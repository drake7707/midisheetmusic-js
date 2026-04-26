import { NoteDuration } from './NoteDuration';

/**
 * Represents the time signature and tempo of a MIDI file.
 * Time is measured in "pulses" (ticks).
 */
export class TimeSignature {
  private numerator: number;
  private denominator: number;
  private quarter: number;   // pulses per quarter note
  private tempo: number;     // microseconds per quarter note
  private measure: number;   // pulses per measure

  constructor(numerator: number, denominator: number, quarter: number, tempo: number) {
    if (numerator === 0) throw new Error('TimeSignature numerator cannot be 0');
    this.numerator = numerator;
    this.denominator = denominator;
    this.quarter = quarter;
    this.tempo = tempo;
    // measure length in pulses = (quarternote * 4 * numerator) / denominator
    this.measure = (quarter * 4 * numerator) / denominator;
  }

  getNumerator(): number { return this.numerator; }
  getDenominator(): number { return this.denominator; }
  getQuarter(): number { return this.quarter; }
  getTempo(): number { return this.tempo; }
  getMeasure(): number { return this.measure; }

  /** Return the measure number (0-based) that the given time falls in. */
  GetMeasure(time: number): number {
    return Math.floor(time / this.measure);
  }

  /**
   * Convert a pulse duration to the closest NoteDuration enum value.
   */
  GetNoteDuration(duration: number): NoteDuration {
    const whole         = this.quarter * 4;
    const half          = this.quarter * 2;
    const dottedHalf    = this.quarter * 3;
    const quarter       = this.quarter;
    const dottedQuarter = Math.round(this.quarter * 3 / 2);
    const eighth        = Math.round(this.quarter / 2);
    const dottedEighth  = Math.round(this.quarter * 3 / 4);
    const sixteenth     = Math.round(this.quarter / 4);
    const thirtySecond  = Math.round(this.quarter / 8);
    const triplet       = Math.round(this.quarter * 2 / 3);

    if (duration >= whole - sixteenth)            return NoteDuration.Whole;
    if (duration >= dottedHalf - sixteenth)       return NoteDuration.DottedHalf;
    if (duration >= half - sixteenth)             return NoteDuration.Half;
    if (duration >= dottedQuarter - sixteenth)    return NoteDuration.DottedQuarter;
    if (duration >= quarter - sixteenth)          return NoteDuration.Quarter;
    if (duration >= triplet - (thirtySecond))     return NoteDuration.Triplet;
    if (duration >= dottedEighth - thirtySecond)  return NoteDuration.DottedEighth;
    if (duration >= eighth - thirtySecond)        return NoteDuration.Eighth;
    if (duration >= sixteenth - thirtySecond)     return NoteDuration.Sixteenth;
    return NoteDuration.ThirtySecond;
  }

  /**
   * Return the duration used for the stem of a note with the given NoteDuration.
   * (Used for beaming — eighth and shorter notes have beamed stems.)
   */
  GetStemDuration(dur: NoteDuration): NoteDuration {
    if (dur === NoteDuration.DottedEighth) return NoteDuration.Eighth;
    if (dur === NoteDuration.DottedQuarter) return NoteDuration.Quarter;
    if (dur === NoteDuration.DottedHalf) return NoteDuration.Half;
    return dur;
  }

  /**
   * Convert a NoteDuration to a pulse-time length.
   */
  DurationToTime(dur: NoteDuration): number {
    const eighth        = Math.round(this.quarter / 2);
    const sixteenth     = Math.round(this.quarter / 4);
    const thirtySecond  = Math.round(this.quarter / 8);
    switch (dur) {
      case NoteDuration.Whole:         return this.quarter * 4;
      case NoteDuration.DottedHalf:    return this.quarter * 3;
      case NoteDuration.Half:          return this.quarter * 2;
      case NoteDuration.DottedQuarter: return Math.round(this.quarter * 3 / 2);
      case NoteDuration.Quarter:       return this.quarter;
      case NoteDuration.Triplet:       return Math.round(this.quarter * 2 / 3);
      case NoteDuration.DottedEighth:  return Math.round(this.quarter * 3 / 4);
      case NoteDuration.Eighth:        return eighth;
      case NoteDuration.Sixteenth:     return sixteenth;
      case NoteDuration.ThirtySecond:  return thirtySecond;
      default: return thirtySecond;
    }
  }

  /**
   * Align a note start time to the nearest 32nd-note grid boundary.
   */
  alignNote(startTime: number): number {
    const thirtySecond = Math.round(this.quarter / 8);
    if (thirtySecond <= 0) return startTime;
    return Math.round(startTime / thirtySecond) * thirtySecond;
  }

  /**
   * Return the beat position within the current measure as a float.
   * A value of 0.0 means the start of the measure; 1.0 means the second beat, etc.
   */
  getBeatInMeasure(startTime: number): number {
    const posInMeasure = startTime % this.measure;
    return posInMeasure / this.quarter;
  }

  toString(): string {
    return `TimeSignature numerator=${this.numerator} denominator=${this.denominator} quarter=${this.quarter} tempo=${this.tempo}`;
  }
}
