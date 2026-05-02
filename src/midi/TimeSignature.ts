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
   * Uses the same integer-fraction thresholds as the Java implementation.
   */
  GetNoteDuration(duration: number): NoteDuration {
    const whole = this.quarter * 4;
    if (duration >= 28 * whole / 32) return NoteDuration.Whole;
    if (duration >= 20 * whole / 32) return NoteDuration.DottedHalf;
    if (duration >= 14 * whole / 32) return NoteDuration.Half;
    if (duration >= 10 * whole / 32) return NoteDuration.DottedQuarter;
    if (duration >=  7 * whole / 32) return NoteDuration.Quarter;
    if (duration >=  5 * whole / 32) return NoteDuration.DottedEighth;
    if (duration >=  6 * whole / 64) return NoteDuration.Eighth;
    if (duration >=  5 * whole / 64) return NoteDuration.Triplet;
    if (duration >=  3 * whole / 64) return NoteDuration.Sixteenth;
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
      case NoteDuration.Triplet:       return Math.floor(this.quarter / 3);
      case NoteDuration.DottedEighth:  return Math.round(this.quarter * 3 / 4);
      case NoteDuration.Eighth:        return eighth;
      case NoteDuration.Sixteenth:     return sixteenth;
      case NoteDuration.ThirtySecond:  return thirtySecond;
      default: return thirtySecond;
    }
  }

  /**
   * Align a note start time to the nearest sixteenth-note grid boundary
   * (using floor division, matching the Java implementation).
   */
  alignNote(startTime: number): number {
    const sixteenth = Math.floor(this.quarter / 4);
    if (sixteenth <= 0) return startTime;
    return Math.floor(startTime / sixteenth) * sixteenth;
  }

  /**
   * Return the beat position within the current measure as a float.
   * A value of 0.0 means the start of the measure; 1.0 means the second beat, etc.
   * Uses the same beat unit as the Java implementation (accounts for denominator).
   */
  getBeatInMeasure(startTime: number): number {
    let beat: number;
    if (this.denominator < 4) {
      beat = this.quarter * 2;
    } else {
      beat = Math.floor(this.quarter / (this.denominator / 4));
    }
    const posInMeasure = startTime % this.measure;
    return posInMeasure / beat;
  }

  toString(): string {
    return `TimeSignature numerator=${this.numerator} denominator=${this.denominator} quarter=${this.quarter} tempo=${this.tempo}`;
  }
}
