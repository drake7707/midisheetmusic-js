<script setup lang="ts">
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
import type { MidiOptions } from '@/midi/MidiFile';
import {
  NoteNameNone,
  NoteNameLetter,
  NoteNameFixedDoReMi,
  NoteNameMovableDoReMi,
  NoteNameFixedNumber,
  NoteNameMovableNumber,
} from '@/midi/MidiFile';
import type { MidiTrack } from '@/midi/MidiTrack';

const props = defineProps<{
  visible: boolean;
  options: MidiOptions;
  tracks: MidiTrack[];
  speedPct: number;
}>();

const emit = defineEmits<{
  close: [];
  apply: [opts: MidiOptions, speedPct: number];
}>();

// ── Deep-clone helpers ────────────────────────────────────────────────────────
function cloneOpts(o: MidiOptions): MidiOptions {
  return {
    ...o,
    instruments:          [...o.instruments],
    mute:                 [...o.mute],
    tracks:               [...o.tracks],
    volume:               o.volume              ? [...o.volume]              : null,
    trackOctaveShift:     o.trackOctaveShift    ? [...o.trackOctaveShift]    : null,
    trackInstrumentNames: o.trackInstrumentNames? [...o.trackInstrumentNames]: null,
    noteColors:           [...o.noteColors],
  };
}

const local      = reactive<MidiOptions>(cloneOpts(props.options));
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
  set: (v: number) => {
    local.tempo = Math.round(MICROS_PER_MINUTE / Math.max(10, Math.min(300, v)));
  },
});

// ── Color pickers ─────────────────────────────────────────────────────────────
function packedToHex(packed: number): string {
  const r = (packed >> 16) & 0xff;
  const g = (packed >>  8) & 0xff;
  const b =  packed        & 0xff;
  return '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');
}
function hexToPacked(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return ((n >> 16) & 0xff) << 16 | ((n >> 8) & 0xff) << 8 | (n & 0xff);
}

const shade1Hex = computed({
  get: () => packedToHex(local.shade1Color),
  set: (v: string) => { local.shade1Color = hexToPacked(v); },
});
const shade2Hex = computed({
  get: () => packedToHex(local.shade2Color),
  set: (v: string) => { local.shade2Color = hexToPacked(v); },
});

// ── Note-letter options ───────────────────────────────────────────────────────
const noteNameOptions = [
  { value: NoteNameNone,           label: 'None' },
  { value: NoteNameLetter,         label: 'Letter (A – G)' },
  { value: NoteNameFixedDoReMi,    label: 'Fixed Do-Re-Mi' },
  { value: NoteNameMovableDoReMi,  label: 'Movable Do-Re-Mi' },
  { value: NoteNameFixedNumber,    label: 'Fixed Number' },
  { value: NoteNameMovableNumber,  label: 'Movable Number' },
];

// ── Instrument list (General MIDI, 0-indexed) ─────────────────────────────────
// Full names paired with abbreviations for the selector
const InstrumentNames: string[] = [
  'Acoustic Grand Piano','Bright Acoustic Piano','Electric Grand Piano',
  'Honky-tonk Piano','Electric Piano 1','Electric Piano 2',
  'Harpsichord','Clavinet','Celesta','Glockenspiel','Music Box',
  'Vibraphone','Marimba','Xylophone','Tubular Bells','Dulcimer',
  'Drawbar Organ','Percussive Organ','Rock Organ','Church Organ',
  'Reed Organ','Accordion','Harmonica','Tango Accordion',
  'Acoustic Guitar (nylon)','Acoustic Guitar (steel)',
  'Electric Guitar (jazz)','Electric Guitar (clean)','Electric Guitar (muted)',
  'Overdriven Guitar','Distortion Guitar','Guitar Harmonics',
  'Acoustic Bass','Electric Bass (finger)','Electric Bass (pick)',
  'Fretless Bass','Slap Bass 1','Slap Bass 2','Synth Bass 1','Synth Bass 2',
  'Violin','Viola','Cello','Contrabass','Tremolo Strings','Pizzicato Strings',
  'Orchestral Harp','Timpani','String Ensemble 1','String Ensemble 2',
  'Synth Strings 1','Synth Strings 2','Choir Aahs','Voice Oohs','Synth Choir',
  'Orchestra Hit','Trumpet','Trombone','Tuba','Muted Trumpet','French Horn',
  'Brass Section','Synth Brass 1','Synth Brass 2',
  'Soprano Sax','Alto Sax','Tenor Sax','Baritone Sax',
  'Oboe','English Horn','Bassoon','Clarinet',
  'Piccolo','Flute','Recorder','Pan Flute','Blown Bottle','Shakuhachi',
  'Whistle','Ocarina',
  'Lead 1 (square)','Lead 2 (sawtooth)','Lead 3 (calliope)','Lead 4 (chiff)',
  'Lead 5 (charang)','Lead 6 (voice)','Lead 7 (fifths)','Lead 8 (bass+lead)',
  'Pad 1 (new age)','Pad 2 (warm)','Pad 3 (polysynth)','Pad 4 (choir)',
  'Pad 5 (bowed)','Pad 6 (metallic)','Pad 7 (halo)','Pad 8 (sweep)',
  'FX 1 (rain)','FX 2 (soundtrack)','FX 3 (crystal)','FX 4 (atmosphere)',
  'FX 5 (brightness)','FX 6 (goblins)','FX 7 (echoes)','FX 8 (sci-fi)',
  'Sitar','Banjo','Shamisen','Koto','Kalimba','Bagpipe','Fiddle','Shanai',
  'Tinkle Bell','Agogo','Steel Drums','Woodblock','Taiko Drum','Melodic Tom',
  'Synth Drum','Reverse Cymbal',
  'Guitar Fret Noise','Breath Noise','Seashore','Bird Tweet',
  'Telephone Ring','Helicopter','Applause','Gunshot',
  'Percussion',
];

// ── Track helpers ─────────────────────────────────────────────────────────────
function trackDisplayName(i: number): string {
  const abbr = local.trackInstrumentNames?.[i];
  const instr = local.instruments[i] ?? 0;
  const full  = InstrumentNames[instr] ?? 'Unknown';
  return abbr ? `${abbr} — ${full}` : full;
}

function getOctaveShift(i: number): number {
  return local.trackOctaveShift?.[i] ?? 0;
}
function setOctaveShift(i: number, v: number) {
  if (local.trackOctaveShift) local.trackOctaveShift[i] = v;
}

// ── Apply / cancel ─────────────────────────────────────────────────────────────
function setVolume(i: number, evt: Event) {
  if (local.volume) local.volume[i] = Number((evt.target as HTMLInputElement).value);
}
function setOctaveShiftInput(i: number, evt: Event) {
  setOctaveShift(i, Number((evt.target as HTMLInputElement).value));
}
function onBpmSlider(evt: Event) {
  bpm.value = Number((evt.target as HTMLInputElement).value);
}
function onSpeedSlider(evt: Event) {
  localSpeed.value = Number((evt.target as HTMLInputElement).value);
}
function onTransposeSlider(evt: Event) {
  local.transpose = Number((evt.target as HTMLInputElement).value);
}
function onShade1Input(evt: Event) {
  shade1Hex.value = (evt.target as HTMLInputElement).value;
}
function onShade2Input(evt: Event) {
  shade2Hex.value = (evt.target as HTMLInputElement).value;
}

function apply() {
  emit('apply', cloneOpts(local as MidiOptions), localSpeed.value);
  emit('close');
}
</script>

<template>
  <Transition name="page-slide">
    <div v-if="visible" class="settings-page" role="dialog" aria-modal="true" aria-label="All Settings">

      <!-- ── Top App Bar (Android-style) ─────────────────────────────────── -->
      <header class="app-bar">
        <button class="btn-back" @click="$emit('close')" aria-label="Back">‹</button>
        <span class="app-bar-title">Settings</span>
        <button class="btn-text-apply" @click="apply">APPLY</button>
      </header>

      <!-- ── Scrollable preference content ───────────────────────────────── -->
      <div class="prefs-scroll">

        <!-- ════════════════════════════════════════════════════════════════
             SECTION 1 · SHEET MUSIC
             ════════════════════════════════════════════════════════════════ -->
        <div class="pref-group-header">Sheet Music</div>

        <!-- Scroll direction -->
        <div class="pref-item pref-item--inline">
          <div class="pref-title">Scroll direction</div>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="local.scrollVert" :value="true" />
              Vertical
            </label>
            <label class="radio-label">
              <input type="radio" v-model="local.scrollVert" :value="false" />
              Horizontal
            </label>
          </div>
        </div>

        <!-- Note size -->
        <div class="pref-item pref-item--inline">
          <div class="pref-title">Note size</div>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="local.largeNoteSize" :value="false" />
              Normal
            </label>
            <label class="radio-label">
              <input type="radio" v-model="local.largeNoteSize" :value="true" />
              Large
            </label>
          </div>
        </div>

        <!-- Show measure numbers -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Show measure numbers</div>
            <div class="pref-sub">Display measure numbers above the staff</div>
          </div>
          <input type="checkbox" v-model="local.showMeasures" />
        </label>

        <!-- Show beat markers -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Show beat markers</div>
            <div class="pref-sub">Small tick marks above each beat</div>
          </div>
          <input type="checkbox" v-model="local.showBeatMarkers" />
        </label>

        <!-- Show track labels -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Show track labels</div>
            <div class="pref-sub">Instrument name above each staff</div>
          </div>
          <input type="checkbox" v-model="local.showTrackLabels" />
        </label>

        <!-- Show lyrics -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Show lyrics</div>
            <div class="pref-sub">Display embedded lyric text</div>
          </div>
          <input type="checkbox" v-model="local.showLyrics" />
        </label>

        <!-- Show piano keyboard -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Show piano keyboard</div>
            <div class="pref-sub">On-screen keyboard at the bottom</div>
          </div>
          <input type="checkbox" v-model="local.showPiano" />
        </label>

        <!-- Note letters -->
        <div class="pref-item pref-item--select">
          <div>
            <div class="pref-title">Note letters</div>
            <div class="pref-sub">Show letter names inside noteheads</div>
          </div>
          <select v-model.number="local.showNoteLetters" class="pref-select">
            <option v-for="o in noteNameOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>


        <!-- ════════════════════════════════════════════════════════════════
             SECTION 2 · PLAYBACK
             ════════════════════════════════════════════════════════════════ -->
        <div class="pref-group-header">Playback</div>

        <!-- BPM -->
        <div class="pref-item pref-item--slider">
          <div class="pref-title">Tempo — {{ bpm }} BPM</div>
          <input
            type="range" min="20" max="300" step="1"
            :value="bpm"
            @input="onBpmSlider"
            class="pref-slider"
          />
        </div>

        <!-- Speed -->
        <div class="pref-item pref-item--slider">
          <div class="pref-title">Speed — {{ localSpeed.value }}%</div>
          <input
            type="range" min="10" max="200" step="5"
            :value="localSpeed.value"
            @input="onSpeedSlider"
            class="pref-slider"
          />
        </div>

        <!-- Transpose -->
        <div class="pref-item pref-item--slider">
          <div class="pref-title">Transpose — {{ local.transpose >= 0 ? '+' : '' }}{{ local.transpose }} semitones</div>
          <input
            type="range" min="-12" max="12" step="1"
            :value="local.transpose"
            @input="onTransposeSlider"
            class="pref-slider"
          />
        </div>

        <!-- Count-in measures -->
        <div class="pref-item pref-item--inline">
          <div>
            <div class="pref-title">Count-in measures</div>
            <div class="pref-sub">Click beats played before the music starts</div>
          </div>
          <div class="stepper">
            <button class="step-btn" @click="local.countInMeasures = Math.max(0, local.countInMeasures - 1)">−</button>
            <span class="step-val">{{ local.countInMeasures }}</span>
            <button class="step-btn" @click="local.countInMeasures = Math.min(4, local.countInMeasures + 1)">+</button>
          </div>
        </div>

        <!-- Two staves -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Two staves</div>
            <div class="pref-sub">Combine all tracks into treble + bass clef</div>
          </div>
          <input type="checkbox" v-model="local.twoStaffs" />
        </label>


        <!-- ════════════════════════════════════════════════════════════════
             SECTION 3 · TRACKS  (combined per-track cards)
             ════════════════════════════════════════════════════════════════ -->
        <template v-if="tracks.length > 0">
          <div class="pref-group-header">Tracks</div>

          <div v-for="(_, i) in tracks" :key="i" class="track-card">

            <!-- Track name / instrument header -->
            <div class="track-card-header">
              <span class="track-card-num">Track {{ i + 1 }}</span>
              <span class="track-card-instr">{{ trackDisplayName(i) }}</span>
            </div>

            <!-- Row 1: Show / Mute checkboxes -->
            <div class="track-row-checks">
              <label class="check-label">
                <input type="checkbox" v-model="local.tracks[i]" />
                <span>Show in sheet</span>
              </label>
              <label class="check-label" :class="{ muted: local.mute[i] }">
                <input type="checkbox" v-model="local.mute[i]" />
                <span>Mute audio</span>
              </label>
            </div>

            <!-- Row 2: Volume -->
            <div class="track-row-slider">
              <span class="track-slider-label">Volume</span>
              <input
                type="range" min="0" max="100" step="5"
                :value="local.volume?.[i] ?? DEFAULT_VOLUME"
                @input="setVolume(i, $event)"
                class="track-slider"
              />
              <span class="track-slider-val">{{ local.volume?.[i] ?? DEFAULT_VOLUME }}%</span>
            </div>

            <!-- Row 3: Instrument selector -->
            <div class="track-row-select">
              <span class="track-slider-label">Instrument</span>
              <select
                v-model.number="local.instruments[i]"
                class="pref-select track-instr-select"
              >
                <option v-for="(name, idx) in InstrumentNames" :key="idx" :value="idx">
                  {{ idx + 1 }}. {{ name }}
                </option>
              </select>
            </div>

            <!-- Row 4: Octave shift -->
            <div class="track-row-slider">
              <span class="track-slider-label">Octave shift</span>
              <input
                type="range" min="-3" max="3" step="1"
                :value="getOctaveShift(i)"
                @input="setOctaveShiftInput(i, $event)"
                class="track-slider"
              />
              <span class="track-slider-val">
                {{ getOctaveShift(i) >= 0 ? '+' : '' }}{{ getOctaveShift(i) }}
              </span>
            </div>

          </div><!-- /track-card -->
        </template>


        <!-- ════════════════════════════════════════════════════════════════
             SECTION 4 · COLORS
             ════════════════════════════════════════════════════════════════ -->
        <div class="pref-group-header">Colors</div>

        <!-- Shade color 1 (current note / right hand) -->
        <div class="pref-item pref-item--color">
          <div>
            <div class="pref-title">Current note highlight</div>
            <div class="pref-sub">Shade color for the active / right-hand notes</div>
          </div>
          <label class="color-swatch-label">
            <span class="color-swatch" :style="{ background: shade1Hex }" />
            <input type="color" :value="shade1Hex"
                   @input="onShade1Input"
                   class="color-input-hidden" />
          </label>
        </div>

        <!-- Shade color 2 (second track / left hand) -->
        <div class="pref-item pref-item--color">
          <div>
            <div class="pref-title">Second track highlight</div>
            <div class="pref-sub">Shade color for the second / left-hand notes</div>
          </div>
          <label class="color-swatch-label">
            <span class="color-swatch" :style="{ background: shade2Hex }" />
            <input type="color" :value="shade2Hex"
                   @input="onShade2Input"
                   class="color-input-hidden" />
          </label>
        </div>

        <!-- Use per-note colors -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Use note colors</div>
            <div class="pref-sub">Color noteheads by pitch class</div>
          </div>
          <input type="checkbox" v-model="local.useColors" />
        </label>

        <!-- Colorize accidentals -->
        <label class="pref-item pref-item--check">
          <div>
            <div class="pref-title">Colorize accidentals</div>
            <div class="pref-sub">Highlight sharp/flat notes in red</div>
          </div>
          <input type="checkbox" v-model="local.colorAccidentals" />
        </label>

        <!-- Bottom spacer -->
        <div style="height: 1.5rem" />

      </div><!-- /.prefs-scroll -->
    </div><!-- /.settings-page -->
  </Transition>
</template>

<style scoped>
/* ── Page container ──────────────────────────────────────────────────────────── */
.settings-page {
  position: fixed;
  inset: 0;
  background: #121212;
  color: #eee;
  display: flex;
  flex-direction: column;
  z-index: 950;
  overflow: hidden;
}

/* Slide up from bottom (matches Android activity transition) */
.page-slide-enter-active, .page-slide-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.page-slide-enter-from,   .page-slide-leave-to     { transform: translateY(100%); }

/* ── App bar ─────────────────────────────────────────────────────────────────── */
.app-bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.5rem 0 0.25rem;
  height: 56px;
  background: #1e1e1e;
  border-bottom: 1px solid #2c2c2c;
  flex-shrink: 0;
}
.btn-back {
  background: none; border: none;
  color: #eee; font-size: 2rem; line-height: 1;
  cursor: pointer; padding: 0 0.4rem; min-width: 44px;
}
.btn-back:hover { color: #fff; }
.app-bar-title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.btn-text-apply {
  background: none; border: none;
  color: #4fc3f7; font-size: 0.85rem; font-weight: 700;
  letter-spacing: 0.08em; cursor: pointer; padding: 0 0.5rem;
}
.btn-text-apply:hover { color: #81d4fa; }

/* ── Scrollable preference list ─────────────────────────────────────────────── */
.prefs-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 1rem;
}

/* Group headers (like Android PreferenceCategory) */
.pref-group-header {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4fc3f7;
  padding: 1.1rem 1rem 0.3rem;
  border-top: 1px solid #2a2a2a;
  margin-top: 0.25rem;
}
.pref-group-header:first-child { border-top: none; }

/* Base pref item */
.pref-item {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid #1e1e1e;
  background: #1a1a1a;
}
.pref-title { font-size: 0.92rem; }
.pref-sub   { font-size: 0.76rem; color: #888; margin-top: 0.1rem; }

/* Checkbox pref */
.pref-item--check {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
}
.pref-item--check input[type="checkbox"] {
  width: 18px; height: 18px; flex-shrink: 0; cursor: pointer;
  accent-color: #4fc3f7;
}

/* Inline (radio / stepper) pref */
.pref-item--inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

/* Slider pref */
.pref-item--slider { display: flex; flex-direction: column; gap: 0.35rem; }
.pref-slider { width: 100%; accent-color: #4fc3f7; }

/* Select pref */
.pref-item--select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.pref-select {
  background: #2c2c2c;
  border: 1px solid #444;
  border-radius: 4px;
  color: #eee;
  font-size: 0.82rem;
  padding: 0.25rem 0.4rem;
  max-width: 170px;
}

/* Color pref */
.pref-item--color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.color-swatch-label { display: flex; align-items: center; cursor: pointer; }
.color-swatch {
  width: 36px; height: 36px;
  border-radius: 4px;
  border: 2px solid #555;
  display: block;
}
.color-input-hidden {
  position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;
}

/* Radio group */
.radio-group { display: flex; gap: 1rem; }
.radio-label {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.85rem; cursor: pointer;
}
.radio-label input { accent-color: #4fc3f7; }

/* Stepper */
.stepper { display: flex; align-items: center; gap: 0.35rem; }
.step-btn {
  width: 30px; height: 30px;
  background: #333; border: 1px solid #555; border-radius: 4px;
  color: #eee; font-size: 1.1rem; cursor: pointer; line-height: 1;
}
.step-btn:hover { background: #555; }
.step-val { min-width: 24px; text-align: center; font-size: 0.95rem; }

/* ── Track cards ──────────────────────────────────────────────────────────────── */
.track-card {
  background: #1e1e1e;
  border-bottom: 2px solid #2c2c2c;
  margin-bottom: 0;
}

.track-card-header {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.55rem 1rem 0.3rem;
  background: #252525;
  border-bottom: 1px solid #2c2c2c;
}
.track-card-num {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
}
.track-card-instr {
  font-size: 0.88rem;
  font-weight: 500;
  color: #ccc;
}

.track-row-checks {
  display: flex;
  gap: 1.5rem;
  padding: 0.45rem 1rem;
  background: #1e1e1e;
  border-bottom: 1px solid #252525;
}
.check-label {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.85rem; cursor: pointer;
}
.check-label.muted { color: #e57373; }
.check-label input[type="checkbox"] { accent-color: #4fc3f7; }

.track-row-slider {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid #252525;
}
.track-slider-label { font-size: 0.78rem; color: #888; width: 70px; flex-shrink: 0; }
.track-slider { flex: 1; accent-color: #4fc3f7; }
.track-slider-val { font-size: 0.78rem; color: #aaa; width: 36px; text-align: right; flex-shrink: 0; }

.track-row-select {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 1rem;
  border-bottom: 1px solid #252525;
}
.track-instr-select {
  flex: 1;
  max-width: none;
  font-size: 0.82rem;
}
</style>
