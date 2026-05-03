<script setup lang="ts">
/**
 * SettingsDrawer — quick-access slide-in navigation drawer, ported from
 * the Android settings_drawer.xml layout.
 *
 * Sections (matching Android layout exactly):
 *   • Switch: Scroll Vertically
 *   • Switch: Use Note Colors
 *   • Switch: Color Accidentals
 *   • Loop row (switch + expand arrow → loop start/end sub-items)
 *   • Switch: Show Measure Numbers
 *   • Switch: Show Beat Markers
 *   • Divider
 *   • Button: More Settings  (→ opens full SettingsPage)
 *   • Button: Save As Images (not yet implemented, disabled)
 */
import { reactive, watch, ref } from 'vue';
import type { MidiOptions } from '@/midi/MidiFile';

const props = defineProps<{
  visible: boolean;
  options: MidiOptions;
  lastMeasure?: number;   // 0-based index of the last measure in the song
  currentMeasure?: number; // 0-based index of the current playback position
}>();

const emit = defineEmits<{
  close: [];
  openFullSettings: [];
  apply: [opts: MidiOptions];
  setLoopAtStart: [];
  setLoopAtEnd: [];
}>();

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

const local = reactive<MidiOptions>(cloneOpts(props.options));
const loopExpanded = ref(false);

watch(() => props.visible, (v) => {
  if (v) {
    Object.assign(local, cloneOpts(props.options));
    loopExpanded.value = false;
  }
});

// Re-sync local whenever options change externally (e.g. from keyboard S/E shortcuts)
// while the drawer is open, so the displayed values stay accurate.
watch(() => props.options, (newOpts) => {
  if (props.visible) {
    Object.assign(local, cloneOpts(newOpts));
  }
}, { deep: true });

/** Emit an apply event whenever the user changes a switch/value. */
function applyNow() {
  emit('apply', cloneOpts(local as MidiOptions));
}

/** Last measure number (0-based) — used to clamp loop end. */
const lastMeasure = () => props.lastMeasure ?? (props.options.lastMeasure ?? 0);

/** Loop start measure input handler (value is 1-based from the UI). */
function setLoopStartInput(evt: Event) {
  const v = parseInt((evt.target as HTMLInputElement).value, 10);
  if (isNaN(v)) return;
  local.playMeasuresInLoopStart = Math.max(0, Math.min(local.playMeasuresInLoopEnd, v - 1));
  applyNow();
}

/** Loop end measure input handler (value is 1-based from the UI). */
function setLoopEndInput(evt: Event) {
  const v = parseInt((evt.target as HTMLInputElement).value, 10);
  if (isNaN(v)) return;
  local.playMeasuresInLoopEnd = Math.max(local.playMeasuresInLoopStart, Math.min(lastMeasure(), v - 1));
  applyNow();
}

</script>

<template>
  <!-- Overlay backdrop -->
  <Transition name="fade">
    <div v-if="visible" class="drawer-backdrop" @click.self="$emit('close')" />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="slide-left">
    <div v-if="visible" class="drawer" role="dialog" aria-modal="true" aria-label="Settings">

      <!-- Header (matches Android: primary-color background, "Settings" title) -->
      <div class="drawer-header">
        <span class="drawer-title">Settings</span>
      </div>

      <!-- Scrollable body -->
      <div class="drawer-body">

        <!-- Scroll Vertically -->
        <label class="switch-row">
          <span class="switch-label">Scroll Vertically</span>
          <input
            type="checkbox"
            class="switch-input"
            v-model="local.scrollVert"
            @change="applyNow"
          />
          <span class="switch-track" :class="{ on: local.scrollVert }">
            <span class="switch-thumb" />
          </span>
        </label>

        <!-- Use Note Colors -->
        <label class="switch-row">
          <span class="switch-label">Use Note Colors</span>
          <input
            type="checkbox"
            class="switch-input"
            v-model="local.useColors"
            @change="applyNow"
          />
          <span class="switch-track" :class="{ on: local.useColors }">
            <span class="switch-thumb" />
          </span>
        </label>

        <!-- Color Accidentals -->
        <label class="switch-row">
          <span class="switch-label">Color Accidentals</span>
          <input
            type="checkbox"
            class="switch-input"
            v-model="local.colorAccidentals"
            @change="applyNow"
          />
          <span class="switch-track" :class="{ on: local.colorAccidentals }">
            <span class="switch-thumb" />
          </span>
        </label>

        <!-- Loop header row: switch + expand/collapse arrow -->
        <div class="loop-header-row">
          <label class="switch-row loop-switch-row">
            <span class="switch-label">Play Measures in a Loop</span>
            <input
              type="checkbox"
              class="switch-input"
              v-model="local.playMeasuresInLoop"
              @change="applyNow"
            />
            <span class="switch-track" :class="{ on: local.playMeasuresInLoop }">
              <span class="switch-thumb" />
            </span>
          </label>
          <button
            class="loop-arrow-btn"
            :class="{ expanded: loopExpanded }"
            @click="loopExpanded = !loopExpanded"
            aria-label="Expand loop settings"
          >&#9654;</button>
        </div>

        <!-- Loop sub-items (hidden by default, shown when arrow expanded) -->
        <div v-if="loopExpanded" class="loop-subitems">

          <!-- Loop Start -->
          <div class="loop-subitem-row">
            <span class="loop-subitem-label">Start Measure</span>
            <div class="loop-input-controls">
              <input
                type="number"
                class="loop-measure-input"
                :min="1"
                :max="local.playMeasuresInLoopEnd + 1"
                :value="local.playMeasuresInLoopStart + 1"
                @change="setLoopStartInput"
              />
              <button class="loop-set-pos-btn" @click="$emit('setLoopAtStart')" title="Set loop start at current playback position (S)" aria-label="Set loop start at current playback position">Set at position</button>
            </div>
          </div>

          <!-- Loop End -->
          <div class="loop-subitem-row">
            <span class="loop-subitem-label">End Measure</span>
            <div class="loop-input-controls">
              <input
                type="number"
                class="loop-measure-input"
                :min="local.playMeasuresInLoopStart + 1"
                :max="lastMeasure() + 1"
                :value="local.playMeasuresInLoopEnd + 1"
                @change="setLoopEndInput"
              />
              <button class="loop-set-pos-btn" @click="$emit('setLoopAtEnd')" title="Set loop end at current playback position (E)" aria-label="Set loop end at current playback position">Set at position</button>
            </div>
          </div>

        </div>

        <!-- Show Measure Numbers -->
        <label class="switch-row">
          <span class="switch-label">Show Measure Numbers</span>
          <input
            type="checkbox"
            class="switch-input"
            v-model="local.showMeasures"
            @change="applyNow"
          />
          <span class="switch-track" :class="{ on: local.showMeasures }">
            <span class="switch-thumb" />
          </span>
        </label>

        <!-- Show Beat Markers -->
        <label class="switch-row">
          <span class="switch-label">Show Beat Markers</span>
          <input
            type="checkbox"
            class="switch-input"
            v-model="local.showBeatMarkers"
            @change="applyNow"
          />
          <span class="switch-track" :class="{ on: local.showBeatMarkers }">
            <span class="switch-thumb" />
          </span>
        </label>

        <!-- Divider -->
        <div class="divider" />

        <!-- More Settings button -->
        <button class="drawer-action-btn" @click="$emit('openFullSettings')">
          More Settings
        </button>

        <!-- Save As Images button (stub — not yet implemented) -->
        <button class="drawer-action-btn" disabled title="Not available in web version">
          Save As Images
        </button>

      </div><!-- /.drawer-body -->

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
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 90vw;
  background: #fff;
  color: #222;
  display: flex;
  flex-direction: column;
  z-index: 901;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active   { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to        { opacity: 0; }

.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s ease; }
.slide-left-enter-from,   .slide-left-leave-to     { transform: translateX(-100%); }

/* ── Header ───────────────────────────────────────────────────────────────── */
.drawer-header {
  background: #3f51b5;
  padding: 16px;
  flex-shrink: 0;
}
.drawer-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}

/* ── Body ─────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
}

/* ── Switch rows (matches SwitchCompat items in XML) ─────────────────────── */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}
.switch-row:hover { background: rgba(0, 0, 0, 0.04); }

.switch-label {
  font-size: 14px;
  color: #222;
  flex: 1;
}

/* Hide the native checkbox; use custom track/thumb */
.switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-track {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  background: #bdbdbd;
  border-radius: 11px;
  flex-shrink: 0;
  transition: background 0.2s;
}
.switch-track.on { background: #3f51b5; }

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.switch-track.on .switch-thumb { left: 20px; }

/* ── Loop header row ──────────────────────────────────────────────────────── */
.loop-header-row {
  display: flex;
  align-items: center;
}
.loop-switch-row {
  flex: 1;
}
.loop-arrow-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #555;
  padding: 0 12px;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.loop-arrow-btn.expanded { transform: rotate(90deg); }

/* ── Loop sub-items ───────────────────────────────────────────────────────── */
.loop-subitems {
  padding-left: 16px;
}

.loop-subitem-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: default;
}
.loop-subitem-row:hover { background: rgba(0, 0, 0, 0.04); }

.loop-subitem-label {
  font-size: 14px;
  color: #222;
  flex: 1;
}

.loop-input-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loop-measure-input {
  width: 60px;
  padding: 3px 6px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  color: #222;
  background: #fafafa;
}
.loop-measure-input:focus {
  outline: none;
  border-color: #3f51b5;
}

.loop-set-pos-btn {
  padding: 3px 8px;
  background: #3f51b5;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.loop-set-pos-btn:hover { background: #303f9f; }

/* ── Divider ──────────────────────────────────────────────────────────────── */
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

/* ── Action buttons (matches Button widgets in XML) ──────────────────────── */
.drawer-action-btn {
  display: block;
  width: calc(100% - 16px);
  margin: 4px 8px;
  padding: 10px 16px;
  background: #3f51b5;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  cursor: pointer;
}
.drawer-action-btn:hover:not(:disabled) { background: #303f9f; }
.drawer-action-btn:disabled {
  background: #9e9e9e;
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
