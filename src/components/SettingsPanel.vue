<script setup lang="ts">
import { reactive, computed, watch } from 'vue';
import type { MidiOptions } from '@/midi/MidiFile';
import { NoteNameNone, NoteNameLetter, NoteNameFixedDoReMi, NoteNameMovableDoReMi, NoteNameFixedNumber, NoteNameMovableNumber } from '@/midi/MidiFile';
import type { MidiTrack } from '@/midi/MidiTrack';
import { InstrumentAbbreviations } from '@/midi/MidiFile';

const props = defineProps<{
  visible: boolean;
  options: MidiOptions;
  tracks: MidiTrack[];
}>();

const emit = defineEmits<{
  close: [];
  apply: [opts: MidiOptions];
}>();

// Deep-clone options into local state so edits don't affect live playback
// until "Apply" is clicked.
function cloneOpts(o: MidiOptions): MidiOptions {
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

const local = reactive<MidiOptions>(cloneOpts(props.options));

// Re-sync when the panel is opened
watch(() => props.visible, (v) => {
  if (v) Object.assign(local, cloneOpts(props.options));
});

// BPM ↔ tempo conversion helpers
const bpm = computed({
  get: () => Math.round(60_000_000 / local.tempo),
  set: (v: number) => { local.tempo = Math.round(60_000_000 / Math.max(10, Math.min(300, v))); },
});

// Packed RGB → CSS hex
function colorToCss(packed: number): string {
  const r = (packed >> 16) & 0xff;
  const g = (packed >> 8)  & 0xff;
  const b =  packed        & 0xff;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function cssToColor(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return ((n >> 16) & 0xff) << 16 | ((n >> 8) & 0xff) << 8 | (n & 0xff);
}

const shade1Hex = computed({
  get: () => colorToCss(local.shade1Color),
  set: (v: string) => { local.shade1Color = cssToColor(v); },
});
const shade2Hex = computed({
  get: () => colorToCss(local.shade2Color),
  set: (v: string) => { local.shade2Color = cssToColor(v); },
});

const noteNameOptions = [
  { value: NoteNameNone,           label: 'None' },
  { value: NoteNameLetter,         label: 'Letter (A–G)' },
  { value: NoteNameFixedDoReMi,    label: 'Fixed Do-Re-Mi' },
  { value: NoteNameMovableDoReMi,  label: 'Movable Do-Re-Mi' },
  { value: NoteNameFixedNumber,    label: 'Fixed Number' },
  { value: NoteNameMovableNumber,  label: 'Movable Number' },
];

function apply() {
  emit('apply', cloneOpts(local as MidiOptions));
}
function close() {
  emit('close');
}
</script>

<template>
  <div v-if="visible" class="settings-overlay" @click.self="close">
    <div class="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
      <header class="settings-header">
        <span class="settings-title">Settings</span>
        <button class="btn-close" @click="close" aria-label="Close">✕</button>
      </header>

      <div class="settings-body">

        <!-- ── Tempo / BPM ── -->
        <section class="settings-section">
          <h3 class="section-title">Playback</h3>

          <label class="field-row">
            <span class="field-label">BPM</span>
            <input type="number" min="10" max="300" step="1"
                   :value="bpm" @change="bpm = Number(($event.target as HTMLInputElement).value)"
                   class="input-sm" />
          </label>

          <label class="field-row">
            <span class="field-label">Count-in measures</span>
            <input type="number" min="0" max="4" step="1"
                   v-model.number="local.countInMeasures"
                   class="input-sm" />
          </label>

          <label class="field-row">
            <span class="field-label">Transpose (semitones)</span>
            <input type="number" min="-12" max="12" step="1"
                   v-model.number="local.transpose"
                   class="input-sm" />
          </label>
        </section>

        <!-- ── Display ── -->
        <section class="settings-section">
          <h3 class="section-title">Display</h3>

          <label class="field-row">
            <span class="field-label">Two staves (piano layout)</span>
            <input type="checkbox" v-model="local.twoStaffs" />
          </label>

          <label class="field-row">
            <span class="field-label">Scroll vertically</span>
            <input type="checkbox" v-model="local.scrollVert" />
          </label>

          <label class="field-row">
            <span class="field-label">Large note size</span>
            <input type="checkbox" v-model="local.largeNoteSize" />
          </label>

          <label class="field-row">
            <span class="field-label">Show measure numbers</span>
            <input type="checkbox" v-model="local.showMeasures" />
          </label>

          <label class="field-row">
            <span class="field-label">Show beat markers</span>
            <input type="checkbox" v-model="local.showBeatMarkers" />
          </label>

          <label class="field-row">
            <span class="field-label">Show track labels</span>
            <input type="checkbox" v-model="local.showTrackLabels" />
          </label>

          <label class="field-row">
            <span class="field-label">Show lyrics</span>
            <input type="checkbox" v-model="local.showLyrics" />
          </label>

          <label class="field-row">
            <span class="field-label">Show piano keyboard</span>
            <input type="checkbox" v-model="local.showPiano" />
          </label>

          <label class="field-row">
            <span class="field-label">Note letters</span>
            <select v-model.number="local.showNoteLetters" class="select-sm">
              <option v-for="o in noteNameOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </section>

        <!-- ── Colors ── -->
        <section class="settings-section">
          <h3 class="section-title">Colors</h3>

          <label class="field-row">
            <span class="field-label">Current-note shade</span>
            <input type="color" :value="shade1Hex"
                   @input="shade1Hex = ($event.target as HTMLInputElement).value" />
          </label>

          <label class="field-row">
            <span class="field-label">Second-track shade</span>
            <input type="color" :value="shade2Hex"
                   @input="shade2Hex = ($event.target as HTMLInputElement).value" />
          </label>

          <label class="field-row">
            <span class="field-label">Use per-note colors</span>
            <input type="checkbox" v-model="local.useColors" />
          </label>

          <label class="field-row">
            <span class="field-label">Color accidentals</span>
            <input type="checkbox" v-model="local.colorAccidentals" />
          </label>
        </section>

        <!-- ── Tracks ── -->
        <section v-if="tracks.length > 0" class="settings-section">
          <h3 class="section-title">Tracks</h3>
          <div v-for="(track, i) in tracks" :key="i" class="track-row">
            <span class="track-name">Track {{ i + 1 }}
              <em v-if="local.trackInstrumentNames?.[i]">– {{ local.trackInstrumentNames[i] }}</em>
            </span>
            <label class="track-check" title="Include in sheet music">
              <input type="checkbox" v-model="local.tracks[i]" /> Show
            </label>
            <label class="track-check" title="Mute audio">
              <input type="checkbox" v-model="local.mute[i]" /> Mute
            </label>
            <label class="track-vol" title="Volume">
              Vol
              <input type="range" min="0" max="100" step="5"
                     :value="local.volume?.[i] ?? 100"
                     @input="if (local.volume) local.volume[i] = Number(($event.target as HTMLInputElement).value)"
                     class="vol-slider" />
              {{ local.volume?.[i] ?? 100 }}%
            </label>
          </div>
        </section>

      </div>

      <footer class="settings-footer">
        <button class="btn-cancel" @click="close">Cancel</button>
        <button class="btn-apply"  @click="apply">Apply</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  z-index: 1000;
  padding: 0.5rem;
}

.settings-panel {
  background: #1e1e1e;
  color: #eee;
  width: 340px;
  max-width: 100vw;
  max-height: calc(100vh - 1rem);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  background: #2c2c2c;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}
.settings-title { font-size: 1rem; font-weight: 600; }
.btn-close {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 0.25rem;
}
.btn-close:hover { color: #fff; }

.settings-body {
  overflow-y: auto;
  flex: 1;
  padding: 0.5rem 0.75rem;
}

.settings-section {
  margin-bottom: 1rem;
}
.section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.08em;
  margin-bottom: 0.4rem;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.2rem 0;
  font-size: 0.85rem;
}
.field-label { flex: 1; }

.input-sm {
  width: 70px;
  background: #333;
  border: 1px solid #555;
  border-radius: 3px;
  color: #eee;
  padding: 0.15rem 0.35rem;
  font-size: 0.85rem;
}
.select-sm {
  background: #333;
  border: 1px solid #555;
  border-radius: 3px;
  color: #eee;
  font-size: 0.8rem;
  padding: 0.15rem 0.2rem;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.25rem 0;
  border-bottom: 1px solid #333;
  font-size: 0.82rem;
}
.track-name { flex: 1; min-width: 80px; }
.track-check { display: flex; align-items: center; gap: 0.2rem; white-space: nowrap; }
.track-vol   { display: flex; align-items: center; gap: 0.25rem; white-space: nowrap; font-size: 0.78rem; }
.vol-slider  { width: 60px; }

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #2c2c2c;
  border-top: 1px solid #444;
  flex-shrink: 0;
}
.btn-cancel, .btn-apply {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.35rem 0.9rem;
}
.btn-cancel { background: #444; color: #ccc; }
.btn-cancel:hover { background: #555; }
.btn-apply  { background: #1a6e1a; color: #fff; }
.btn-apply:hover { background: #28a228; }
</style>
