/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
/**
 * SettingsPage — full-screen settings overlay, matching the Android
 * MidiSheetMusic settings activity layout.
 *
 * Sections (matching Android preference groups):
 *   1. Sheet Music  – display options
 *   2. Playback     – tempo, speed, transpose, count-in, two staves
 *   3. Tracks       – combined per-track card (show, mute, vol, instrument, octave shift)
 *   4. Colors       – shade colors, note colors
 */
import { reactive, computed, watch } from 'vue';
import { NoteNameNone, NoteNameLetter, NoteNameFixedDoReMi, NoteNameMovableDoReMi, NoteNameFixedNumber, NoteNameMovableNumber, } from '@/midi/MidiFile';
const props = defineProps();
const emit = defineEmits();
// ── Deep-clone helpers ────────────────────────────────────────────────────────
function cloneOpts(o) {
    return {
        ...o,
        instruments: [...o.instruments],
        mute: [...o.mute],
        tracks: [...o.tracks],
        volume: o.volume ? [...o.volume] : null,
        trackOctaveShift: o.trackOctaveShift ? [...o.trackOctaveShift] : null,
        trackInstrumentNames: o.trackInstrumentNames ? [...o.trackInstrumentNames] : null,
        noteColors: [...o.noteColors],
    };
}
const local = reactive(cloneOpts(props.options));
const localSpeed = reactive({ value: props.speedPct });
// Resync when opened
watch(() => props.visible, (v) => {
    if (v) {
        Object.assign(local, cloneOpts(props.options));
        localSpeed.value = props.speedPct;
    }
});
// ── BPM ↔ tempo ───────────────────────────────────────────────────────────────
/** Microseconds per minute — used to convert between tempo (µs/beat) and BPM. */
const MICROS_PER_MINUTE = 60_000_000;
/** Default track volume (0–100). */
const DEFAULT_VOLUME = 100;
const bpm = computed({
    get: () => Math.round(MICROS_PER_MINUTE / local.tempo),
    set: (v) => {
        local.tempo = Math.round(MICROS_PER_MINUTE / Math.max(10, Math.min(300, v)));
    },
});
// ── Color pickers ─────────────────────────────────────────────────────────────
function packedToHex(packed) {
    const r = (packed >> 16) & 0xff;
    const g = (packed >> 8) & 0xff;
    const b = packed & 0xff;
    return '#' +
        r.toString(16).padStart(2, '0') +
        g.toString(16).padStart(2, '0') +
        b.toString(16).padStart(2, '0');
}
function hexToPacked(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return ((n >> 16) & 0xff) << 16 | ((n >> 8) & 0xff) << 8 | (n & 0xff);
}
const shade1Hex = computed({
    get: () => packedToHex(local.shade1Color),
    set: (v) => { local.shade1Color = hexToPacked(v); },
});
const shade2Hex = computed({
    get: () => packedToHex(local.shade2Color),
    set: (v) => { local.shade2Color = hexToPacked(v); },
});
// ── Note-letter options ───────────────────────────────────────────────────────
const noteNameOptions = [
    { value: NoteNameNone, label: 'None' },
    { value: NoteNameLetter, label: 'Letter (A – G)' },
    { value: NoteNameFixedDoReMi, label: 'Fixed Do-Re-Mi' },
    { value: NoteNameMovableDoReMi, label: 'Movable Do-Re-Mi' },
    { value: NoteNameFixedNumber, label: 'Fixed Number' },
    { value: NoteNameMovableNumber, label: 'Movable Number' },
];
// ── Instrument list (General MIDI, 0-indexed) ─────────────────────────────────
// Full names paired with abbreviations for the selector
const InstrumentNames = [
    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano',
    'Honky-tonk Piano', 'Electric Piano 1', 'Electric Piano 2',
    'Harpsichord', 'Clavinet', 'Celesta', 'Glockenspiel', 'Music Box',
    'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ',
    'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)',
    'Electric Guitar (jazz)', 'Electric Guitar (clean)', 'Electric Guitar (muted)',
    'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)',
    'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings',
    'Orchestral Harp', 'Timpani', 'String Ensemble 1', 'String Ensemble 2',
    'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Choir',
    'Orchestra Hit', 'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn',
    'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax',
    'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
    'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi',
    'Whistle', 'Ocarina',
    'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)',
    'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass+lead)',
    'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)',
    'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
    'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
    'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
    'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom',
    'Synth Drum', 'Reverse Cymbal',
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet',
    'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot',
    'Percussion',
];
// ── Track helpers ─────────────────────────────────────────────────────────────
function trackDisplayName(i) {
    const abbr = local.trackInstrumentNames?.[i];
    const instr = local.instruments[i] ?? 0;
    const full = InstrumentNames[instr] ?? 'Unknown';
    return abbr ? `${abbr} — ${full}` : full;
}
function getOctaveShift(i) {
    return local.trackOctaveShift?.[i] ?? 0;
}
function setOctaveShift(i, v) {
    if (local.trackOctaveShift)
        local.trackOctaveShift[i] = v;
}
/** T / 8va / 8vb options matching Android track settings */
const octaveOpts = [
    { label: '8vb', value: -1 },
    { label: 'T', value: 0 },
    { label: '8va', value: 1 },
];
// ── Apply / cancel ─────────────────────────────────────────────────────────────
function setVolume(i, evt) {
    if (local.volume)
        local.volume[i] = Number(evt.target.value);
}
function onBpmSlider(evt) {
    bpm.value = Number(evt.target.value);
}
function onSpeedSlider(evt) {
    localSpeed.value = Number(evt.target.value);
}
function onTransposeSlider(evt) {
    local.transpose = Number(evt.target.value);
}
function onShade1Input(evt) {
    shade1Hex.value = evt.target.value;
}
function onShade2Input(evt) {
    shade2Hex.value = evt.target.value;
}
function apply() {
    emit('apply', cloneOpts(local), localSpeed.value);
    emit('close');
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btn-back']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-text-apply']} */ ;
/** @type {__VLS_StyleScopedClasses['pref-group-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
/** @type {__VLS_StyleScopedClasses['radio-label']} */ ;
/** @type {__VLS_StyleScopedClasses['step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['octave-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['octave-btn']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "page-slide",
}));
const __VLS_2 = __VLS_1({
    name: "page-slide",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "settings-page" },
        role: "dialog",
        'aria-modal': "true",
        'aria-label': "All Settings",
    });
    /** @type {__VLS_StyleScopedClasses['settings-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
        ...{ class: "app-bar" },
    });
    /** @type {__VLS_StyleScopedClasses['app-bar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.$emit('close');
                // @ts-ignore
                [visible, $emit,];
            } },
        ...{ class: "btn-back" },
        'aria-label': "Back",
    });
    /** @type {__VLS_StyleScopedClasses['btn-back']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "app-bar-title" },
    });
    /** @type {__VLS_StyleScopedClasses['app-bar-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.apply) },
        ...{ class: "btn-text-apply" },
    });
    /** @type {__VLS_StyleScopedClasses['btn-text-apply']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "prefs-scroll" },
    });
    /** @type {__VLS_StyleScopedClasses['prefs-scroll']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-group-header" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-group-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--inline" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "radio-group" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-group']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "radio-label" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "radio",
        value: (true),
    });
    (__VLS_ctx.local.scrollVert);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "radio-label" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "radio",
        value: (false),
    });
    (__VLS_ctx.local.scrollVert);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--inline" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "radio-group" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-group']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "radio-label" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "radio",
        value: (false),
    });
    (__VLS_ctx.local.largeNoteSize);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "radio-label" },
    });
    /** @type {__VLS_StyleScopedClasses['radio-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "radio",
        value: (true),
    });
    (__VLS_ctx.local.largeNoteSize);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.showMeasures);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.showBeatMarkers);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.showTrackLabels);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.showLyrics);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.showPiano);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--select" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--select']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.local.showNoteLetters),
        ...{ class: "pref-select" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-select']} */ ;
    for (const [o] of __VLS_vFor((__VLS_ctx.noteNameOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (o.value),
            value: (o.value),
        });
        (o.label);
        // @ts-ignore
        [apply, local, local, local, local, local, local, local, local, local, local, noteNameOptions,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-group-header" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-group-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    (__VLS_ctx.bpm);
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onBpmSlider) },
        type: "range",
        min: "20",
        max: "300",
        step: "1",
        value: (__VLS_ctx.bpm),
        ...{ class: "pref-slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    (__VLS_ctx.localSpeed.value);
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onSpeedSlider) },
        type: "range",
        min: "10",
        max: "200",
        step: "5",
        value: (__VLS_ctx.localSpeed.value),
        ...{ class: "pref-slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    (__VLS_ctx.local.transpose >= 0 ? '+' : '');
    (__VLS_ctx.local.transpose);
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onTransposeSlider) },
        type: "range",
        min: "-12",
        max: "12",
        step: "1",
        value: (__VLS_ctx.local.transpose),
        ...{ class: "pref-slider" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-slider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--inline" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stepper" },
    });
    /** @type {__VLS_StyleScopedClasses['stepper']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.local.countInMeasures = Math.max(0, __VLS_ctx.local.countInMeasures - 1);
                // @ts-ignore
                [local, local, local, local, local, bpm, bpm, onBpmSlider, localSpeed, localSpeed, onSpeedSlider, onTransposeSlider,];
            } },
        ...{ class: "step-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['step-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "step-val" },
    });
    /** @type {__VLS_StyleScopedClasses['step-val']} */ ;
    (__VLS_ctx.local.countInMeasures);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.visible))
                    return;
                __VLS_ctx.local.countInMeasures = Math.min(4, __VLS_ctx.local.countInMeasures + 1);
                // @ts-ignore
                [local, local, local,];
            } },
        ...{ class: "step-btn" },
    });
    /** @type {__VLS_StyleScopedClasses['step-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.twoStaffs);
    if (__VLS_ctx.tracks.length > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "pref-group-header" },
        });
        /** @type {__VLS_StyleScopedClasses['pref-group-header']} */ ;
        for (const [_, i] of __VLS_vFor((__VLS_ctx.tracks))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: "track-card" },
            });
            /** @type {__VLS_StyleScopedClasses['track-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "track-card-header" },
            });
            /** @type {__VLS_StyleScopedClasses['track-card-header']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-card-num" },
            });
            /** @type {__VLS_StyleScopedClasses['track-card-num']} */ ;
            (i + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-card-instr" },
            });
            /** @type {__VLS_StyleScopedClasses['track-card-instr']} */ ;
            (__VLS_ctx.trackDisplayName(i));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "track-row-checks" },
            });
            /** @type {__VLS_StyleScopedClasses['track-row-checks']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "check-label" },
            });
            /** @type {__VLS_StyleScopedClasses['check-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
            });
            (__VLS_ctx.local.tracks[i]);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "check-label" },
                ...{ class: ({ muted: __VLS_ctx.local.mute[i] }) },
            });
            /** @type {__VLS_StyleScopedClasses['check-label']} */ ;
            /** @type {__VLS_StyleScopedClasses['muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
            });
            (__VLS_ctx.local.mute[i]);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "track-row-slider" },
            });
            /** @type {__VLS_StyleScopedClasses['track-row-slider']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-slider-label" },
            });
            /** @type {__VLS_StyleScopedClasses['track-slider-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!(__VLS_ctx.visible))
                            return;
                        if (!(__VLS_ctx.tracks.length > 0))
                            return;
                        __VLS_ctx.setVolume(i, $event);
                        // @ts-ignore
                        [local, local, local, local, tracks, tracks, trackDisplayName, setVolume,];
                    } },
                type: "range",
                min: "0",
                max: "100",
                step: "5",
                value: (__VLS_ctx.local.volume?.[i] ?? __VLS_ctx.DEFAULT_VOLUME),
                ...{ class: "track-slider" },
            });
            /** @type {__VLS_StyleScopedClasses['track-slider']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-slider-val" },
            });
            /** @type {__VLS_StyleScopedClasses['track-slider-val']} */ ;
            (__VLS_ctx.local.volume?.[i] ?? __VLS_ctx.DEFAULT_VOLUME);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "track-row-select" },
            });
            /** @type {__VLS_StyleScopedClasses['track-row-select']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-slider-label" },
            });
            /** @type {__VLS_StyleScopedClasses['track-slider-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.local.instruments[i]),
                ...{ class: "pref-select track-instr-select" },
            });
            /** @type {__VLS_StyleScopedClasses['pref-select']} */ ;
            /** @type {__VLS_StyleScopedClasses['track-instr-select']} */ ;
            for (const [name, idx] of __VLS_vFor((__VLS_ctx.InstrumentNames))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (idx),
                    value: (idx),
                });
                (idx + 1);
                (name);
                // @ts-ignore
                [local, local, local, DEFAULT_VOLUME, DEFAULT_VOLUME, InstrumentNames,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "track-row-octave" },
            });
            /** @type {__VLS_StyleScopedClasses['track-row-octave']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "track-slider-label" },
            });
            /** @type {__VLS_StyleScopedClasses['track-slider-label']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "octave-btn-group" },
            });
            /** @type {__VLS_StyleScopedClasses['octave-btn-group']} */ ;
            for (const [opt] of __VLS_vFor((__VLS_ctx.octaveOpts))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.visible))
                                return;
                            if (!(__VLS_ctx.tracks.length > 0))
                                return;
                            __VLS_ctx.setOctaveShift(i, opt.value);
                            // @ts-ignore
                            [octaveOpts, setOctaveShift,];
                        } },
                    key: (opt.value),
                    ...{ class: "octave-btn" },
                    ...{ class: ({ active: __VLS_ctx.getOctaveShift(i) === opt.value }) },
                });
                /** @type {__VLS_StyleScopedClasses['octave-btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['active']} */ ;
                (opt.label);
                // @ts-ignore
                [getOctaveShift,];
            }
            // @ts-ignore
            [];
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-group-header" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-group-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--color" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--color']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "color-swatch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['color-swatch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "color-swatch" },
        ...{ style: ({ background: __VLS_ctx.shade1Hex }) },
    });
    /** @type {__VLS_StyleScopedClasses['color-swatch']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onShade1Input) },
        type: "color",
        value: (__VLS_ctx.shade1Hex),
        ...{ class: "color-input-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['color-input-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-item pref-item--color" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--color']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "color-swatch-label" },
    });
    /** @type {__VLS_StyleScopedClasses['color-swatch-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "color-swatch" },
        ...{ style: ({ background: __VLS_ctx.shade2Hex }) },
    });
    /** @type {__VLS_StyleScopedClasses['color-swatch']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (__VLS_ctx.onShade2Input) },
        type: "color",
        value: (__VLS_ctx.shade2Hex),
        ...{ class: "color-input-hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['color-input-hidden']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.useColors);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "pref-item pref-item--check" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pref-item--check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-title" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-title']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pref-sub" },
    });
    /** @type {__VLS_StyleScopedClasses['pref-sub']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (__VLS_ctx.local.colorAccidentals);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ style: {} },
    });
}
// @ts-ignore
[local, local, shade1Hex, shade1Hex, onShade1Input, shade2Hex, shade2Hex, onShade2Input,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
