# MIDI Sheet Music JS

A web-based MIDI sheet music viewer and player — a port of the [Android MidiSheetMusic app](https://github.com/drake7707/midisheetmusic).

Built with **Vue 3 + TypeScript + Vite**.

## Features

- 🎵 Load MIDI files from your local filesystem or from a built-in songs list
- 🎼 Parse MIDI files and render sheet music on a canvas
- ▶️ Play back MIDI with synchronized note highlighting
- 🎹 On-screen piano keyboard that highlights currently playing notes
- ⚙️ Settings panel for customizing playback and display options

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Vue 3](https://vuejs.org/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vite.dev/) | Build tooling & dev server |
| [Tone.js](https://tonejs.github.io/) | Web Audio / MIDI playback |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/midisheetmusic-js/](http://localhost:5173/midisheetmusic-js/) in your browser.

## Build

```bash
npm run build
```

Output is placed in the `dist/` directory and is configured for deployment to GitHub Pages at `/midisheetmusic-js/`.

## Project Structure

```
src/
├── assets/        # Static assets (fonts, images)
├── components/    # Vue components (SheetMusic, PianoKeyboard, Settings, …)
├── midi/          # MIDI parsing & data model
├── App.vue        # Root component
└── main.ts        # Entry point
```

## License

MIT
