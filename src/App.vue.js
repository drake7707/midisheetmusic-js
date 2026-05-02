/// <reference types="../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, shallowRef, nextTick, computed, onMounted, onBeforeUnmount } from 'vue';
import { MidiFile, InstrumentAbbreviations } from '@/midi/MidiFile';
import { SheetMusic, createDefaultOptions } from '@/midi/SheetMusic';
import { Piano } from '@/midi/Piano';
import { MidiPlayer, PlayerState } from '@/midi/MidiPlayer';
import SheetMusicView from '@/components/SheetMusicView.vue';
import PianoKeyboard from '@/components/PianoKeyboard.vue';
import SettingsDrawer from '@/components/SettingsDrawer.vue';
import SettingsPage from '@/components/SettingsPage.vue';
const player = new MidiPlayer();
const midiFile = shallowRef(null);
const options = shallowRef(null);
const sheet = shallowRef(null);
const piano = shallowRef(null);
const fileName = ref('');
const errorMsg = ref('');
const playState = ref(PlayerState.Stopped);
const speedPct = ref(100);
const loadingAudio = ref(false);
const showDrawer = ref(false);
const showFullSettings = ref(false);
const sheetViewRef = ref(null);
const pianoViewRef = ref(null);
const fileInputRef = ref(null);
// ---- polling for play state (lightweight) ----
let pollHandle = null;
function startPolling() {
    if (pollHandle !== null)
        return;
    pollHandle = setInterval(() => {
        playState.value = player.getPlayState();
        loadingAudio.value = player.isLoadingInstruments();
    }, 200);
}
function stopPolling() {
    if (pollHandle !== null) {
        clearInterval(pollHandle);
        pollHandle = null;
    }
}
// ---- settings persistence in localStorage ----
const SETTINGS_PREFIX = 'midioptions_v1_';
/** Compute a simple hash of the MIDI file bytes for use as a storage key.
 *  Hashes the first 4 KB of the file plus its total size for speed on large files. */
function computeFileHash(buf) {
    const bytes = new Uint8Array(buf, 0, Math.min(buf.byteLength, 4096));
    // djb2-style hash
    let hash = 5381;
    for (let i = 0; i < bytes.length; i++) {
        hash = ((hash << 5) + hash) ^ bytes[i];
        hash = hash >>> 0; // keep as 32-bit unsigned
    }
    // XOR in the file size so files with the same first 4 KB are still distinguished
    hash = (hash ^ buf.byteLength) >>> 0;
    return hash.toString(16);
}
/** Fields of MidiOptions that should be persisted across sessions. */
const PERSISTED_FIELDS = [
    'tempo', 'instruments', 'mute', 'tracks', 'transpose', 'combineInterval',
    'twoStaffs', 'shifttime', 'useDefaultInstruments', 'volume', 'trackOctaveShift',
    'showMeasures', 'showBeatMarkers', 'showTrackLabels', 'scrollVert',
    'playMeasuresInLoop', 'playMeasuresInLoopStart', 'playMeasuresInLoopEnd',
    'showNoteLetters', 'key', 'showPiano', 'largeNoteSize', 'showLyrics',
    'shade1Color', 'shade2Color', 'useColors', 'colorAccidentals', 'useFullHeight',
    'countInMeasures', 'noteColors', 'midiShift',
];
function saveSettingsToStorage(hash, opts, speed) {
    try {
        const saved = { _speed: speed };
        for (const key of PERSISTED_FIELDS) {
            saved[key] = opts[key];
        }
        localStorage.setItem(SETTINGS_PREFIX + hash, JSON.stringify(saved));
    }
    catch { /* quota exceeded or private mode — ignore */ }
}
function loadSettingsFromStorage(hash, opts) {
    try {
        const raw = localStorage.getItem(SETTINGS_PREFIX + hash);
        if (!raw)
            return null;
        const saved = JSON.parse(raw);
        const merged = { ...opts };
        for (const key of PERSISTED_FIELDS) {
            if (key in saved) {
                // Only apply if the saved value has the same array length (track count)
                const v = saved[key];
                const cur = opts[key];
                if (Array.isArray(cur) && Array.isArray(v) && v.length !== cur.length)
                    continue;
                merged[key] = v;
            }
        }
        const speed = typeof saved._speed === 'number' ? saved._speed : 100;
        return { opts: merged, speed };
    }
    catch {
        return null;
    }
}
/** Hash for the currently loaded MIDI file (used for saving settings). */
let currentFileHash = '';
// ---- file loading ----
/** Returns the current sheet-view container width, falling back to the window
 *  width if the view is not yet mounted (e.g. on the very first file load). */
function getSheetPageWidth() {
    return sheetViewRef.value?.viewportWidth() ?? window.innerWidth;
}
async function onFileChange(evt) {
    const input = evt.target;
    const file = input.files?.[0];
    if (!file)
        return;
    await loadFile(file);
    input.value = '';
}
async function loadFile(file) {
    errorMsg.value = '';
    try {
        const buf = await file.arrayBuffer();
        const hash = computeFileHash(buf);
        const midi = new MidiFile(buf, file.name);
        let opts = createDefaultOptions(midi, InstrumentAbbreviations);
        // Use the actual container width so the vertical-scroll layout fills the screen.
        opts.pageWidth = getSheetPageWidth();
        // Restore previously saved settings for this file (matched by hash).
        const saved = loadSettingsFromStorage(hash, opts);
        if (saved) {
            opts = { ...saved.opts, pageWidth: getSheetPageWidth() };
            speedPct.value = saved.speed;
            player.setSpeedPercent(saved.speed);
        }
        const s = new SheetMusic(midi, opts);
        const p = new Piano();
        p.init(window.innerWidth);
        p.SetMidiFile(midi, opts);
        p.SetShadeColors(opts.shade1Color, opts.shade2Color);
        currentFileHash = hash;
        fileName.value = file.name;
        midiFile.value = midi;
        options.value = opts;
        sheet.value = s;
        piano.value = p;
        await nextTick();
        setupPlayer(midi, opts, s, p);
        startPolling();
    }
    catch (e) {
        errorMsg.value = `Failed to load MIDI: ${e.message}`;
    }
}
function setupPlayer(midi, opts, s, p) {
    player.setSheetCtxProvider(() => sheetViewRef.value?.getCtx() ?? null);
    player.setPianoCtxProvider(() => pianoViewRef.value?.getCtx() ?? null);
    player.setRedrawFn(() => {
        sheetViewRef.value?.drawSheet();
    });
    player.setScrollFn((x, y, immediate) => {
        sheetViewRef.value?.scrollTo(x, y, immediate);
    });
    player.setViewportShadeFn((currentPulse, prevPulse, scrollType) => {
        sheetViewRef.value?.renderAndScroll(currentPulse, prevPulse, scrollType);
    });
    player.SetPiano(p);
    player.SetMidiFile(midi, opts, s);
    // Initial draw
    sheetViewRef.value?.drawSheet();
    const pianoCtx = pianoViewRef.value?.getCtx();
    if (pianoCtx)
        p.Draw(pianoCtx);
}
// ---- rebuild sheet after option changes ----
async function rebuildSheet(newOpts) {
    if (!midiFile.value)
        return;
    const midi = midiFile.value;
    // Keep trackInstrumentNames in sync with the (possibly changed) instruments array.
    const updatedNames = newOpts.instruments.map(prog => prog < InstrumentAbbreviations.length ? InstrumentAbbreviations[prog] : `Prog.${prog}`);
    // Carry through the current container width so vertical-scroll layout stays full-width.
    const currentPageWidth = getSheetPageWidth();
    const opts = { ...newOpts, trackInstrumentNames: updatedNames, pageWidth: currentPageWidth };
    const wasPlaying = player.isPlaying();
    if (wasPlaying)
        player.Pause();
    const s = new SheetMusic(midi, opts);
    const p = new Piano();
    p.init(window.innerWidth);
    p.SetMidiFile(midi, opts);
    p.SetShadeColors(opts.shade1Color, opts.shade2Color);
    options.value = opts;
    sheet.value = s;
    piano.value = p;
    await nextTick();
    setupPlayer(midi, opts, s, p);
}
// ---- settings apply (from drawer or full page) ----
/** Called by the quick-access drawer (immediate per-toggle apply). */
function onDrawerApply(newOpts) {
    if (currentFileHash)
        saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
    rebuildSheet(newOpts);
}
/** Called by the full settings page. */
function onSettingsApply(newOpts, newSpeed) {
    showFullSettings.value = false;
    speedPct.value = newSpeed;
    player.setSpeedPercent(newSpeed);
    if (currentFileHash)
        saveSettingsToStorage(currentFileHash, newOpts, newSpeed);
    rebuildSheet(newOpts);
}
// ---- toolbar track visibility toggles ----
/** Toggle treble-clef (right hand) track visibility — toolbar btn_right */
function toggleTrebleClef() {
    if (!options.value || options.value.tracks.length < 1)
        return;
    const tracks = [...options.value.tracks];
    tracks[0] = !tracks[0];
    const newOpts = { ...options.value, tracks };
    if (currentFileHash)
        saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
    rebuildSheet(newOpts);
}
/** Toggle bass-clef (left hand) track visibility — toolbar btn_left */
function toggleBassClef() {
    if (!options.value || options.value.tracks.length < 2)
        return;
    const tracks = [...options.value.tracks];
    tracks[1] = !tracks[1];
    const newOpts = { ...options.value, tracks };
    if (currentFileHash)
        saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
    rebuildSheet(newOpts);
}
/** Toggle piano keyboard visibility — toolbar btn_piano */
function togglePiano() {
    if (!options.value)
        return;
    const newOpts = { ...options.value, showPiano: !options.value.showPiano };
    if (currentFileHash)
        saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
    rebuildSheet(newOpts);
}
/** Go back — unload the current MIDI file */
function clearFile() {
    player.cleanup();
    stopPolling();
    midiFile.value = null;
    options.value = null;
    sheet.value = null;
    piano.value = null;
    fileName.value = '';
    playState.value = PlayerState.Stopped;
    showDrawer.value = false;
    showFullSettings.value = false;
}
// ---- speed ----
function onSpeedChange(evt) {
    const v = parseInt(evt.target.value, 10);
    speedPct.value = v;
    player.setSpeedPercent(v);
}
// ---- playback controls ----
function play() { player.Play(); playState.value = player.getPlayState(); }
function pause() { player.Pause(); playState.value = player.getPlayState(); }
function replay() { player.Reset(); playState.value = player.getPlayState(); stopPolling(); startPolling(); }
function rewind() { player.Rewind(); playState.value = player.getPlayState(); }
function fastForward() { player.FastForward(); playState.value = player.getPlayState(); }
function isPlaying() { return playState.value === PlayerState.Playing; }
function hasMidi() { return midiFile.value !== null; }
/** Called when the user clicks on the sheet music canvas — seek to that position. */
function onSheetClick(x, y) {
    player.MoveToClicked(x, y);
}
/** Called when the canvas draw fails (e.g. sheet too large for browser canvas limits). */
function onDrawError(msg) {
    errorMsg.value = msg;
}
/** Speed display: percentage line and BPM line (matches Android two-line txt_speed). */
const speedPctText = computed(() => `${speedPct.value}%`);
const speedBpmText = computed(() => {
    if (!midiFile.value)
        return '';
    const tempo = midiFile.value.getTime().getTempo();
    return `${Math.round(60_000_000 * speedPct.value / (tempo * 100))}bpm`;
});
/** Whether each track is currently shown (for button active state). */
const trebleVisible = computed(() => options.value?.tracks[0] ?? true);
const bassVisible = computed(() => options.value?.tracks[1] ?? true);
/** Last measure index for loop range clamping */
const lastMeasure = computed(() => options.value?.lastMeasure ?? 0);
// ---- keyboard shortcuts ----
function onKeyDown(evt) {
    if (!hasMidi())
        return;
    // Don't fire shortcuts when the user is typing in an input / select
    const tag = evt.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
        return;
    switch (evt.key) {
        case ' ':
            evt.preventDefault();
            isPlaying() ? pause() : play();
            break;
        case 'ArrowLeft':
            evt.preventDefault();
            rewind();
            break;
        case 'ArrowRight':
            evt.preventDefault();
            fastForward();
            break;
        case 'ArrowUp':
            evt.preventDefault();
            player.SpeedUp();
            speedPct.value = player.getSpeedPercent();
            if (currentFileHash && options.value)
                saveSettingsToStorage(currentFileHash, options.value, speedPct.value);
            break;
        case 'ArrowDown':
            evt.preventDefault();
            player.SpeedDown();
            speedPct.value = player.getSpeedPercent();
            if (currentFileHash && options.value)
                saveSettingsToStorage(currentFileHash, options.value, speedPct.value);
            break;
        case 'r':
        case 'R':
            if (!evt.ctrlKey && !evt.metaKey) {
                evt.preventDefault();
                replay();
            }
            break;
        case 'Home':
            evt.preventDefault();
            replay();
            break;
    }
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['speed-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['drop-hint']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app" },
});
/** @type {__VLS_StyleScopedClasses['app']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "toolbar" },
});
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.hasMidi() ? __VLS_ctx.clearFile() : __VLS_ctx.fileInputRef?.click();
            // @ts-ignore
            [hasMidi, clearFile, fileInputRef,];
        } },
    ...{ class: "tb-btn" },
    title: (__VLS_ctx.hasMidi() ? 'Back (close file)' : 'Open MIDI file'),
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
(__VLS_ctx.hasMidi() ? '←' : '📂');
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.onFileChange) },
    ref: "fileInputRef",
    type: "file",
    accept: ".mid,.midi",
    ...{ style: {} },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showDrawer = !__VLS_ctx.showDrawer;
            // @ts-ignore
            [hasMidi, hasMidi, onFileChange, showDrawer, showDrawer,];
        } },
    ...{ class: "tb-btn" },
    title: "Settings",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.replay) },
    ...{ class: "tb-btn" },
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Replay",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isPlaying() ? __VLS_ctx.pause() : __VLS_ctx.play();
            // @ts-ignore
            [hasMidi, replay, isPlaying, pause, play,];
        } },
    ...{ class: "tb-btn tb-btn-play" },
    disabled: (!__VLS_ctx.hasMidi()),
    title: (__VLS_ctx.loadingAudio ? 'Loading instruments…' : __VLS_ctx.isPlaying() ? 'Pause' : 'Play'),
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-play']} */ ;
if (__VLS_ctx.loadingAudio) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "spinner" },
        title: "Loading instruments…",
    });
    /** @type {__VLS_StyleScopedClasses['spinner']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.isPlaying() ? '⏸' : '▶');
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.rewind) },
    ...{ class: "tb-btn" },
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Rewind",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.fastForward) },
    ...{ class: "tb-btn" },
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Forward",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "txt-speed" },
});
/** @type {__VLS_StyleScopedClasses['txt-speed']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.speedPctText);
if (__VLS_ctx.speedBpmText) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "txt-bpm" },
    });
    /** @type {__VLS_StyleScopedClasses['txt-bpm']} */ ;
    (__VLS_ctx.speedBpmText);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (__VLS_ctx.onSpeedChange) },
    ...{ class: "speed-bar" },
    type: "range",
    min: "10",
    max: "150",
    step: "5",
    value: (__VLS_ctx.speedPct),
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Playback speed",
});
/** @type {__VLS_StyleScopedClasses['speed-bar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "tb-btn tb-btn-midi" },
    disabled: true,
    title: "MIDI (not available)",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-midi']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleBassClef) },
    ...{ class: "tb-btn tb-btn-clef" },
    ...{ class: ({ 'tb-btn-clef-active': __VLS_ctx.bassVisible }) },
    disabled: (!__VLS_ctx.hasMidi() || (__VLS_ctx.options?.tracks.length ?? 0) < 2),
    title: "Bass clef (left hand)",
    'aria-label': "Toggle bass clef (left hand)",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-clef']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-clef-active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleTrebleClef) },
    ...{ class: "tb-btn tb-btn-clef" },
    ...{ class: ({ 'tb-btn-clef-active': __VLS_ctx.trebleVisible }) },
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Treble clef (right hand)",
    'aria-label': "Toggle treble clef (right hand)",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-clef']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-clef-active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.togglePiano) },
    ...{ class: "tb-btn" },
    ...{ class: ({ 'tb-btn-active': __VLS_ctx.options?.showPiano }) },
    disabled: (!__VLS_ctx.hasMidi()),
    title: "Show/Hide Piano",
});
/** @type {__VLS_StyleScopedClasses['tb-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tb-btn-active']} */ ;
if (__VLS_ctx.errorMsg) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "error-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['error-bar']} */ ;
    (__VLS_ctx.errorMsg);
}
if (__VLS_ctx.hasMidi()) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "filename-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['filename-bar']} */ ;
    (__VLS_ctx.fileName);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "main-content" },
});
/** @type {__VLS_StyleScopedClasses['main-content']} */ ;
if (!__VLS_ctx.hasMidi()) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.hasMidi()))
                    return;
                __VLS_ctx.fileInputRef?.click();
                // @ts-ignore
                [hasMidi, hasMidi, hasMidi, hasMidi, hasMidi, hasMidi, hasMidi, hasMidi, hasMidi, fileInputRef, isPlaying, isPlaying, loadingAudio, loadingAudio, rewind, fastForward, speedPctText, speedBpmText, speedBpmText, onSpeedChange, speedPct, toggleBassClef, bassVisible, options, options, toggleTrebleClef, trebleVisible, togglePiano, errorMsg, errorMsg, fileName,];
            } },
        ...{ class: "drop-hint" },
    });
    /** @type {__VLS_StyleScopedClasses['drop-hint']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else {
    const __VLS_0 = SheetMusicView;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onCanvasClick': {} },
        ...{ 'onDrawError': {} },
        ref: "sheetViewRef",
        sheet: (__VLS_ctx.sheet),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onCanvasClick': {} },
        ...{ 'onDrawError': {} },
        ref: "sheetViewRef",
        sheet: (__VLS_ctx.sheet),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ canvasClick: {} },
        { onCanvasClick: (__VLS_ctx.onSheetClick) });
    const __VLS_7 = ({ drawError: {} },
        { onDrawError: (__VLS_ctx.onDrawError) });
    var __VLS_8 = {};
    var __VLS_3;
    var __VLS_4;
}
if (__VLS_ctx.options?.showPiano && __VLS_ctx.piano) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
        ...{ class: "piano-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['piano-footer']} */ ;
    const __VLS_10 = PianoKeyboard;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
        ref: "pianoViewRef",
        piano: (__VLS_ctx.piano),
    }));
    const __VLS_12 = __VLS_11({
        ref: "pianoViewRef",
        piano: (__VLS_ctx.piano),
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    var __VLS_15 = {};
    var __VLS_13;
}
if (__VLS_ctx.options) {
    const __VLS_17 = SettingsDrawer;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
        ...{ 'onClose': {} },
        ...{ 'onOpenFullSettings': {} },
        ...{ 'onApply': {} },
        visible: (__VLS_ctx.showDrawer),
        options: (__VLS_ctx.options),
        lastMeasure: (__VLS_ctx.lastMeasure),
    }));
    const __VLS_19 = __VLS_18({
        ...{ 'onClose': {} },
        ...{ 'onOpenFullSettings': {} },
        ...{ 'onApply': {} },
        visible: (__VLS_ctx.showDrawer),
        options: (__VLS_ctx.options),
        lastMeasure: (__VLS_ctx.lastMeasure),
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    let __VLS_22;
    const __VLS_23 = ({ close: {} },
        { onClose: (...[$event]) => {
                if (!(__VLS_ctx.options))
                    return;
                __VLS_ctx.showDrawer = false;
                // @ts-ignore
                [showDrawer, showDrawer, options, options, options, sheet, onSheetClick, onDrawError, piano, piano, lastMeasure,];
            } });
    const __VLS_24 = ({ openFullSettings: {} },
        { onOpenFullSettings: (...[$event]) => {
                if (!(__VLS_ctx.options))
                    return;
                __VLS_ctx.showDrawer = false;
                __VLS_ctx.showFullSettings = true;
                // @ts-ignore
                [showDrawer, showFullSettings,];
            } });
    const __VLS_25 = ({ apply: {} },
        { onApply: (__VLS_ctx.onDrawerApply) });
    var __VLS_20;
    var __VLS_21;
}
if (__VLS_ctx.options) {
    const __VLS_26 = SettingsPage;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
        ...{ 'onClose': {} },
        ...{ 'onApply': {} },
        visible: (__VLS_ctx.showFullSettings),
        options: (__VLS_ctx.options),
        tracks: (__VLS_ctx.midiFile?.getTracks() ?? []),
        speedPct: (__VLS_ctx.speedPct),
    }));
    const __VLS_28 = __VLS_27({
        ...{ 'onClose': {} },
        ...{ 'onApply': {} },
        visible: (__VLS_ctx.showFullSettings),
        options: (__VLS_ctx.options),
        tracks: (__VLS_ctx.midiFile?.getTracks() ?? []),
        speedPct: (__VLS_ctx.speedPct),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
    let __VLS_31;
    const __VLS_32 = ({ close: {} },
        { onClose: (...[$event]) => {
                if (!(__VLS_ctx.options))
                    return;
                __VLS_ctx.showFullSettings = false;
                // @ts-ignore
                [speedPct, options, options, showFullSettings, showFullSettings, onDrawerApply, midiFile,];
            } });
    const __VLS_33 = ({ apply: {} },
        { onApply: (__VLS_ctx.onSettingsApply) });
    var __VLS_29;
    var __VLS_30;
}
// @ts-ignore
var __VLS_9 = __VLS_8, __VLS_16 = __VLS_15;
// @ts-ignore
[onSettingsApply,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
