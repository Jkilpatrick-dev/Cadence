# Cadence 🎵

Mood-reactive music player for visual novels (story-driven games with dialogue-heavy narratives). Cadence runs alongside your game and automatically switches music based on the emotional tone of the scene.

---

## How It Works

Cadence monitors your visual novel's dialogue in real-time and detects the emotional tone of each line. It then switches your music to match — tense during confrontations, melancholic during flashbacks, upbeat when things are going well.

You organize your songs into five mood categories and Cadence handles the rest.

---

## Features

### 🤖 Auto Mode
Monitors VN dialogue in real-time and switches music automatically based on detected emotions. A sensitivity threshold prevents it from switching too aggressively.

### 📚 Mood Libraries
Organize songs into five moods: **Happy**, **Sad**, **Energetic**, **Melancholic**, and **Calm**. Supports both local audio files and YouTube links.

### 📺 YouTube Support
Build your entire mood library from YouTube links or playlists. No local files required.

### 🎛️ Mood Synthesizer
Mix multiple moods together for continuous playback across mood categories.

### 🔗 Library Sharing
Export and import mood libraries via share codes. Use a library someone else built or share yours with the community.

### ⛶ Mini Mode
Compact overlay that stays on top of your VN while you play.

---

## Ren'Py Setup

Drop a small `autorun.rpy` script into your game folder. It writes spoken dialogue to a text file that Cadence monitors. It does not touch saves, story state, or game mechanics.

---

## Download

Available on **[itch.io](https://justkil.itch.io)** — free, Windows only, no account needed.

---

## Built With

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
