/**
 * MidiPlayer.ts — TypeScript port of MidiPlayer.java
 * Plays MIDI files using the Web Audio API + WebAudioFont (GM instruments)
 * for audio output and handles play/pause/stop/rewind/fastforward, note
 * shading, and speed control.
 */
import { ImmediateScroll, GradualScroll, DontScroll } from '@/midi/SheetMusic';
export const PlayerState = {
    Stopped: 1,
    Playing: 2,
    Paused: 3,
    InitStop: 4,
    InitPause: 5,
    Midi: 6,
};
export class MidiPlayer {
    midifile = null;
    options = null;
    sheet = null;
    piano = null;
    playstate = PlayerState.Stopped;
    // ---- Audio (WebAudioFont + Web Audio API) ----
    /** Shared AudioContext – created once, never closed while the player lives. */
    wafAudioCtx = null;
    /** WebAudioFont player instance – created once per AudioContext. */
    wafPlayer = null;
    /** WebAudioFont channel (EQ + routing) used as the audio destination. */
    wafChannel = null;
    /** GM program number (0-based) → WAF global variable name for that preset. */
    wafInstrPresets = new Map();
    /** Drum MIDI note number → { variable name, natural pitch } for that hit. */
    wafDrumPresets = new Map();
    /** audioCtx.currentTime reference for the start of scheduled playback */
    wafAudioStart = 0;
    /** Chain of instrument-loading promises – always resolves, never rejects */
    wafLoadingPromise = Promise.resolve();
    /** True while WebAudioFont instrument presets are being fetched. */
    _loadingInstruments = false;
    startTime = 0; // performance.now() when playback started
    startPulseTime = 0;
    currentPulseTime = 0;
    prevPulseTime = -10;
    pulsesPerMsec = 0;
    timerHandle = null;
    reshadeHandle = null;
    speedPercent = 100; // 10..150
    doPlayFromLoopEnd = false;
    countInBeatIndex = 0;
    countInTotalBeats = 0;
    countInBeatsPerMeasure = 0;
    countInBeatDurationMs = 0;
    countInStartTime = 0;
    audioCtx = null;
    SetPiano(p) {
        this.piano = p;
    }
    SetMidiFile(file, opt, s) {
        if (file === this.midifile && this.midifile !== null && this.playstate === PlayerState.Paused) {
            this.options = opt;
            this.sheet = s;
            if (this._redrawFn)
                this._redrawFn();
            // Shade current note using whichever path is active.
            this._shadeNotes(this.currentPulseTime, -1, ImmediateScroll);
            this.clearTimer();
            this.reshadeHandle = window.setTimeout(() => this.reShade(), 500);
        }
        else {
            this.Reset();
            this.midifile = file;
            this.options = opt;
            this.sheet = s;
            this.scrollToStart();
        }
    }
    getPlayState() { return this.playstate; }
    isPlaying() { return this.playstate === PlayerState.Playing; }
    isInMidiMode() { return this.playstate === PlayerState.Midi; }
    getCurrentPulseTime() { return this.currentPulseTime; }
    getSpeedPercent() { return this.speedPercent; }
    setSpeedPercent(s) { this.speedPercent = Math.max(10, Math.min(200, s)); }
    isLoadingInstruments() { return this._loadingInstruments; }
    getCurrentMeasure() {
        if (!this.midifile || !this.options)
            return 0;
        const ts = this.options.time ?? this.midifile.getTime();
        return Math.floor(this.currentPulseTime / ts.getMeasure());
    }
    // ---- Playback controls ----
    Play() {
        if (!this.midifile || !this.sheet || this.numberTracks() === 0)
            return;
        if (this.playstate === PlayerState.InitStop || this.playstate === PlayerState.InitPause ||
            this.playstate === PlayerState.Playing)
            return;
        this.clearTimer();
        this.doPlayFromLoopEnd = false;
        this.doPlay();
    }
    Pause() {
        if (!this.midifile || !this.sheet || this.numberTracks() === 0)
            return;
        this.clearPendingPlay();
        if (this.playstate === PlayerState.Playing)
            this.playstate = PlayerState.InitPause;
        else if (this.playstate === PlayerState.Midi)
            this.playstate = PlayerState.Paused;
    }
    PlayPause() {
        if (this.playstate === PlayerState.Playing)
            this.Pause();
        else if (this.playstate === PlayerState.Stopped || this.playstate === PlayerState.Paused)
            this.Play();
    }
    Reset() {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate === PlayerState.Stopped) {
            this.removeShading();
            this.scrollToStart();
        }
        else if (this.playstate === PlayerState.Paused) {
            this.doStop();
        }
        else {
            this.playstate = PlayerState.InitStop;
            this.doStop();
        }
    }
    Rewind() {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped)
            return;
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.currentPulseTime);
        this.prevPulseTime = this.currentPulseTime;
        const ts = this.options?.time ?? this.midifile.getTime();
        const measureLen = ts.getMeasure();
        let measure = Math.floor(this.currentPulseTime / measureLen);
        measure = Math.max(0, measure - 1);
        let pt = measure * measureLen;
        if (pt < 0) {
            pt = 0;
            this.prevPulseTime = -10;
        }
        else if (pt < (this.options?.shifttime ?? 0))
            pt = this.options?.shifttime ?? 0;
        const currNote = this.sheet.getCurrentNote(pt, ts);
        if (currNote)
            pt = currNote.getStartTime();
        this.currentPulseTime = pt;
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    FastForward() {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped)
            return;
        this.playstate = PlayerState.Paused;
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.currentPulseTime);
        this.prevPulseTime = this.currentPulseTime;
        const ts = this.options?.time ?? this.midifile.getTime();
        const measureLen = ts.getMeasure();
        const measure = Math.floor(this.currentPulseTime / measureLen);
        const newPt = (measure + 1) * measureLen;
        if (newPt <= this.midifile.getTotalPulses())
            this.currentPulseTime = newPt;
        const currNote = this.sheet.getCurrentNote(this.currentPulseTime, ts);
        if (currNote)
            this.currentPulseTime = currNote.getStartTime();
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    NextNote() {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped)
            return;
        const ts = this.options?.time ?? this.midifile.getTime();
        const curr = this.sheet.getCurrentNote(this.currentPulseTime, ts);
        if (!curr)
            return;
        let newPt;
        if (curr.getStartTime() > this.currentPulseTime) {
            newPt = curr.getStartTime();
        }
        else {
            const next = this.sheet.getCurrentNote(curr.getStartTime() + 1, ts);
            if (!next)
                return;
            newPt = next.getStartTime();
        }
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.currentPulseTime);
        this.prevPulseTime = this.currentPulseTime;
        this.currentPulseTime = newPt;
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    PrevNote() {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped)
            return;
        const prev = this.sheet.getPrevNote(this.currentPulseTime);
        if (!prev)
            return;
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.currentPulseTime);
        this.prevPulseTime = this.currentPulseTime;
        this.currentPulseTime = prev.getStartTime();
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    SpeedUp() { this.speedPercent = Math.min(200, this.speedPercent + 10); if (this.isPlaying())
        this.restartWithNewSpeed(); }
    SpeedDown() { this.speedPercent = Math.max(10, this.speedPercent - 10); if (this.isPlaying())
        this.restartWithNewSpeed(); }
    SetLoopStart() {
        if (!this.midifile || !this.options)
            return;
        this.options.playMeasuresInLoopStart = this.getCurrentMeasure();
        if (this.options.playMeasuresInLoopStart > this.options.playMeasuresInLoopEnd)
            this.options.playMeasuresInLoopEnd = this.options.playMeasuresInLoopStart;
    }
    SetLoopEnd() {
        if (!this.midifile || !this.options)
            return;
        this.options.playMeasuresInLoopEnd = this.getCurrentMeasure();
        if (this.options.playMeasuresInLoopStart > this.options.playMeasuresInLoopEnd)
            this.options.playMeasuresInLoopStart = this.options.playMeasuresInLoopEnd;
    }
    ToggleLoop() { if (this.options)
        this.options.playMeasuresInLoop = !this.options.playMeasuresInLoop; }
    MoveToClicked(x, y) {
        if (!this.midifile || !this.sheet)
            return;
        if (this.playstate !== PlayerState.Paused && this.playstate !== PlayerState.Stopped && this.playstate !== PlayerState.Midi)
            return;
        if (this.playstate !== PlayerState.Midi)
            this.playstate = PlayerState.Paused;
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.currentPulseTime);
        this.currentPulseTime = this.sheet.PulseTimeForPoint(x, y);
        this.prevPulseTime = this.currentPulseTime - (this.midifile.getTime().getMeasure());
        if (this.currentPulseTime > this.midifile.getTotalPulses())
            this.currentPulseTime -= this.midifile.getTime().getMeasure();
        const ts = this.options?.time ?? this.midifile.getTime();
        const chord = this.sheet.getCurrentNote(this.currentPulseTime, ts);
        if (chord)
            this.currentPulseTime = chord.getStartTime();
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, DontScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    cleanup() {
        this.clearTimer();
        this.clearPendingPlay();
        this.stopAudio();
        // Reset per-file preset caches; the AudioContext/WafPlayer are kept alive
        // so that already-decoded instrument buffers remain valid for reuse.
        this.wafInstrPresets.clear();
        this.wafDrumPresets.clear();
        this.wafLoadingPromise = Promise.resolve();
        this._loadingInstruments = false;
        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }
        this.playstate = PlayerState.Stopped;
    }
    reshadeSheet() {
        if (!this.sheet)
            return;
        const ctx = this._sheetCtx();
        if (!ctx)
            return;
        this.sheet.ShadeNotes(ctx, this.currentPulseTime, this.prevPulseTime);
    }
    // ---- Internal ----
    numberTracks() {
        if (!this.options)
            return 0;
        return this.options.mute.filter(m => !m).length;
    }
    async doPlay() {
        if (!this.midifile || !this.options)
            return;
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
        }
        else if (this.playstate === PlayerState.Paused) {
            const countInPulses = opts.countInMeasures * ts.getMeasure();
            if (opts.countInMeasures > 0 && this.currentPulseTime <= shifttime) {
                opts.pauseTime = 0;
                this.startPulseTime = shifttime - countInPulses;
                this.currentPulseTime = shifttime - countInPulses;
                this.prevPulseTime = shifttime - countInPulses - this.midifile.getTime().getQuarter();
            }
            else {
                this.startPulseTime = this.currentPulseTime;
                opts.pauseTime = Math.floor(this.currentPulseTime - shifttime);
            }
        }
        else {
            opts.pauseTime = 0;
            const countInPulses = opts.countInMeasures * ts.getMeasure();
            this.startPulseTime = shifttime - countInPulses;
            this.currentPulseTime = shifttime - countInPulses;
            this.prevPulseTime = shifttime - countInPulses - this.midifile.getTime().getQuarter();
        }
        // Compute tempo / pulsesPerMsec and ensure AudioContext exists.
        // Also enqueues instrument loading onto wafLoadingPromise.
        this.createMidiAudio();
        // Set Playing state immediately so the UI shows the correct button state
        // and the loading spinner while instruments are being fetched.
        // We intentionally do NOT start the visual timer yet — the sheet music
        // should only advance once everything is ready to play.
        this.playstate = PlayerState.Playing;
        // Wait for all required WebAudioFont instruments to finish loading before
        // starting visual or audio playback.
        await this.wafLoadingPromise;
        // The user may have paused/stopped while instruments were loading, or
        // SetMidiFile may have been called with new options (which resets the player).
        if (this.options !== opts)
            return;
        // Use the accessor method so TypeScript does not narrow based on the
        // earlier `this.playstate = PlayerState.Playing` assignment.
        const stateAfterLoad = this.getPlayState();
        if (stateAfterLoad === PlayerState.InitPause) {
            // User pressed Pause during loading — honour it.
            this.playstate = PlayerState.Paused;
            return;
        }
        if (stateAfterLoad !== PlayerState.Playing)
            return;
        // Anchor timing to now (instruments just finished loading; currentPulseTime
        // is unchanged because no timer was running during the load).
        this.startPulseTime = this.currentPulseTime;
        opts.pauseTime = Math.floor(this.currentPulseTime - shifttime);
        this.startTime = performance.now();
        // Now start the visual timer and apply the initial note shading.
        this.clearTimer();
        this.timerHandle = window.setInterval(() => this.timerCallback(), 100);
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, GradualScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
        if (opts.countInMeasures > 0 && opts.pauseTime === 0 && !this.doPlayFromLoopEnd) {
            this.countInBeatsPerMeasure = ts.getNumerator();
            this.countInTotalBeats = opts.countInMeasures * this.countInBeatsPerMeasure;
            this.countInBeatDurationMs = Math.floor(ts.getMeasure() / this.countInBeatsPerMeasure / this.pulsesPerMsec);
            this.countInBeatIndex = 0;
            this.countInStartTime = performance.now();
            this.scheduleCountInBeat();
        }
        else {
            this.playAudio();
        }
    }
    scheduleCountInBeat() {
        if (this.playstate !== PlayerState.Playing)
            return;
        const isAccented = (this.countInBeatIndex % this.countInBeatsPerMeasure === 0);
        this.playClickBeat(isAccented);
        this.countInBeatIndex++;
        if (this.countInBeatIndex < this.countInTotalBeats) {
            const nextMs = this.countInStartTime + this.countInBeatIndex * this.countInBeatDurationMs;
            const delay = Math.max(0, nextMs - performance.now());
            window.setTimeout(() => this.scheduleCountInBeat(), delay);
        }
        else {
            const midiStartMs = this.countInStartTime + this.countInTotalBeats * this.countInBeatDurationMs;
            const delay = Math.max(0, midiStartMs - performance.now());
            window.setTimeout(() => this.playAudio(), delay);
        }
    }
    playClickBeat(isAccented) {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new AudioContext();
            }
            catch {
                return;
            }
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
    createMidiAudio() {
        if (!this.midifile || !this.options)
            return;
        const inverseTempo = 1.0 / this.midifile.getTime().getTempo();
        const inverseTmpoScaled = inverseTempo * this.speedPercent / 100.0;
        this.options.tempo = Math.round(1.0 / inverseTmpoScaled);
        this.pulsesPerMsec = this.midifile.getTime().getQuarter() * (1000.0 / this.options.tempo);
        // Lazily create the shared AudioContext and WebAudioFont player.
        if (!this.wafAudioCtx) {
            try {
                this.wafAudioCtx = new AudioContext();
            }
            catch {
                return;
            }
        }
        if (!this.wafPlayer) {
            try {
                this.wafPlayer = new WebAudioFontPlayer();
                this.wafChannel = this.wafPlayer.createChannel(this.wafAudioCtx);
                this.wafChannel.output.connect(this.wafAudioCtx.destination);
            }
            catch {
                return;
            }
        }
        if (this.wafAudioCtx.state === 'suspended') {
            this.wafAudioCtx.resume().catch(() => { });
        }
        // Collect GM program numbers and (for drums) individual note numbers used
        // by non-muted tracks so we know exactly which presets to pre-load.
        const tracks = this.midifile.ChangeMidiNotes(this.options);
        const melodicProgs = new Set();
        const drumNotes = new Set();
        for (let i = 0; i < tracks.length; i++) {
            if (this.options.mute[i])
                continue;
            const prog = this.options.instruments[i] ?? 0;
            if (prog === 128) {
                for (const note of tracks[i].getNotes()) {
                    drumNotes.add(note.getNumber());
                }
            }
            else {
                melodicProgs.add(prog);
            }
        }
        // Chain instrument loading onto wafLoadingPromise so that doPlay() can
        // await the entire chain before scheduling Web Audio API notes.
        this.wafLoadingPromise = this.wafLoadingPromise.then(() => this.loadWafInstruments(melodicProgs, drumNotes));
    }
    /** Async: load any WebAudioFont presets not yet cached in the global window scope. */
    async loadWafInstruments(melodicProgs, drumNotes) {
        if (!this.wafAudioCtx || !this.wafPlayer)
            return;
        const ctx = this.wafAudioCtx;
        const player = this.wafPlayer;
        // Collect presets that still need to be started via script injection.
        let anyNew = false;
        for (const prog of melodicProgs) {
            if (this.wafInstrPresets.has(prog))
                continue;
            const idx = player.loader.findInstrument(prog);
            const info = player.loader.instrumentInfo(idx);
            this.wafInstrPresets.set(prog, info.variable);
            player.loader.startLoad(ctx, info.url, info.variable);
            anyNew = true;
        }
        for (const note of drumNotes) {
            if (this.wafDrumPresets.has(note))
                continue;
            const idx = player.loader.findDrum(note);
            const info = player.loader.drumInfo(idx);
            this.wafDrumPresets.set(note, { variable: info.variable, pitch: info.pitch });
            player.loader.startLoad(ctx, info.url, info.variable);
            anyNew = true;
        }
        if (!anyNew)
            return;
        this._loadingInstruments = true;
        try {
            await new Promise((resolve) => player.loader.waitLoad(resolve));
        }
        finally {
            this._loadingInstruments = false;
        }
    }
    playAudio() {
        if (!this.midifile || !this.options || !this.wafAudioCtx || !this.wafPlayer || !this.wafChannel)
            return;
        const ctx = this.wafAudioCtx;
        const player = this.wafPlayer;
        const dest = this.wafChannel.input;
        player.resumeContext(ctx);
        // Tiny look-ahead so the very first notes are not clipped by buffer latency.
        // Offset startTime by the same amount so visual and audio stay in sync.
        const LOOKAHEAD_SEC = 0.05;
        this.wafAudioStart = ctx.currentTime + LOOKAHEAD_SEC;
        this.startTime = performance.now() + LOOKAHEAD_SEC * 1000;
        const tracks = this.midifile.ChangeMidiNotes(this.options);
        const pulsesPerSec = this.pulsesPerMsec * 1000;
        for (let trackIdx = 0; trackIdx < tracks.length; trackIdx++) {
            if (this.options.mute[trackIdx])
                continue;
            const prog = this.options.instruments[trackIdx] ?? 0;
            const isDrumTrack = prog === 128;
            const trackVolume = ((this.options.volume?.[trackIdx] ?? 100) / 100);
            for (const note of tracks[trackIdx].getNotes()) {
                const noteStart = note.getStartTime();
                if (noteStart < this.startPulseTime)
                    continue;
                const startSec = (noteStart - this.startPulseTime) / pulsesPerSec;
                const durSec = Math.max(0.05, note.getDuration() / pulsesPerSec);
                const when = this.wafAudioStart + startSec;
                if (isDrumTrack) {
                    const drumInfo = this.wafDrumPresets.get(note.getNumber());
                    if (!drumInfo)
                        continue;
                    const preset = window[drumInfo.variable];
                    if (!preset)
                        continue;
                    try {
                        player.queueWaveTable(ctx, dest, preset, when, drumInfo.pitch, durSec, 0.5 * trackVolume);
                    }
                    catch { /* ignore single-note errors */ }
                }
                else {
                    const variable = this.wafInstrPresets.get(prog);
                    if (!variable)
                        continue;
                    const preset = window[variable];
                    if (!preset)
                        continue;
                    try {
                        player.queueWaveTable(ctx, dest, preset, when, note.getNumber(), durSec, 0.7 * trackVolume);
                    }
                    catch { /* ignore single-note errors */ }
                }
            }
        }
    }
    stopAudio() {
        if (this.wafAudioCtx && this.wafPlayer) {
            this.wafPlayer.cancelQueue(this.wafAudioCtx);
        }
    }
    timerCallback() {
        if (!this.midifile || !this.sheet) {
            this.playstate = PlayerState.Stopped;
            return;
        }
        if (this.playstate === PlayerState.Stopped || this.playstate === PlayerState.Paused)
            return;
        if (this.playstate === PlayerState.InitStop)
            return;
        if (this.playstate === PlayerState.Playing) {
            const msec = performance.now() - this.startTime;
            this.prevPulseTime = this.currentPulseTime;
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
        }
        else if (this.playstate === PlayerState.InitPause) {
            const msec = performance.now() - this.startTime;
            this.stopAudio();
            this.prevPulseTime = this.currentPulseTime;
            this.currentPulseTime = this.startPulseTime + msec * this.pulsesPerMsec;
            this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
            this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
            this.playstate = PlayerState.Paused;
            this.clearTimer();
            this.reshadeHandle = window.setTimeout(() => this.reShade(), 1000);
        }
    }
    reShade() {
        if (this.playstate === PlayerState.Paused || this.playstate === PlayerState.Stopped) {
            this._shadeNotes(this.currentPulseTime, -10, ImmediateScroll);
            this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
        }
    }
    doStop() {
        this.playstate = PlayerState.Stopped;
        this.clearTimer();
        this.removeShading();
        this.scrollToStart();
        this.stopAudio();
    }
    removeShading() {
        this._shadeNotes(-10, this.prevPulseTime, DontScroll);
        this._shadeNotes(-10, this.currentPulseTime, DontScroll);
        this._shadeNotePiano(-10, this.prevPulseTime);
        this._shadeNotePiano(-10, this.currentPulseTime);
    }
    scrollToStart() {
        if (!this.midifile || !this.options)
            return;
        const ts = this.options.time ?? this.midifile.getTime();
        this.startPulseTime = this.options.playMeasuresInLoop
            ? this.options.playMeasuresInLoopStart * ts.getMeasure() : 0;
        this.currentPulseTime = this.startPulseTime;
        this.prevPulseTime = -10;
        this._shadeNotes(this.currentPulseTime, this.prevPulseTime, ImmediateScroll);
        this._shadeNotePiano(this.currentPulseTime, this.prevPulseTime);
    }
    restartPlayMeasuresInLoop() {
        this.playstate = PlayerState.Stopped;
        this._shadeNotePiano(-10, this.prevPulseTime);
        this._shadeNotes(-10, this.prevPulseTime, DontScroll);
        this.currentPulseTime = 0;
        this.prevPulseTime = -1;
        this.stopAudio();
        this.doPlayFromLoopEnd = true;
        window.setTimeout(() => this.doPlay(), 0);
    }
    restartWithNewSpeed() {
        const msec = performance.now() - this.startTime;
        this.currentPulseTime = this.startPulseTime + msec * this.pulsesPerMsec;
        this.clearTimer();
        this.stopAudio();
        this.startPulseTime = this.currentPulseTime;
        this.options.pauseTime = Math.floor(this.currentPulseTime - (this.options.shifttime));
        // Recompute tempo/pulsesPerMsec for new speed, then reschedule audio
        const inverseTempo = 1.0 / this.midifile.getTime().getTempo();
        const inverseTmpoScaled = inverseTempo * this.speedPercent / 100.0;
        this.options.tempo = Math.round(1.0 / inverseTmpoScaled);
        this.pulsesPerMsec = this.midifile.getTime().getQuarter() * (1000.0 / this.options.tempo);
        this.playAudio();
        this.timerHandle = window.setInterval(() => this.timerCallback(), 100);
    }
    clearTimer() {
        if (this.timerHandle !== null) {
            window.clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
        if (this.reshadeHandle !== null) {
            window.clearTimeout(this.reshadeHandle);
            this.reshadeHandle = null;
        }
    }
    clearPendingPlay() {
        // Nothing specific; count-in uses timeout chains and will stop because playstate changes
    }
    // ---- Sheet/Piano shading helpers ----
    // The Vue component sets these via setSheetCtxProvider / setPianoCtxProvider
    _sheetCtxProvider = null;
    _pianoCtxProvider = null;
    _scrollFn = null;
    _redrawFn = null;
    /** When set, replaces the legacy _shadeNotes path (ctx + scrollFn) with a
     *  single viewport-aware callback that handles drawing, shading and scrolling. */
    _viewportShadeFn = null;
    setSheetCtxProvider(fn) { this._sheetCtxProvider = fn; }
    setPianoCtxProvider(fn) { this._pianoCtxProvider = fn; }
    setScrollFn(fn) { this._scrollFn = fn; }
    setRedrawFn(fn) { this._redrawFn = fn; }
    setViewportShadeFn(fn) {
        this._viewportShadeFn = fn;
    }
    _sheetCtx() {
        return this._sheetCtxProvider ? this._sheetCtxProvider() : null;
    }
    _pianoCtx() {
        return this._pianoCtxProvider ? this._pianoCtxProvider() : null;
    }
    _shadeNotes(currentPulse, prevPulse, scrollType) {
        if (this._viewportShadeFn) {
            this._viewportShadeFn(currentPulse, prevPulse, scrollType);
            return;
        }
        // Legacy path (non-viewport rendering)
        if (!this.sheet)
            return;
        const ctx = this._sheetCtx();
        if (!ctx)
            return;
        // ShadeNotes handles incremental canvas updates without a full redraw.
        // _redrawFn is only called explicitly when the sheet itself changes (e.g. in SetMidiFile).
        const { xShade, yShade } = this.sheet.ShadeNotes(ctx, currentPulse, prevPulse);
        if (currentPulse >= 0 && this._scrollFn) {
            this._scrollFn(xShade, yShade, scrollType === ImmediateScroll);
        }
    }
    _shadeNotePiano(currentPulse, prevPulse) {
        if (!this.piano || !this._pianoCtx())
            return;
        const ctx = this._pianoCtx();
        this.piano.Draw(ctx);
        this.piano.ShadeNotes(ctx, currentPulse, prevPulse);
    }
}
