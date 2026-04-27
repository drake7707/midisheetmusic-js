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
}>();

const emit = defineEmits<{
  close: [];
  openFullSettings: [];
  apply: [opts: MidiOptions];
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

/** Emit an apply event whenever the user changes a switch/value. */
function applyNow() {
  emit('apply', cloneOpts(local as MidiOptions));
}

/** Last measure number (0-based) — used to clamp loop end. */
const lastMeasure = () => props.lastMeasure ?? (props.options.lastMeasure ?? 0);
</script>

<template>
  <!-- Overlay backdrop -->
  <Transition name="fade">
    <div v-if="visible" class="drawer-backdrop" @click.self="$emit('close')" />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="slide-right">
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
            <div class="loop-badge-controls">
              <button class="loop-badge-btn" @click="local.playMeasuresInLoopStart = Math.max(0, local.playMeasuresInLoopStart - 1); applyNow()">−</button>
              <span class="loop-badge">{{ local.playMeasuresInLoopStart + 1 }}</span>
              <button class="loop-badge-btn" @click="local.playMeasuresInLoopStart = Math.min(local.playMeasuresInLoopEnd, local.playMeasuresInLoopStart + 1); applyNow()">+</button>
            </div>
          </div>

          <!-- Loop End -->
          <div class="loop-subitem-row">
            <span class="loop-subitem-label">End Measure</span>
            <div class="loop-badge-controls">
              <button class="loop-badge-btn" @click="local.playMeasuresInLoopEnd = Math.max(local.playMeasuresInLoopStart, local.playMeasuresInLoopEnd - 1); applyNow()">−</button>
              <span class="loop-badge">{{ local.playMeasuresInLoopEnd + 1 }}</span>
              <button class="loop-badge-btn" @click="local.playMeasuresInLoopEnd = Math.min(lastMeasure(), local.playMeasuresInLoopEnd + 1); applyNow()">+</button>
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
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 90vw;
  background: #fff;
  color: #222;
  display: flex;
  flex-direction: column;
  z-index: 901;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

/* ── Transitions ──────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active   { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to        { opacity: 0; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease; }
.slide-right-enter-from,   .slide-right-leave-to     { transform: translateX(100%); }

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
  padding: 12px;
  cursor: default;
}
.loop-subitem-row:hover { background: rgba(0, 0, 0, 0.04); }

.loop-subitem-label {
  font-size: 14px;
  color: #222;
  flex: 1;
}

.loop-badge-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.loop-badge-btn {
  width: 24px;
  height: 24px;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
}
.loop-badge-btn:hover { background: #bdbdbd; }
.loop-badge {
  display: inline-block;
  background: #3f51b5;
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  min-width: 28px;
  text-align: center;
}

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
