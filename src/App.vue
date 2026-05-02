<script setup lang="ts">
import { ref, shallowRef, nextTick, computed, onMounted, onBeforeUnmount } from 'vue';
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
const loadingAudio = ref(false);
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
    loadingAudio.value = player.isLoadingInstruments();
  }, 200);
}
function stopPolling() {
  if (pollHandle !== null) { clearInterval(pollHandle); pollHandle = null; }
}

// ---- settings persistence in localStorage ----

const SETTINGS_PREFIX = 'midioptions_v1_';

/** Compute a simple hash of the MIDI file bytes for use as a storage key.
 *  Hashes the first 4 KB of the file plus its total size for speed on large files. */
function computeFileHash(buf: ArrayBuffer): string {
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
const PERSISTED_FIELDS: (keyof MidiOptions)[] = [
  'tempo', 'instruments', 'mute', 'tracks', 'transpose', 'combineInterval',
  'twoStaffs', 'shifttime', 'useDefaultInstruments', 'volume', 'trackOctaveShift',
  'showMeasures', 'showBeatMarkers', 'showTrackLabels', 'scrollVert',
  'playMeasuresInLoop', 'playMeasuresInLoopStart', 'playMeasuresInLoopEnd',
  'showNoteLetters', 'key', 'showPiano', 'largeNoteSize', 'showLyrics',
  'shade1Color', 'shade2Color', 'useColors', 'colorAccidentals', 'useFullHeight',
  'countInMeasures', 'noteColors', 'midiShift',
];

function saveSettingsToStorage(hash: string, opts: MidiOptions, speed: number): void {
  try {
    const saved: Record<string, unknown> = { _speed: speed };
    for (const key of PERSISTED_FIELDS) {
      saved[key] = opts[key];
    }
    localStorage.setItem(SETTINGS_PREFIX + hash, JSON.stringify(saved));
  } catch { /* quota exceeded or private mode — ignore */ }
}

function loadSettingsFromStorage(hash: string, opts: MidiOptions): { opts: MidiOptions; speed: number } | null {
  try {
    const raw = localStorage.getItem(SETTINGS_PREFIX + hash);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const merged: MidiOptions = { ...opts };
    for (const key of PERSISTED_FIELDS) {
      if (key in saved) {
        // Only apply if the saved value has the same array length (track count)
        const v = saved[key];
        const cur = opts[key];
        if (Array.isArray(cur) && Array.isArray(v) && (v as unknown[]).length !== cur.length) continue;
        (merged as unknown as Record<string, unknown>)[key] = v;
      }
    }
    const speed = typeof saved._speed === 'number' ? saved._speed : 100;
    return { opts: merged, speed };
  } catch { return null; }
}

/** Hash for the currently loaded MIDI file (used for saving settings). */
let currentFileHash = '';

// ---- file loading ----

/** Returns the current sheet-view container width, falling back to the window
 *  width if the view is not yet mounted (e.g. on the very first file load). */
function getSheetPageWidth(): number {
  return sheetViewRef.value?.viewportWidth() ?? window.innerWidth;
}

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

    const s    = new SheetMusic(midi, opts);
    const p    = new Piano();
    p.init(window.innerWidth);
    p.SetMidiFile(midi, opts);
    p.SetShadeColors(opts.shade1Color, opts.shade2Color);

    currentFileHash = hash;
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
  if (pianoCtx) p.Draw(pianoCtx);
}

// ---- rebuild sheet after option changes ----
async function rebuildSheet(newOpts: MidiOptions): Promise<void> {
  if (!midiFile.value) return;
  const midi = midiFile.value;

  // Keep trackInstrumentNames in sync with the (possibly changed) instruments array.
  const updatedNames = newOpts.instruments.map(
    prog => prog < InstrumentAbbreviations.length ? InstrumentAbbreviations[prog] : `Prog.${prog}`,
  );
  // Carry through the current container width so vertical-scroll layout stays full-width.
  const currentPageWidth = getSheetPageWidth();
  const opts = { ...newOpts, trackInstrumentNames: updatedNames, pageWidth: currentPageWidth };

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
  if (currentFileHash) saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
  rebuildSheet(newOpts);
}

/** Called by the full settings page. */
function onSettingsApply(newOpts: MidiOptions, newSpeed: number) {
  showFullSettings.value = false;
  speedPct.value = newSpeed;
  player.setSpeedPercent(newSpeed);
  if (currentFileHash) saveSettingsToStorage(currentFileHash, newOpts, newSpeed);
  rebuildSheet(newOpts);
}

// ---- toolbar track visibility toggles ----

/** Toggle treble-clef (right hand) track visibility — toolbar btn_right */
function toggleTrebleClef() {
  if (!options.value || options.value.tracks.length < 1) return;
  const tracks = [...options.value.tracks];
  tracks[0] = !tracks[0];
  const newOpts = { ...options.value, tracks };
  if (currentFileHash) saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
  rebuildSheet(newOpts);
}

/** Toggle bass-clef (left hand) track visibility — toolbar btn_left */
function toggleBassClef() {
  if (!options.value || options.value.tracks.length < 2) return;
  const tracks = [...options.value.tracks];
  tracks[1] = !tracks[1];
  const newOpts = { ...options.value, tracks };
  if (currentFileHash) saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
  rebuildSheet(newOpts);
}

/** Toggle piano keyboard visibility — toolbar btn_piano */
function togglePiano() {
  if (!options.value) return;
  const newOpts = { ...options.value, showPiano: !options.value.showPiano };
  if (currentFileHash) saveSettingsToStorage(currentFileHash, newOpts, speedPct.value);
  rebuildSheet(newOpts);
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

/** Called when the user clicks on the sheet music canvas — seek to that position. */
function onSheetClick(x: number, y: number) {
  player.MoveToClicked(x, y);
}

/** Called when the canvas draw fails (e.g. sheet too large for browser canvas limits). */
function onDrawError(msg: string) {
  errorMsg.value = msg;
}

/** Speed display: percentage line and BPM line (matches Android two-line txt_speed). */
const speedPctText = computed(() => `${speedPct.value}%`);
const speedBpmText = computed(() => {
  if (!midiFile.value) return '';
  const tempo = midiFile.value.getTime().getTempo();
  return `${Math.round(60_000_000 * speedPct.value / (tempo * 100))}bpm`;
});

/** Whether each track is currently shown (for button active state). */
const trebleVisible = computed(() => options.value?.tracks[0] ?? true);
const bassVisible   = computed(() => options.value?.tracks[1] ?? true);

/** Last measure index for loop range clamping */
const lastMeasure = computed(() => options.value?.lastMeasure ?? 0);

// ---- keyboard shortcuts ----
function onKeyDown(evt: KeyboardEvent): void {
  if (!hasMidi()) return;
  // Don't fire shortcuts when the user is typing in an input/select, or when
  // a button/link has focus (so Space/Enter don't double-trigger UI elements).
  const tag = (evt.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return;

  switch (evt.key) {
    case ' ':
      evt.preventDefault();
      isPlaying() ? pause() : play();
      break;
    // Arrow left/right: move one note at a time
    case 'ArrowLeft':
      evt.preventDefault();
      player.PrevNote();
      break;
    case 'ArrowRight':
      evt.preventDefault();
      player.NextNote();
      break;
    // Arrow up/down: adjust playback speed
    case 'ArrowUp':
      evt.preventDefault();
      player.SpeedUp();
      speedPct.value = player.getSpeedPercent();
      if (currentFileHash && options.value) saveSettingsToStorage(currentFileHash, options.value, speedPct.value);
      break;
    case 'ArrowDown':
      evt.preventDefault();
      player.SpeedDown();
      speedPct.value = player.getSpeedPercent();
      if (currentFileHash && options.value) saveSettingsToStorage(currentFileHash, options.value, speedPct.value);
      break;
    // Page up/down: move one measure at a time
    case 'PageUp':
      evt.preventDefault();
      rewind();
      break;
    case 'PageDown':
      evt.preventDefault();
      fastForward();
      break;
    case 'r':
    case 'R':
      if (!evt.ctrlKey && !evt.metaKey) { evt.preventDefault(); replay(); }
      break;
    case 'Home':
      evt.preventDefault();
      replay();
      break;
  }
}

onMounted(()       => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
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
        :title="loadingAudio ? 'Loading instruments…' : isPlaying() ? 'Pause' : 'Play'"
        @click="isPlaying() ? pause() : play()"
      >
        <span v-if="loadingAudio" class="spinner" title="Loading instruments…">⏳</span>
        <span v-else>{{ isPlaying() ? '⏸' : '▶' }}</span>
      </button>

      <!-- btn_rewind (previous measure) -->
      <button class="tb-btn" :disabled="!hasMidi()" title="Rewind" @click="rewind">⏮</button>

      <!-- btn_forward (next measure) -->
      <button class="tb-btn" :disabled="!hasMidi()" title="Forward" @click="fastForward">⏭</button>

      <!-- txt_speed (monospace, 2-line in Android) -->
      <span class="txt-speed">
        <span>{{ speedPctText }}</span>
        <span v-if="speedBpmText" class="txt-bpm">{{ speedBpmText }}</span>
      </span>

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
        aria-label="Toggle bass clef (left hand)"
        @click="toggleBassClef"
      >𝄢</button>

      <!-- btn_right: treble clef (right hand) toggle -->
      <button
        class="tb-btn tb-btn-clef"
        :class="{ 'tb-btn-clef-active': trebleVisible }"
        :disabled="!hasMidi()"
        title="Treble clef (right hand)"
        aria-label="Toggle treble clef (right hand)"
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
      <SheetMusicView v-else ref="sheetViewRef" :sheet="sheet" @canvasClick="onSheetClick" @drawError="onDrawError" />
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

/* txt_speed: monospace, 2-line in Android */
.txt-speed {
  font-family: monospace;
  font-size: 0.78rem;
  text-align: center;
  flex-shrink: 0;
  padding: 0 4px;
  min-width: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.txt-bpm {
  font-size: 0.68rem;
  opacity: 0.85;
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

/* ── Loading spinner ─────────────────────────────────────────────────────── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}
</style>
