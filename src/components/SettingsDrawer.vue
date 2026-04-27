<script setup lang="ts">
/**
 * SettingsDrawer — quick-access slide-in drawer (Android navigation-drawer style).
 * Shows BPM, twoStaffs, speed, and per-track combined cards.
 * "All Settings" button opens the full SettingsPage.
 */
import { reactive, computed, watch } from 'vue';
import type { MidiOptions } from '@/midi/MidiFile';
import type { MidiTrack } from '@/midi/MidiTrack';

const props = defineProps<{
  visible: boolean;
  options: MidiOptions;
  tracks: MidiTrack[];
  speedPct: number;
}>();

const emit = defineEmits<{
  close: [];
  openFullSettings: [];
  apply: [opts: MidiOptions, speedPct: number];
}>();

// ── Local state (mirror of props so changes are staged until Apply) ──────────
function cloneOpts(o: MidiOptions): MidiOptions {
  return {
    ...o,
    instruments:         [...o.instruments],
    mute:                [...o.mute],
    tracks:              [...o.tracks],
    volume:              o.volume              ? [...o.volume]              : null,
    trackOctaveShift:    o.trackOctaveShift    ? [...o.trackOctaveShift]    : null,
    trackInstrumentNames:o.trackInstrumentNames? [...o.trackInstrumentNames]: null,
    noteColors:          [...o.noteColors],
  };
}

const local       = reactive<MidiOptions>(cloneOpts(props.options));
const localSpeed  = reactive({ value: props.speedPct });

watch(() => props.visible, (v) => {
  if (v) {
    Object.assign(local, cloneOpts(props.options));
    localSpeed.value = props.speedPct;
  }
});

// ── BPM ↔ tempo ───────────────────────────────────────────────────────────────
const MICROS_PER_MINUTE = 60_000_000;
/** Default track volume (0–100). */
const DEFAULT_VOLUME = 100;

const bpm = computed({
  get: () => Math.round(MICROS_PER_MINUTE / local.tempo),
  set: (v: number) => {
    local.tempo = Math.round(MICROS_PER_MINUTE / Math.max(10, Math.min(300, v)));
  },
});

function onBpmInput(evt: Event) {
  const v = parseInt((evt.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) bpm.value = v;
}

function setVolume(i: number, evt: Event) {
  if (local.volume) local.volume[i] = Number((evt.target as HTMLInputElement).value);
}

function applyAndClose() {
  emit('apply', cloneOpts(local as MidiOptions), localSpeed.value);
  emit('close');
}

function trackName(i: number): string {
  const name = local.trackInstrumentNames?.[i];
  return name ? name : `Track ${i + 1}`;
}
</script>

<template>
  <!-- Overlay backdrop -->
  <Transition name="fade">
    <div v-if="visible" class="drawer-backdrop" @click.self="$emit('close')" />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="slide-right">
    <div v-if="visible" class="drawer" role="dialog" aria-modal="true" aria-label="Quick Settings">

      <!-- Header -->
      <div class="drawer-header">
        <span class="drawer-title">Settings</span>
        <button class="btn-close" @click="$emit('close')" aria-label="Close">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="drawer-body">

        <!-- ── Tempo / BPM ─────────────────────────────────── -->
        <div class="section-label">TEMPO</div>
        <div class="row-between">
          <span class="row-title">BPM</span>
          <div class="bpm-controls">
            <button class="bpm-btn" @click="bpm = bpm - 1">−</button>
            <input
              type="number" min="10" max="300" step="1"
              :value="bpm"
              @change="onBpmInput"
              class="bpm-input"
            />
            <button class="bpm-btn" @click="bpm = bpm + 1">+</button>
          </div>
        </div>

        <!-- ── Speed ──────────────────────────────────────── -->
        <div class="section-label">SPEED</div>
        <div class="row-between">
          <span class="row-title">Speed: {{ localSpeed.value }}%</span>
          <input
            type="range" min="10" max="200" step="5"
            v-model.number="localSpeed.value"
            class="slider-wide"
          />
        </div>

        <!-- ── Two Staves ──────────────────────────────────── -->
        <div class="section-label">LAYOUT</div>
        <div class="row-between" @click="local.twoStaffs = !local.twoStaffs" role="button">
          <div>
            <div class="row-title">Two Staves</div>
            <div class="row-sub">Combine into treble + bass clef</div>
          </div>
          <div class="toggle" :class="{ on: local.twoStaffs }">
            <div class="toggle-thumb" />
          </div>
        </div>

        <!-- ── Show Piano ──────────────────────────────────── -->
        <div class="row-between" @click="local.showPiano = !local.showPiano" role="button">
          <div>
            <div class="row-title">Show Piano</div>
            <div class="row-sub">Display keyboard at the bottom</div>
          </div>
          <div class="toggle" :class="{ on: local.showPiano }">
            <div class="toggle-thumb" />
          </div>
        </div>

        <!-- ── Tracks ──────────────────────────────────────── -->
        <template v-if="tracks.length > 0">
          <div class="section-label">TRACKS</div>
          <div
            v-for="(_, i) in tracks"
            :key="i"
            class="track-card"
          >
            <!-- Track header -->
            <div class="track-header">
              <span class="track-name">{{ trackName(i) }}</span>
            </div>

            <!-- Combined controls row -->
            <div class="track-controls">
              <!-- Show in sheet -->
              <label class="track-toggle-label">
                <input type="checkbox" v-model="local.tracks[i]" />
                <span>Show</span>
              </label>

              <!-- Mute audio -->
              <label class="track-toggle-label" :class="{ muted: local.mute[i] }">
                <input type="checkbox" v-model="local.mute[i]" />
                <span>Mute</span>
              </label>
            </div>

            <!-- Volume slider -->
            <div class="track-vol-row">
              <span class="track-vol-label">Vol</span>
              <input
                type="range" min="0" max="100" step="5"
                :value="local.volume?.[i] ?? DEFAULT_VOLUME"
              @input="setVolume(i, $event)"
                class="slider-wide"
              />
              <span class="track-vol-pct">{{ local.volume?.[i] ?? DEFAULT_VOLUME }}%</span>
            </div>
          </div>
        </template>

      </div><!-- /.drawer-body -->

      <!-- Footer: Apply + All Settings -->
      <div class="drawer-footer">
        <button class="btn-all-settings" @click="$emit('openFullSettings')">
          All Settings ›
        </button>
        <button class="btn-apply" @click="applyAndClose">Apply</button>
      </div>

    </div><!-- /.drawer -->
  </Transition>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 900;
}

/* ── Drawer ───────────────────────────────────────────────────────────────── */
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  max-width: 90vw;
  background: #1e1e1e;
  color: #eee;
  display: flex;
  flex-direction: column;
  z-index: 901;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.6);
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active   { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to        { opacity: 0; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease; }
.slide-right-enter-from,   .slide-right-leave-to     { transform: translateX(100%); }

/* ── Header ───────────────────────────────────────────────────────────────── */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #2c2c2c;
  border-bottom: 1px solid #3a3a3a;
  flex-shrink: 0;
}
.drawer-title { font-size: 1.05rem; font-weight: 600; letter-spacing: 0.02em; }
.btn-close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 1rem; padding: 0 0.25rem; }
.btn-close:hover { color: #fff; }

/* ── Body ─────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #888;
  padding: 0.6rem 1rem 0.2rem;
  text-transform: uppercase;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  cursor: pointer;
  transition: background 0.1s;
}
.row-between:hover { background: rgba(255,255,255,0.06); }
.row-title { font-size: 0.9rem; }
.row-sub   { font-size: 0.75rem; color: #888; margin-top: 0.1rem; }

/* BPM */
.bpm-controls { display: flex; align-items: center; gap: 0.25rem; }
.bpm-btn {
  width: 28px; height: 28px;
  background: #444; border: none; border-radius: 4px;
  color: #eee; font-size: 1.1rem; cursor: pointer; line-height: 1;
}
.bpm-btn:hover { background: #666; }
.bpm-input {
  width: 54px; text-align: center;
  background: #333; border: 1px solid #555; border-radius: 4px;
  color: #eee; font-size: 0.9rem; padding: 0.2rem 0.25rem;
}
.bpm-input::-webkit-outer-spin-button,
.bpm-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.bpm-input[type=number] { -moz-appearance: textfield; }

.slider-wide { flex: 1; min-width: 0; }

/* Toggle switch */
.toggle {
  width: 40px; height: 22px;
  background: #555; border-radius: 11px;
  position: relative; flex-shrink: 0;
  transition: background 0.2s;
  cursor: pointer;
}
.toggle.on { background: #1a8a1a; }
.toggle-thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: #fff; border-radius: 50%;
  transition: left 0.2s;
}
.toggle.on .toggle-thumb { left: 20px; }

/* ── Track cards ──────────────────────────────────────────────────────────── */
.track-card {
  margin: 0.35rem 0.75rem;
  background: #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #3a3a3a;
}
.track-header {
  background: #333;
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid #3a3a3a;
}
.track-name { font-size: 0.88rem; font-weight: 600; }
.track-controls {
  display: flex;
  gap: 1rem;
  padding: 0.4rem 0.75rem;
}
.track-toggle-label {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.82rem; cursor: pointer;
}
.track-toggle-label.muted { color: #e57373; }
.track-vol-row {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.25rem 0.75rem 0.5rem;
}
.track-vol-label { font-size: 0.78rem; color: #888; flex-shrink: 0; }
.track-vol-pct   { font-size: 0.78rem; color: #aaa; width: 34px; text-align: right; flex-shrink: 0; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: #2c2c2c;
  border-top: 1px solid #3a3a3a;
  flex-shrink: 0;
  gap: 0.5rem;
}
.btn-all-settings {
  background: none; border: none;
  color: #4fc3f7; font-size: 0.88rem; cursor: pointer;
  padding: 0.25rem 0; text-decoration: underline;
}
.btn-all-settings:hover { color: #81d4fa; }
.btn-apply {
  background: #1a6e1a; border: none; border-radius: 4px;
  color: #fff; font-size: 0.9rem; cursor: pointer;
  padding: 0.35rem 1rem;
}
.btn-apply:hover { background: #28a228; }
</style>
