/**
 * MidiPlayer.ts — TypeScript port of MidiPlayer.java
 * Plays MIDI files using Tone.js for audio output and handles play/pause/stop/
 * rewind/fastforward, note shading, and speed control.
 */

import { MidiFile } from '@/midi/MidiFile';
import type { MidiOptions } from '@/midi/MidiFile';
import type { SheetMusic } from '@/midi/SheetMusic';
import type { Piano } from '@/midi/Piano';
import { ImmediateScroll, GradualScroll, DontScroll } from '@/midi/SheetMusic';
import { getTransport, PolySynth, Synth, Part, start as toneStart } from 'tone';

/** MIDI note number → frequency in Hz (standard formula) */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const PlayerState = {
  Stopped:   1,
  Playing:   2,
  Paused:    3,
  InitStop:  4,
  InitPause: 5,
  Midi:      6,
} as const;

export type PlayerStateValue = typeof PlayerState[keyof typeof PlayerState];

export class MidiPlayer {
  private midifile:    MidiFile   | null = null;
  private options:     MidiOptions | null = null;
  private sheet:       SheetMusic  | null = null;
  private piano:       Piano       | null = null;

  playstate: PlayerStateValue = PlayerState.Stopped;

  private synths: PolySynth[] = [];
  private tonePart: Part | null = null;
  private startTime:       number = 0;       // performance.now() when audio started
  private startPulseTime:  number = 0;
  private currentPulseTime: number = 0;
  private prevPulseTime:   number = -10;
  private pulsesPerMsec:   number = 0;

  private timerHandle:     number | null = null;
  private reshadeHandle:   number | null = null;

  private speedPercent: number = 100;   // 10..200
  private doPlayFromLoopEnd = false;

  private countInBeatIndex       = 0;
  private countInTotalBeats      = 0;
  private countInBeatsPerMeasure = 0;
  private countInBeatDurationMs  = 0;
  private countInStartTime       = 0;
  private audioCtx: AudioContext | null = null;

  SetPiano(p: Piano): void {
    this.piano = p;
  }

  SetMidiFile(file: MidiFile, opt: MidiOptions, s: SheetMusic): void {
    if (file === this.midifile && this.midifile !== null && this.playstate === PlayerState.Paused) {
      this.options = opt;
      this.sheet = s;
      if (this._redrawFn) this._redrawFn();
      this.sheet.ShadeNotes(this._sheetCtx()!, this.currentPulseTime, -1);
      this.clearTimer();
      this.reshadeHandle = window.setTimeout(() => this.reShade(), 500);
    } else {
      this.Reset();
      this.midifile = file;
      this.options  = opt;
      this.sheet    = s;
      this.scrollToStart();
    }
  }

  getPlayState():        PlayerStateValue { return this.playstate; }
  isPlaying():           boolean           { return this.playstate === PlayerState.Playing; }
  isInMidiMode():        boolean           { return this.playstate === PlayerState.Midi; }
  getCurrentPulseTime(): number            { return this.currentPulseTime; }
  getSpeedPercent():     number            { return this.speedPercent; }
  setSpeedPercent(s: number): void         { this.speedPercent = Math.max(10, Math.min(200, s)); }
  getCurrentMeasure(): number {
    if (!this.midifile || !this.options) return 0;
    const ts = this.options.time ?? this.midifile.getTime();
    return Math.floor(this.currentPulseTime / ts.getMeasure());
  }

  // ---- Playback controls ----

  Play(): void {
    if (!this.midifile || !this.sheet || this.numberTracks() === 0) return;
    if (this.playstate === PlayerState.InitStop || this.playstate === PlayerState.InitPause ||
        this.playstate === PlayerState.Playing) return;
    this.clearTimer();
    this.doPlayFromLoopEnd = false;
    this.doPlay();
  }

  Pause(): void {
    if (!this.midifile || !this.sheet || this.numberTracks() === 0) return;
    this.clearPendingPlay();
    if (this.playstate === PlayerState.Playing) this.playstate = PlayerState.InitPause;
    else if (this.playstate === PlayerState.Midi) this.playstate = PlayerState.Paused;
  }

  PlayPause(): void {
    if (this.playstate === PlayerState.Playing) this.Pause();
    else if (this.playstate === PlayerState.Stopped || this.playstate === PlayerState.Paused) this.Play();
  }

  Reset(): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate === PlayerState.Stopped) {
      this.removeShading();
      this.scrollToStart();
    } else if (this.playstate === PlayerState.Paused) {
      this.doStop();
    } else {
      this.playstate = PlayerState.InitStop;
      this.doStop();
    }
  }

  Rewind(): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped) return;
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.currentPulseTime);
    this.prevPulseTime = this.currentPulseTime;
    const ts = this.options?.time ?? this.midifile.getTime();
    const measureLen = ts.getMeasure();
    let measure = Math.floor(this.currentPulseTime / measureLen);
    measure = Math.max(0, measure - 1);
    let pt = measure * measureLen;
    if (pt < 0) { pt = 0; this.prevPulseTime = -10; }
    else if (pt < (this.options?.shifttime ?? 0)) pt = this.options?.shifttime ?? 0;
    const currNote = this.sheet.getCurrentNote(pt, ts);
    if (currNote) pt = currNote.getStartTime();
    this.currentPulseTime = pt;
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  FastForward(): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped) return;
    this.playstate = PlayerState.Paused;
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.currentPulseTime);
    this.prevPulseTime = this.currentPulseTime;
    const ts = this.options?.time ?? this.midifile.getTime();
    const measureLen = ts.getMeasure();
    const measure = Math.floor(this.currentPulseTime / measureLen);
    const newPt = (measure + 1) * measureLen;
    if (newPt <= this.midifile.getTotalPulses()) this.currentPulseTime = newPt;
    const currNote = this.sheet.getCurrentNote(this.currentPulseTime, ts);
    if (currNote) this.currentPulseTime = currNote.getStartTime();
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  NextNote(): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped) return;
    const ts = this.options?.time ?? this.midifile.getTime();
    const curr = this.sheet.getCurrentNote(this.currentPulseTime, ts);
    if (!curr) return;
    let newPt: number;
    if (curr.getStartTime() > this.currentPulseTime) {
      newPt = curr.getStartTime();
    } else {
      const next = this.sheet.getCurrentNote(curr.getStartTime() + 1, ts);
      if (!next) return;
      newPt = next.getStartTime();
    }
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.currentPulseTime);
    this.prevPulseTime = this.currentPulseTime;
    this.currentPulseTime = newPt;
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  PrevNote(): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped) return;
    const prev = this.sheet.getPrevNote(this.currentPulseTime);
    if (!prev) return;
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.currentPulseTime);
    this.prevPulseTime = this.currentPulseTime;
    this.currentPulseTime = prev.getStartTime();
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  SpeedUp():   void { this.speedPercent = Math.min(200, this.speedPercent + 10); if (this.isPlaying()) this.restartWithNewSpeed(); }
  SpeedDown(): void { this.speedPercent = Math.max(10,  this.speedPercent - 10); if (this.isPlaying()) this.restartWithNewSpeed(); }

  SetLoopStart(): void {
    if (!this.midifile || !this.options) return;
    this.options.playMeasuresInLoopStart = this.getCurrentMeasure();
    if (this.options.playMeasuresInLoopStart > this.options.playMeasuresInLoopEnd)
      this.options.playMeasuresInLoopEnd = this.options.playMeasuresInLoopStart;
  }
  SetLoopEnd(): void {
    if (!this.midifile || !this.options) return;
    this.options.playMeasuresInLoopEnd = this.getCurrentMeasure();
    if (this.options.playMeasuresInLoopStart > this.options.playMeasuresInLoopEnd)
      this.options.playMeasuresInLoopStart = this.options.playMeasuresInLoopEnd;
  }
  ToggleLoop(): void { if (this.options) this.options.playMeasuresInLoop = !this.options.playMeasuresInLoop; }

  MoveToClicked(x: number, y: number): void {
    if (!this.midifile || !this.sheet) return;
    if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped && this.playstate !== PlayerState.Midi) return;
    if (this.playstate !== PlayerState.Midi) this.playstate = PlayerState.Paused;
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.currentPulseTime);
    this.currentPulseTime = this.sheet.PulseTimeForPoint(x, y);
    this.prevPulseTime = this.currentPulseTime - (this.midifile.getTime().getMeasure());
    if (this.currentPulseTime > this.midifile.getTotalPulses())
      this.currentPulseTime -= this.midifile.getTime().getMeasure();
    const ts = this.options?.time ?? this.midifile.getTime();
    const chord = this.sheet.getCurrentNote(this.currentPulseTime, ts);
    if (chord) this.currentPulseTime = chord.getStartTime();
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, DontScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  cleanup(): void {
    this.clearTimer();
    this.clearPendingPlay();
    getTransport().stop();
    this.disposeToneAudio();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.playstate = PlayerState.Stopped;
  }

  reshadeSheet(): void {
    if (!this.sheet) return;
    const ctx = this._sheetCtx();
    if (!ctx) return;
    this.sheet.ShadeNotes(ctx, this.currentPulseTime, this.prevPulseTime);
  }

  // ---- Internal ----

  private numberTracks(): number {
    if (!this.options) return 0;
    return this.options.mute.filter(m => !m).length;
  }

  private doPlay(): void {
    if (!this.midifile || !this.options) return;
    const opts = this.options;
    const ts = opts.time ?? this.midifile.getTime();
    const shifttime = opts.shifttime;

    if (opts.playMeasuresInLoop) {
      const measure = Math.floor(this.currentPulseTime / ts.getMeasure());
      if (measure < opts.playMeasuresInLoopStart || measure > opts.playMeasuresInLoopEnd) {
        this.currentPulseTime = opts.playMeasuresInLoopStart * ts.getMeasure();
      }
      this.startPulseTime = this.currentPulseTime;
      opts.pauseTime = Math.floor(this.currentPulseTime - shifttime);
      if (!this.doPlayFromLoopEnd && this.currentPulseTime <= shifttime) {
        const countInPulses = opts.countInMeasures * ts.getMeasure();
        this.startPulseTime = shifttime - countInPulses;
        this.currentPulseTime = shifttime - countInPulses;
        this.prevPulseTime = shifttime - countInPulses - this.midifile.getTime().getQuarter();
      }
    } else if (this.playstate === PlayerState.Paused) {
      const countInPulses = opts.countInMeasures * ts.getMeasure();
      if (opts.countInMeasures > 0 && this.currentPulseTime <= shifttime) {
        opts.pauseTime = 0;
        this.startPulseTime   = shifttime - countInPulses;
        this.currentPulseTime = shifttime - countInPulses;
        this.prevPulseTime    = shifttime - countInPulses - this.midifile.getTime().getQuarter();
      } else {
        this.startPulseTime = this.currentPulseTime;
        opts.pauseTime = Math.floor(this.currentPulseTime - shifttime);
      }
    } else {
      opts.pauseTime = 0;
      const countInPulses = opts.countInMeasures * ts.getMeasure();
      this.startPulseTime   = shifttime - countInPulses;
      this.currentPulseTime = shifttime - countInPulses;
      this.prevPulseTime    = shifttime - countInPulses - this.midifile.getTime().getQuarter();
    }

    this.createMidiAudio();
    this.playstate = PlayerState.Playing;

    if (opts.countInMeasures > 0 && opts.pauseTime === 0 && !this.doPlayFromLoopEnd) {
      this.countInBeatsPerMeasure = ts.getNumerator();
      this.countInTotalBeats      = opts.countInMeasures * this.countInBeatsPerMeasure;
      this.countInBeatDurationMs  = Math.floor(ts.getMeasure() / this.countInBeatsPerMeasure / this.pulsesPerMsec);
      this.countInBeatIndex       = 0;
      this.countInStartTime       = performance.now();
      this.scheduleCountInBeat();
    } else {
      this.playAudio();
    }

    this.startTime = performance.now();
    this.clearTimer();
    this.timerHandle = window.setInterval(() => this.timerCallback(), 100);
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, GradualScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  private scheduleCountInBeat(): void {
    if (this.playstate !== PlayerState.Playing) return;
    const isAccented = (this.countInBeatIndex % this.countInBeatsPerMeasure === 0);
    this.playClickBeat(isAccented);
    this.countInBeatIndex++;
    if (this.countInBeatIndex < this.countInTotalBeats) {
      const nextMs = this.countInStartTime + this.countInBeatIndex * this.countInBeatDurationMs;
      const delay  = Math.max(0, nextMs - performance.now());
      window.setTimeout(() => this.scheduleCountInBeat(), delay);
    } else {
      const midiStartMs = this.countInStartTime + this.countInTotalBeats * this.countInBeatDurationMs;
      const delay = Math.max(0, midiStartMs - performance.now());
      window.setTimeout(() => this.playAudio(), delay);
    }
  }

  private playClickBeat(isAccented: boolean): void {
    if (!this.audioCtx) {
      try { this.audioCtx = new AudioContext(); } catch { return; }
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.frequency.value = isAccented ? 880 : 660;
    gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  private createMidiAudio(): void {
    if (!this.midifile || !this.options) return;
    const inverseTempo = 1.0 / this.midifile.getTime().getTempo();
    const inverseTmpoScaled = inverseTempo * this.speedPercent / 100.0;
    this.options.tempo = Math.round(1.0 / inverseTmpoScaled);
    this.pulsesPerMsec = this.midifile.getTime().getQuarter() * (1000.0 / this.options.tempo);

    // Dispose any previous Tone.js resources
    this.disposeToneAudio();

    // Get notes using the same data as the visual display
    const tracks = this.midifile.ChangeMidiNotes(this.options);
    const pulsesPerSec = this.pulsesPerMsec * 1000;

    // One PolySynth per track, capped for typical piano pieces to reduce CPU usage.
    // Most MIDI files relevant to this app are piano arrangements with ≤ 2 voices.
    const MAX_POLYPHONY_SYNTHS = 2;
    const numSynths = Math.max(1, Math.min(tracks.length, MAX_POLYPHONY_SYNTHS));
    for (let i = 0; i < numSynths; i++) {
      const synth = new PolySynth(Synth, {
        oscillator: { type: 'triangle' as const },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
      });
      synth.toDestination();
      this.synths.push(synth);
    }

    // Build note events starting from startPulseTime
    type NoteEvent = { time: number; note: number; duration: number; track: number };
    const events: NoteEvent[] = [];
    for (let trackIdx = 0; trackIdx < tracks.length; trackIdx++) {
      if (this.options.mute[trackIdx]) continue;
      const notes = tracks[trackIdx].getNotes();
      for (const note of notes) {
        const noteStart = note.getStartTime();
        if (noteStart < this.startPulseTime) continue;
        const startSec = (noteStart - this.startPulseTime) / pulsesPerSec;
        const durSec = Math.max(0.05, note.getDuration() / pulsesPerSec);
        events.push({ time: startSec, note: note.getNumber(), duration: durSec, track: trackIdx });
      }
    }

    // Schedule all notes via a Tone.Part
    if (events.length > 0) {
      const synthsRef = this.synths;
      this.tonePart = new Part<NoteEvent>((time, value) => {
        const synthIdx = Math.min(value.track, synthsRef.length - 1);
        synthsRef[synthIdx].triggerAttackRelease(midiToFreq(value.note), value.duration, time, 0.7);
      }, events);
      this.tonePart.start(0);
    }

    // Reset transport so it starts from 0 on playAudio()
    getTransport().stop();
    getTransport().position = 0;
  }

  private disposeToneAudio(): void {
    if (this.tonePart) {
      try { this.tonePart.stop(0); this.tonePart.dispose(); } catch { /* ignore */ }
      this.tonePart = null;
    }
    for (const s of this.synths) {
      try { s.releaseAll(); s.dispose(); } catch { /* ignore */ }
    }
    this.synths = [];
  }

  private playAudio(): void {
    toneStart().catch(() => {});
    getTransport().start();
    this.startTime = performance.now();
  }

  private stopAudio(): void {
    getTransport().pause();
    for (const s of this.synths) {
      try { s.releaseAll(); } catch { /* ignore */ }
    }
  }

  private timerCallback(): void {
    if (!this.midifile || !this.sheet) { this.playstate = PlayerState.Stopped; return; }

    if (this.playstate === PlayerState.Stopped || this.playstate === PlayerState.Paused) return;
    if (this.playstate === PlayerState.InitStop) return;

    if (this.playstate === PlayerState.Playing) {
      const msec = performance.now() - this.startTime;
      this.prevPulseTime    = this.currentPulseTime;
      this.currentPulseTime = this.startPulseTime + msec * this.pulsesPerMsec;

      if (this.options?.playMeasuresInLoop) {
        const nearEnd = this.currentPulseTime + this.pulsesPerMsec * 10;
        const ts = this.options.time ?? this.midifile.getTime();
        const measure = Math.floor(nearEnd / ts.getMeasure());
        if (measure > this.options.playMeasuresInLoopEnd) {
          this.restartPlayMeasuresInLoop();
          return;
        }
      }

      if (this.currentPulseTime > this.midifile.getTotalPulses()) {
        this.doStop();
        return;
      }

      this._shadeNotes(this.currentPulseTime, this.prevPulseTime, GradualScroll);
      this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    } else if (this.playstate === PlayerState.InitPause) {
      const msec = performance.now() - this.startTime;
      this.stopAudio();
      this.prevPulseTime    = this.currentPulseTime;
      this.currentPulseTime = this.startPulseTime + msec * this.pulsesPerMsec;
      this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
      this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
      this.playstate = PlayerState.Paused;
      this.clearTimer();
      this.reshadeHandle = window.setTimeout(() => this.reShade(), 1000);
    }
  }

  private reShade(): void {
    if (this.playstate === PlayerState.Paused || this.playstate === PlayerState.Stopped) {
      this._shadeNotes(this.currentPulseTime, -10, ImmediateScroll);
      this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
  }

  private doStop(): void {
    this.playstate = PlayerState.Stopped;
    this.clearTimer();
    this.removeShading();
    this.scrollToStart();
    getTransport().stop();
    this.disposeToneAudio();
  }

  private removeShading(): void {
    this._shadeNotes(-10, this.prevPulseTime, DontScroll);
    this._shadeNotes(-10, this.currentPulseTime, DontScroll);
    this._shadeNotePiano(-10, this.prevPulseTime);
    this._shadeNotePiano(-10, this.currentPulseTime);
  }

  private scrollToStart(): void {
    if (!this.midifile || !this.options) return;
    const ts = this.options.time ?? this.midifile.getTime();
    this.startPulseTime = this.options.playMeasuresInLoop
      ? this.options.playMeasuresInLoopStart * ts.getMeasure() : 0;
    this.currentPulseTime = this.startPulseTime;
    this.prevPulseTime = -10;
    this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
    this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
  }

  private restartPlayMeasuresInLoop(): void {
    this.playstate = PlayerState.Stopped;
    this._shadeNotePiano(-10, this.prevPulseTime);
    this._shadeNotes(-10, this.prevPulseTime, DontScroll);
    this.currentPulseTime = 0;
    this.prevPulseTime = -1;
    this.stopAudio();
    this.doPlayFromLoopEnd = true;
    window.setTimeout(() => this.doPlay(), 0);
  }

  private restartWithNewSpeed(): void {
    const msec = performance.now() - this.startTime;
    this.currentPulseTime = this.startPulseTime + msec * this.pulsesPerMsec;
    this.clearTimer();
    this.stopAudio();
    this.startPulseTime = this.currentPulseTime;
    this.options!.pauseTime = Math.floor(this.currentPulseTime - (this.options!.shifttime));
    this.createMidiAudio();
    this.startTime = performance.now();
    this.playAudio();
    this.timerHandle = window.setInterval(() => this.timerCallback(), 100);
  }

  private clearTimer(): void {
    if (this.timerHandle !== null) { window.clearInterval(this.timerHandle); this.timerHandle = null; }
    if (this.reshadeHandle !== null) { window.clearTimeout(this.reshadeHandle); this.reshadeHandle = null; }
  }

  private clearPendingPlay(): void {
    // Nothing specific; count-in uses timeout chains and will stop because playstate changes
  }

  // ---- Sheet/Piano shading helpers ----
  // The Vue component sets these via setSheetCtxProvider / setPianoCtxProvider

  private _sheetCtxProvider: (() => CanvasRenderingContext2D | null) | null = null;
  private _pianoCtxProvider:  (() => CanvasRenderingContext2D | null) | null = null;
  private _scrollFn: ((x: number, y: number, immediate: boolean) => void) | null = null;
  private _redrawFn: (() => void) | null = null;

  setSheetCtxProvider(fn: () => CanvasRenderingContext2D | null): void { this._sheetCtxProvider = fn; }
  setPianoCtxProvider(fn: () => CanvasRenderingContext2D | null): void { this._pianoCtxProvider = fn; }
  setScrollFn(fn: (x: number, y: number, immediate: boolean) => void): void { this._scrollFn = fn; }
  setRedrawFn(fn: () => void): void { this._redrawFn = fn; }

  private _sheetCtx(): CanvasRenderingContext2D | null {
    return this._sheetCtxProvider ? this._sheetCtxProvider() : null;
  }
  private _pianoCtx(): CanvasRenderingContext2D | null {
    return this._pianoCtxProvider ? this._pianoCtxProvider() : null;
  }

  private _shadeNotes(currentPulse: number, prevPulse: number, scrollType: number): void {
    if (!this.sheet) return;
    const ctx = this._sheetCtx();
    if (!ctx) return;
    // ShadeNotes handles incremental canvas updates without a full redraw.
    // _redrawFn is only called explicitly when the sheet itself changes (e.g. in SetMidiFile).
    const { xShade, yShade } = this.sheet.ShadeNotes(ctx, currentPulse, prevPulse);
    if (currentPulse >= 0 && this._scrollFn) {
      this._scrollFn(xShade, yShade, scrollType === ImmediateScroll);
    }
  }

  private _shadeNotePiano(currentPulse: number, prevPulse: number): void {
    if (!this.piano || !this._pianoCtx()) return;
    const ctx = this._pianoCtx()!;
    this.piano.Draw(ctx);
    this.piano.ShadeNotes(ctx, currentPulse, prevPulse);
  }
}
