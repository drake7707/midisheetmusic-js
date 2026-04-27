<script setup lang="ts">
import { ref, shallowRef, nextTick, computed } from 'vue';
import { MidiFile, InstrumentAbbreviations } from '@/midi/MidiFile';
import type { MidiOptions } from '@/midi/MidiFile';
import { SheetMusic, createDefaultOptions } from '@/midi/SheetMusic';
import { Piano } from '@/midi/Piano';
import { MidiPlayer, PlayerState } from '@/midi/MidiPlayer';
import type { PlayerStateValue } from '@/midi/MidiPlayer';
import SheetMusicView from '@/components/SheetMusicView.vue';
import PianoKeyboard from '@/components/PianoKeyboard.vue';
import SettingsDrawer from '@/components/SettingsDrawer.vue';
import SettingsPage   from '@/components/SettingsPage.vue';

const player = new MidiPlayer();

const midiFile    = shallowRef<MidiFile    | null>(null);
const options     = shallowRef<MidiOptions | null>(null);
const sheet       = shallowRef<SheetMusic  | null>(null);
const piano       = shallowRef<Piano       | null>(null);
const fileName    = ref('');
const errorMsg    = ref('');
const playState   = ref<PlayerStateValue>(PlayerState.Stopped);
const speedPct    = ref(100);
const showDrawer      = ref(false);
const showFullSettings = ref(false);

const sheetViewRef = ref<InstanceType<typeof SheetMusicView>  | null>(null);
const pianoViewRef = ref<InstanceType<typeof PianoKeyboard>   | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// ---- polling for play state (lightweight) ----
let pollHandle: ReturnType<typeof setInterval> | null = null;
function startPolling() {
  if (pollHandle !== null) return;
  pollHandle = setInterval(() => {
    playState.value = player.getPlayState();
  }, 200);
}
function stopPolling() {
  if (pollHandle !== null) { clearInterval(pollHandle); pollHandle = null; }
}

// ---- file loading ----
async function onFileChange(evt: Event) {
  const input = evt.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await loadFile(file);
  input.value = '';
}

async function loadFile(file: File) {
  errorMsg.value = '';
  try {
    const buf  = await file.arrayBuffer();
    const midi = new MidiFile(buf, file.name);
    const opts = createDefaultOptions(midi, InstrumentAbbreviations);
    const s    = new SheetMusic(midi, opts);
    const p    = new Piano();
    p.init(window.innerWidth);
    p.SetMidiFile(midi, opts);
    p.SetShadeColors(opts.shade1Color, opts.shade2Color);

    fileName.value = file.name;
    midiFile.value = midi;
    options.value  = opts;
    sheet.value    = s;
    piano.value    = p;

    await nextTick();
    setupPlayer(midi, opts, s, p);
    startPolling();
  } catch (e) {
    errorMsg.value = `Failed to load MIDI: ${(e as Error).message}`;
  }
}

function setupPlayer(midi: MidiFile, opts: MidiOptions, s: SheetMusic, p: Piano): void {
  player.setSheetCtxProvider(() => sheetViewRef.value?.getCtx() ?? null);
  player.setPianoCtxProvider(() => pianoViewRef.value?.getCtx() ?? null);
  player.setRedrawFn(() => {
    const ctx = sheetViewRef.value?.getCtx();
    if (ctx) s.Draw(ctx);
  });
  player.setScrollFn((x, y, immediate) => {
    sheetViewRef.value?.scrollTo(x, y, immediate);
  });
  player.SetPiano(p);
  player.SetMidiFile(midi, opts, s);

  // Initial draw
  const sheetCtx = sheetViewRef.value?.getCtx();
  if (sheetCtx) s.Draw(sheetCtx);
  const pianoCtx = pianoViewRef.value?.getCtx();
  if (pianoCtx) p.Draw(pianoCtx);
}

// ---- rebuild sheet after option changes ----
async function rebuildSheet(newOpts: MidiOptions): Promise<void> {
  if (!midiFile.value) return;
  const midi = midiFile.value;
  const opts = newOpts;

  const wasPlaying = player.isPlaying();
  if (wasPlaying) player.Pause();

  const s = new SheetMusic(midi, opts);
  const p = new Piano();
  p.init(window.innerWidth);
  p.SetMidiFile(midi, opts);
  p.SetShadeColors(opts.shade1Color, opts.shade2Color);

  options.value = opts;
  sheet.value   = s;
  piano.value   = p;

  await nextTick();
  setupPlayer(midi, opts, s, p);
}

// ---- settings apply (from drawer or full page) ----
/** Called by the quick-access drawer (immediate per-toggle apply). */
function onDrawerApply(newOpts: MidiOptions) {
  rebuildSheet(newOpts);
}

/** Called by the full settings page. */
function onSettingsApply(newOpts: MidiOptions, newSpeed: number) {
  showFullSettings.value = false;
  speedPct.value = newSpeed;
  player.setSpeedPercent(newSpeed);
  rebuildSheet(newOpts);
}

// ---- toolbar track visibility toggles ----

/** Toggle treble-clef (right hand) track visibility — toolbar btn_right */
function toggleTrebleClef() {
  if (!options.value || options.value.tracks.length < 1) return;
  const tracks = [...options.value.tracks];
  tracks[0] = !tracks[0];
  rebuildSheet({ ...options.value, tracks });
}

/** Toggle bass-clef (left hand) track visibility — toolbar btn_left */
function toggleBassClef() {
  if (!options.value || options.value.tracks.length < 2) return;
  const tracks = [...options.value.tracks];
  tracks[1] = !tracks[1];
  rebuildSheet({ ...options.value, tracks });
}

/** Toggle piano keyboard visibility — toolbar btn_piano */
function togglePiano() {
  if (!options.value) return;
  rebuildSheet({ ...options.value, showPiano: !options.value.showPiano });
}

/** Go back — unload the current MIDI file */
function clearFile() {
  player.cleanup();
  stopPolling();
  midiFile.value = null;
  options.value  = null;
  sheet.value    = null;
  piano.value    = null;
  fileName.value = '';
  playState.value = PlayerState.Stopped;
  showDrawer.value = false;
  showFullSettings.value = false;
}

// ---- speed ----
function onSpeedChange(evt: Event) {
  const v = parseInt((evt.target as HTMLInputElement).value, 10);
  speedPct.value = v;
  player.setSpeedPercent(v);
}

// ---- playback controls ----
function play()        { player.Play();       playState.value = player.getPlayState(); }
function pause()       { player.Pause();      playState.value = player.getPlayState(); }
function replay()      { player.Reset();      playState.value = player.getPlayState(); stopPolling(); startPolling(); }
function rewind()      { player.Rewind();     playState.value = player.getPlayState(); }
function fastForward() { player.FastForward(); playState.value = player.getPlayState(); }

function isPlaying(): boolean { return playState.value === PlayerState.Playing; }
function hasMidi():   boolean { return midiFile.value !== null; }

/** Speed display string (3 chars, monospace like the Android txt_speed) */
const speedDisplay = computed(() => `${speedPct.value}%`);

/** Whether each track is currently shown (for button active state). */
const trebleVisible = computed(() => options.value?.tracks[0] ?? true);
const bassVisible   = computed(() => options.value?.tracks[1] ?? true);

/** Last measure index for loop range clamping */
const lastMeasure = computed(() => options.value?.lastMeasure ?? 0);
</script>

<template>
  <div class="app">
    <!-- ============ Toolbar (matches player_toolbar.xml order exactly) ============ -->
    <header class="toolbar">

      <!-- btn_back: back / open file -->
      <button
        class="tb-btn"
        :title="hasMidi() ? 'Back (close file)' : 'Open MIDI file'"
        @click="hasMidi() ? clearFile() : fileInputRef?.click()"
      >
        {{ hasMidi() ? '←' : '📂' }}
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept=".mid,.midi"
        style="display:none"
        @change="onFileChange"
      />

      <!-- btn_settings -->
      <button class="tb-btn" title="Settings" @click="showDrawer = !showDrawer">⚙</button>

      <!-- btn_replay (stop / reset to start) -->
      <button class="tb-btn" :disabled="!hasMidi()" title="Replay" @click="replay">↺</button>

      <!-- btn_play (play / pause — scaleY:1.5 in Android = slightly taller) -->
      <button
        class="tb-btn tb-btn-play"
        :disabled="!hasMidi()"
        :title="isPlaying() ? 'Pause' : 'Play'"
        @click="isPlaying() ? pause() : play()"
      >{{ isPlaying() ? '⏸' : '▶' }}</button>

      <!-- btn_rewind (previous measure) -->
      <button class="tb-btn" :disabled="!hasMidi()" title="Rewind" @click="rewind">⏮</button>

      <!-- btn_forward (next measure) -->
      <button class="tb-btn" :disabled="!hasMidi()" title="Forward" @click="fastForward">⏭</button>

      <!-- txt_speed (monospace, 2-line in Android) -->
      <span class="txt-speed">{{ speedDisplay }}</span>

      <!-- speed_bar (weight=1 → flex:1, max=150, progress=100) -->
      <input
        class="speed-bar"
        type="range"
        min="10"
        max="150"
        step="5"
        :value="speedPct"
        :disabled="!hasMidi()"
        @input="onSpeedChange"
        title="Playback speed"
      />

      <!-- btn_midi (disabled button, as in Android) -->
      <button class="tb-btn tb-btn-midi" disabled title="MIDI (not available)">MIDI</button>

      <!-- btn_left: bass clef (left hand) toggle -->
      <button
        class="tb-btn tb-btn-clef"
        :class="{ 'tb-btn-clef-active': bassVisible }"
        :disabled="!hasMidi() || (options?.tracks.length ?? 0) < 2"
        title="Bass clef (left hand)"
        @click="toggleBassClef"
      >𝄢</button>

      <!-- btn_right: treble clef (right hand) toggle -->
      <button
        class="tb-btn tb-btn-clef"
        :class="{ 'tb-btn-clef-active': trebleVisible }"
        :disabled="!hasMidi()"
        title="Treble clef (right hand)"
        @click="toggleTrebleClef"
      >𝄞</button>

      <!-- btn_piano: show/hide piano -->
      <button
        class="tb-btn"
        :class="{ 'tb-btn-active': options?.showPiano }"
        :disabled="!hasMidi()"
        title="Show/Hide Piano"
        @click="togglePiano"
      >🎹</button>

    </header>

    <!-- ---- Error ---- -->
    <div v-if="errorMsg" class="error-bar">{{ errorMsg }}</div>

    <!-- ---- File name bar (shown when file is loaded) ---- -->
    <div v-if="hasMidi()" class="filename-bar">{{ fileName }}</div>

    <!-- ---- Main content ---- -->
    <main class="main-content">
      <div v-if="!hasMidi()" class="drop-hint" @click="fileInputRef?.click()">
        <p>Click 📂 or here to open a MIDI file</p>
      </div>
      <SheetMusicView v-else ref="sheetViewRef" :sheet="sheet" />
    </main>

    <!-- ---- Piano ---- -->
    <footer v-if="options?.showPiano && piano" class="piano-footer">
      <PianoKeyboard ref="pianoViewRef" :piano="piano" />
    </footer>

    <!-- ---- Settings drawer (quick access, matches settings_drawer.xml) ---- -->
    <SettingsDrawer
      v-if="options"
      :visible="showDrawer"
      :options="options"
      :lastMeasure="lastMeasure"
      @close="showDrawer = false"
      @openFullSettings="showDrawer = false; showFullSettings = true"
      @apply="onDrawerApply"
    />

    <!-- ---- Full settings page ---- -->
    <SettingsPage
      v-if="options"
      :visible="showFullSettings"
      :options="options"
      :tracks="midiFile?.getTracks() ?? []"
      :speedPct="speedPct"
      @close="showFullSettings = false"
      @apply="onSettingsApply"
    />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: sans-serif;
}

/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  height: 48px;          /* matches a typical Android toolbar height */
  background: #3f51b5;   /* Material primary colour, same as Android theme */
  color: #fff;
  flex-shrink: 0;
  overflow-x: auto;
}

.tb-btn {
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 6px 8px;
  border-radius: 4px;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.1s;
}
.tb-btn:hover:not(:disabled) { background: rgba(255,255,255,0.18); }
.tb-btn:disabled              { opacity: 0.4; cursor: not-allowed; }

/* Play button is taller in Android (scaleY=1.5) */
.tb-btn-play { font-size: 1.35rem; padding: 2px 10px; }

/* MIDI button styled as a text button */
.tb-btn-midi { font-size: 0.8rem; padding: 4px 8px; border: 1px solid rgba(255,255,255,0.4); border-radius: 3px; }

/* Clef toggle buttons */
.tb-btn-clef        { font-size: 1.3rem; opacity: 0.5; }
.tb-btn-clef-active { opacity: 1; }

/* Active state (piano, etc.) */
.tb-btn-active { background: rgba(255,255,255,0.25); }

/* txt_speed: monospace, 2-line in Android — wrap on smaller screens */
.txt-speed {
  font-family: monospace;
  font-size: 0.78rem;
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0 4px;
  min-width: 36px;
}

/* speed_bar: weight=1 → flex:1 */
.speed-bar {
  flex: 1;
  min-width: 60px;
  padding: 8px 0;
  accent-color: #fff;
}
.speed-bar:disabled { opacity: 0.4; }

/* ── Error / filename bars ──────────────────────────────────────────────── */
.error-bar {
  background: #b00;
  color: #fff;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.filename-bar {
  background: #303f9f;
  color: #e8eaf6;
  padding: 2px 12px;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

/* ── Main content ───────────────────────────────────────────────────────── */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.drop-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  user-select: none;
  font-size: 1.1rem;
}
.drop-hint:hover { background: rgba(0,0,0,0.03); }

/* ── Piano footer ───────────────────────────────────────────────────────── */
.piano-footer {
  flex-shrink: 0;
  border-top: 2px solid #333;
}
</style>
