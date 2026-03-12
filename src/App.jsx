import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Tooltip from './Components/Tooltip';
// --- NEW HOOKS ---
import { useAudioPlayer } from './Hooks/useAudioPlayer';
import { useMoodEngine } from './Hooks/UseMoodEngine';
import HiddenYoutube from './Components/HiddenYoutube';
import MoodHUD from './Components/MoodHUD'
// --- MODAL COMPONENT ---

const STARTER_PLAYLIST = {
  name: "Cadence Starter Pack",
  songs: [
    { u: "https://www.youtube.com/watch?v=H5oeXBwudmI", t: "Vesky - Forever", m: ["Calm"] },
    { u: "https://www.youtube.com/watch?v=MK9hxakQMN8", t: "KAYTRANADA - Intimidated", m: ["Calm"] },
    { u: "https://www.youtube.com/watch?v=TTG4wVW64Lg", t: "Jhené Aiko - Summer 2020", m: ["Melancholic"] },
    { u: "https://www.youtube.com/watch?v=2SFt7JHwJeg", t: "Kool & the Gang - Summer Madness", m: ["Melancholic"] },
    { u: "https://www.youtube.com/watch?v=0eajPLUwfTk", t: "Shiloh Dynasty - So Low", m: ["Sad"] },
    { u: "https://www.youtube.com/watch?v=jYFz6b2Kgx4", t: "Shiloh Dynasty - Novacaine", m: ["Sad"] },
    { u: "https://www.youtube.com/watch?v=SvlcpJX4Dn0", t: "Arrested Development - People Everyday", m: ["Happy"] },
    { u: "https://www.youtube.com/watch?v=K4KK33HAAVU", t: "Late Kids - Run", m: ["Happy"] },
    { u: "https://www.youtube.com/watch?v=ASpA9Zd2Z0o", t: "Pretty Lights - Finally Moving", m: ["Energetic"] },
    { u: "https://www.youtube.com/watch?v=RecY5iZn6B0", t: "Chaka Khan - Like Sugar", m: ["Energetic"] }
  ]
};
function Modal({ isOpen, title, onClose, onSubmit }) {
  const [inputValue, setInputValue] = useState('');
  const [isYouTubeOnly, setIsYouTubeOnly] = useState(false); // NEW
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Multiple attempts with longer delays
      const focusAttempts = [50, 150, 300];
      focusAttempts.forEach(delay => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Also select the text
          }
        }, delay);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue, isYouTubeOnly); // Pass the flag
      setInputValue('');
      setIsYouTubeOnly(false);
    }
  };

  const isLibraryModal = title.includes('Library');

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type name here..."
          />

          {isLibraryModal && (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <input
                type="checkbox"
                checked={isYouTubeOnly}
                onChange={(e) => setIsYouTubeOnly(e.target.checked)}
              />
              <span>YouTube-only library (no local folder)</span>
            </label>
          )}

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {

  const [config, setConfig] = useState({ libraries: {} });
  const [currentLibrary, setCurrentLibrary] = useState(null);
  const [editingMoods, setEditingMoods] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [threshold, setThreshold] = useState(3);
  const [songFilter, setSongFilter] = useState('');
const currentLibraryRef = useRef(currentLibrary);
const configRef = useRef(config);
useEffect(() => { currentLibraryRef.current = currentLibrary; }, [currentLibrary]);
useEffect(() => { configRef.current = config; }, [config]);
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);

// Playlist Import State
const [newPlaylistLink, setNewPlaylistLink] = useState('');
const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
const [shareCode, setShareCode] = useState('');
const [showSharePanel, setShowSharePanel] = useState(false);
const [importCode, setImportCode] = useState('');
const [pendingBulkAssign, setPendingBulkAssign] = useState(null); 
  // UI Helpers
  const [newYtLink, setNewYtLink] = useState('');
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = useState(null);
  const [continuousPlay, setContinuousPlay] = useState(false);
  const continuousPlayRef = useRef(continuousPlay);
  const [previewingSong, setPreviewingSong] = useState(null);
  const [moodMix, setMoodMix] = useState({
  'Happy': true, 'Sad': true, 'Energetic': true, 'Melancholic': true, 'Calm': true
});
const [showMixer, setShowMixer] = useState(true);
 const handleAutoMoodTrigger = (mood) => {

    if (isModalOpen) {
      console.log("Blocking auto-switch because modal is open");
      return;
    }
    playRandomFromMood(mood, true);
  };

const [playHistory, setPlayHistory] = useState({
  Happy: [],
  Sad: [],
  Energetic: [],
  Melancholic: [],
  Calm: []
});

  const [autoModeEnabled, setAutoModeEnabled] = useState(false);

  // Initialize Mood Engine


const audio = useAudioPlayer(() => {
  if (continuousPlayRef.current) {

    playFromMix();
    } else {
      playRandomFromMood('Calm', true);
    }
  });
  // Keep refs synced for callbacks
  useEffect(() => { continuousPlayRef.current = continuousPlay; }, [continuousPlay]);

  // --- 3. LOAD CONFIG ---
  useEffect(() => { loadConfig(); }, []);
const moodEngine = useMoodEngine(handleAutoMoodTrigger, threshold);
  const loadConfig = async () => {
    if (!window.electronAPI) return;
    const loadedConfig = await window.electronAPI.loadConfig();
    if (loadedConfig.threshold) setThreshold(loadedConfig.threshold);
    setConfig(loadedConfig);
    const libraryNames = Object.keys(loadedConfig.libraries);
    if (libraryNames.length > 0) setCurrentLibrary(libraryNames[0]);
  };

  const saveConfig = async (newConfig) => {
    await window.electronAPI.saveConfig(newConfig);
    setConfig(newConfig);
  };



  // --- 4. CORE LOGIC ---
const playRandomFromMood = (mood, isAutoTrigger = false) => {
    const currentLibrary = currentLibraryRef.current; 
  const config = configRef.current;    
  if (!currentLibrary) return;
 if (!isAutoTrigger) {
    setContinuousPlay(false);
  }
  moodEngine.setCurrentMood(mood);

  const library = config.libraries[currentLibrary];
  const allSongsInMood = library.moods[mood];

  if (!allSongsInMood || allSongsInMood.length === 0) {
    if (mood !== "Calm") playRandomFromMood("Calm", true);
    return;
  }


  const recentlyPlayed = playHistory[mood] || [];

  let availableSongs = allSongsInMood.filter(song => !recentlyPlayed.includes(song));

  if (availableSongs.length === 0) {
    console.log(`🔄 All ${mood} songs played, resetting history`);
    availableSongs = [...allSongsInMood];
    setPlayHistory(prev => ({ ...prev, [mood]: [] }));
  }

  // Pick random from available songs
  const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
  
  // Update play history for this mood
  setPlayHistory(prev => {
    const newHistory = [...(prev[mood] || []), randomSong];
    
    // Keep history size manageable (50% of total songs, minimum 3)
    const maxHistorySize = Math.max(3, Math.floor(allSongsInMood.length * 0.5));
    const trimmedHistory = newHistory.slice(-maxHistorySize);
    
    return { ...prev, [mood]: trimmedHistory };
  });

  console.log(`🎵 Playing: ${randomSong} (${availableSongs.length} available, ${recentlyPlayed.length} in history)`);
  
  // Delegate to Hook
  audio.playTrack(randomSong);
};
  const togglePreview = (songPath) => {
    if (previewingSong === songPath) {
      audio.stopAll();
      setPreviewingSong(null);
      return;
    }
    setPreviewingSong(songPath);
    audio.playTrack(songPath);
  };

  const updateThreshold = (val) => {
    const newThreshold = parseInt(val);
    setThreshold(newThreshold);
    saveConfig({ ...config, threshold: newThreshold });
  };

  // --- 5. LIBRARY MANAGEMENT ---
  const openAddLibraryModal = () => {
    setModalType('library');
    setIsModalOpen(true);
  };
  const needsMoodSetup = () => {
    if (!currentLibrary || !library) return false;
    const totalAssignedSongs = Object.values(library.moods).reduce((acc, songs) => acc + songs.length, 0);
    return library.allSongs.length > 0 && totalAssignedSongs === 0;
  };
  const rescanLibrary = async (libraryName) => {
    const library = config.libraries[libraryName];
    const musicFiles = await window.electronAPI.scanMusicFolder(library.path);
    const newConfig = {
      ...config,
      libraries: {
        ...config.libraries,
        [libraryName]: { ...library, allSongs: musicFiles }
      }
    };
    await saveConfig(newConfig);
    alert('Library rescanned! New songs added.');
  };

  const removeSong = async (songToRemove) => {
    if (!confirm("Remove this song from the library?\n\n(Local Files will remain on your hard drive)")) return;
    const library = config.libraries[currentLibrary];
    const newAllSongs = library.allSongs.filter(s => s !== songToRemove);
    const newMoods = { ...library.moods };
    Object.keys(newMoods).forEach(mood => {
      newMoods[mood] = newMoods[mood].filter(s => s !== songToRemove);
    });
    const newTitles = { ...library.songTitles };
    delete newTitles[songToRemove];

    const newConfig = {
      ...config,
      libraries: {
        ...config.libraries,
        [currentLibrary]: {
          ...library,
          allSongs: newAllSongs,
          moods: newMoods,
          songTitles: newTitles
        }
      }
    };
    await saveConfig(newConfig);
  };

  const loadStarterPlaylist = async () => {
  const newMoods = { Happy: [], Sad: [], Energetic: [], Melancholic: [], Calm: [] };
  const newTitles = {};
  const newSongs = [];

  STARTER_PLAYLIST.songs.forEach(song => {
    newSongs.push(song.u);
    newTitles[song.u] = song.t;
    song.m.forEach(mood => { if (newMoods[mood]) newMoods[mood].push(song.u); });
  });

  const newConfig = {
    ...config,
    libraries: {
        ...config.libraries, 
      [STARTER_PLAYLIST.name]: {
        
        path: `YOUTUBE_LIB_${Date.now()}`,
        moods: newMoods,
        allSongs: newSongs,
        songTitles: newTitles
      }
    }
  };

  await saveConfig(newConfig);
  setCurrentLibrary(STARTER_PLAYLIST.name);
};

  const deleteLibrary = (libraryName) => {
    if (!confirm(`Delete library "${libraryName}"?`)) return;
    const newConfig = { ...config };
    delete newConfig.libraries[libraryName];
    saveConfig(newConfig);
    const remainingLibraries = Object.keys(newConfig.libraries);
    setCurrentLibrary(remainingLibraries.length > 0 ? remainingLibraries[0] : null);
  };

  const renameLibrary = (oldName) => {
    setRenameTarget(oldName);
    setModalType('rename');
    setIsModalOpen(true);
  };

  const playFromMix = () => {
    const currentLibrary = currentLibraryRef.current;  
  const config = configRef.current;   
  if (!currentLibrary || !config.libraries[currentLibrary]) return;
  const lib = config.libraries[currentLibrary];

  const activeMoods = Object.keys(moodMix).filter(m => moodMix[m]);

  if (activeMoods.length === 0) {
    console.log("⚠️ No moods selected in mixer");
    return;
  }

  let songPool = [];
  activeMoods.forEach(mood => {
    if (lib.moods[mood]) {
      songPool = [...songPool, ...lib.moods[mood]];
    }
  });

  if (songPool.length === 0) return;


  const randomSong = songPool[Math.floor(Math.random() * songPool.length)];

  const sourceMood = activeMoods.find(m => lib.moods[m].includes(randomSong)) || activeMoods[0];

  console.log(`🔀 Mixer Playing: ${randomSong} (Source: ${sourceMood})`);
  
  moodEngine.setCurrentMood(sourceMood);
  audio.playTrack(randomSong);
};

  const handleModalSubmit = async (inputValue, isYouTubeOnly = false) => {
    setIsModalOpen(false);
    if (modalType === 'library') {
      const libraryName = inputValue;
      let folderPath;
      let musicFiles = [];

      if (isYouTubeOnly) {
        // Skip folder picker entirely
        folderPath = `YOUTUBE_LIB_${Date.now()}`;

      } else {
        // Normal flow with folder picker
        folderPath = await window.electronAPI.selectFolder();
        if (!folderPath) return; // User cancelled
        musicFiles = await window.electronAPI.scanMusicFolder(folderPath);
      }

      const newConfig = {
        ...config,
        libraries: {
          ...config.libraries,
          [libraryName]: {
            path: folderPath,
            moods: { 'Happy': [], 'Sad': [], 'Energetic': [], 'Melancholic': [], 'Calm': [] },
            allSongs: musicFiles,
            songTitles: {}
          }
        }
      };
      await saveConfig(newConfig);
      setCurrentLibrary(libraryName);
    }
    else if (modalType === 'youtube-name') {
      const songName = inputValue;
      const library = config.libraries[currentLibrary];
      const newConfig = {
        ...config,
        libraries: {
          ...config.libraries,
          [currentLibrary]: {
            ...library,
            allSongs: [...library.allSongs, pendingYoutubeUrl],
            songTitles: { ...library.songTitles, [pendingYoutubeUrl]: songName }
          }
        }
      };
      await saveConfig(newConfig);
      setPendingYoutubeUrl(null);
    }
else if (modalType === 'rename') {
  const newName = inputValue;
  if (!newName || newName === renameTarget) return;
  if (config.libraries[newName]) {
    alert('A library with that name already exists!');
    return;
  }



  const newConfig = { ...config, libraries: { ...config.libraries, [newName]: config.libraries[renameTarget] } };
  delete newConfig.libraries[renameTarget];
  await saveConfig(newConfig);
  setCurrentLibrary(newName);
  setRenameTarget(null);
}
  };

  // --- 6. VIEW HELPERS ---
  const toggleMiniMode = async () => {
    const newMiniMode = !isMiniMode;
    await window.electronAPI.setMiniMode(newMiniMode);
    setIsMiniMode(newMiniMode);
    if (newMiniMode && !alwaysOnTop) {
      await window.electronAPI.toggleAlwaysOnTop(true);
      setAlwaysOnTop(true);
    }
  };

  const toggleAlwaysOnTop = async () => {
    const newAlwaysOnTop = !alwaysOnTop;
    await window.electronAPI.toggleAlwaysOnTop(newAlwaysOnTop);
    setAlwaysOnTop(newAlwaysOnTop);
  };

const getMoodColor = (mood) => {
  const moodColors = {
    'Happy': '#1b4332',
    'Sad': '#0d47a1',
    'Energetic': '#b35a1f',
    'Melancholic': '#311b92',
    'Calm': '#004d40',
  };

  // Mixer mode: current mood dominates, one other active mood bleeds in
if (continuousPlay && Object.values(moodMix).some(v => v)) {
    const primary = moodColors[mood] || '#16213e';
    const otherActives = Object.keys(moodMix).filter(m => moodMix[m] && m !== mood);
    const bleed = otherActives[Math.floor(Math.random() * otherActives.length)];
    const bleedColor = bleed ? moodColors[bleed] : '#16213e';
    return `radial-gradient(at 0% 0%, #1a1a2e 0%, ${primary} 50%, ${bleedColor} 100%)`;
  }

  // Standard single mood
  const themes = {
    'Sad': 'radial-gradient(at 0% 0%, #1a1a2e 0%, #0d47a1 50%, #1565c0 100%)',
    'Happy': 'radial-gradient(at 0% 0%, #1a1a2e 0%, #1b4332 50%, #2d6a4f 100%)',
    'Energetic': 'radial-gradient(at 0% 0%, #1a1a2e 0%, #b35a1f 50%, #ff6b1a 100%)',
    'Melancholic': 'radial-gradient(at 0% 0%, #1a1a2e 0%, #311b92 50%, #5e35b1 100%)',
    'Calm': 'radial-gradient(at 0% 0%, #1a1a2e 0%, #004d40 50%, #00796b 100%)',
  };
  return themes[mood] || 'radial-gradient(at 0% 0%, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)';
};
  const getMiniMoodStyle = (mood) => {
    const colors = {
      'Sad': 'rgba(13, 71, 161, 0.9)',
      'Happy': 'rgba(27, 67, 50, 0.9)',
      'Energetic': 'rgba(179, 90, 31, 0.9)',
      'Melancholic': 'rgba(49, 27, 146, 0.9)',
      'Calm': 'rgba(0, 77, 64, 0.9)',
    };
    return colors[mood] || 'rgba(15, 15, 25, 0.9)';
  };

  const getFileName = (filePath) => {
    if (!filePath) return '';
    if (currentLibrary && config.libraries[currentLibrary]?.songTitles?.[filePath]) {
      return config.libraries[currentLibrary].songTitles[filePath];
    }
    if (filePath.startsWith('http')) return `YouTube Stream (${filePath.slice(-11)})`;
    return filePath.split(/[\\/]/).pop();
  };
const importPlaylist = async () => {
  if (!newPlaylistLink.trim()) return;
  setIsImportingPlaylist(true);

  const result = await window.electronAPI.importYoutubePlaylist(newPlaylistLink.trim());

  if (!result.success) {
    if (result.error === 'quota') {
      alert('YouTube import limit reached for today. Try again tomorrow.');
    } else {
      alert('Import failed: ' + result.error);
    }
    setIsImportingPlaylist(false);
    return;
  }

  // Filter out any URLs already in the library
  const library = config.libraries[currentLibrary];
  const existingUrls = new Set(library.allSongs);
  const newVideos = result.videos.filter(v => !existingUrls.has(v.url));

  if (newVideos.length === 0) {
    alert('All videos in this playlist are already in your library.');
    setIsImportingPlaylist(false);
    return;
  }

  const newConfig = {
    ...config,
    libraries: {
      ...config.libraries,
      [currentLibrary]: {
        ...library,
        allSongs: [...library.allSongs, ...newVideos.map(v => v.url)],
        songTitles: {
          ...library.songTitles,
          ...Object.fromEntries(newVideos.map(v => [v.url, v.title]))
        }
      }
    }
  };

  await saveConfig(newConfig);
  setNewPlaylistLink('');
  setIsImportingPlaylist(false);
 setPendingBulkAssign({ songs: newVideos.map(v => v.url), count: newVideos.length });
};
const bulkAssignMood = async (mood) => {
  const library = config.libraries[currentLibrary];
  const updatedMoods = {
    ...library.moods,
    [mood]: [...new Set([...library.moods[mood], ...pendingBulkAssign.songs])]
  };
  await saveConfig({
    ...config,
    libraries: {
      ...config.libraries,
      [currentLibrary]: { ...library, moods: updatedMoods }
    }
  });
  setPendingBulkAssign(null);
};
const exportLibraryCode = () => {
  const library = config.libraries[currentLibrary];

  // YouTube URLs only - local paths are useless on other machines
  const youtubeSongs = library.allSongs.filter(s => s.startsWith('http'));

  if (youtubeSongs.length === 0) {
    alert('No YouTube songs to share. This feature only works with YouTube tracks.');
    return;
  }

  const exportData = {
    name: currentLibrary,
songs: youtubeSongs.map(url => ({
  u: url,                                         
  t: library.songTitles?.[url] || '',
  m: Object.keys(library.moods).filter(m => library.moods[m].includes(url))
}))
  };

const code = 'CADENCE:' + btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
  setShareCode(code);
  setShowSharePanel(true);
};

const importLibraryCode = async () => {
  if (!importCode.trim().startsWith('CADENCE:')) {
    alert('Invalid share code. Make sure you copied the full code.');
    return;
  }

  try {
   const decoded = JSON.parse(decodeURIComponent(escape(atob(importCode.trim().replace('CADENCE:', '')))));

    // Build library from the share data
    const newMoods = { Happy: [], Sad: [], Energetic: [], Melancholic: [], Calm: [] };
    const newTitles = {};
    const newSongs = [];

decoded.songs.forEach(song => {
  newSongs.push(song.u);
  newTitles[song.u] = song.t;
  song.m.forEach(mood => {
    if (newMoods[mood]) newMoods[mood].push(song.u);
  });
});

    // Use imported name but avoid collisions
    let libraryName = decoded.name;
    if (config.libraries[libraryName]) {
      libraryName = `${decoded.name} (Imported)`;
    }

    const newConfig = {
      ...config,
      libraries: {
        ...config.libraries,
        [libraryName]: {
          path: `YOUTUBE_LIB_${Date.now()}`,
          moods: newMoods,
          allSongs: newSongs,
          songTitles: newTitles
        }
      }
    };

    await saveConfig(newConfig);
    setCurrentLibrary(libraryName);
    setImportCode('');
    setShowSharePanel(false);
    alert(`✅ Imported library "${libraryName}" with ${newSongs.length} songs!`);
  } catch (e) {
    alert('Failed to read share code. It may be corrupted.');
  }
};
  const addYoutubeLink = async () => {
    if (!newYtLink) return;

    // Show loading state
    const cleanUrl = newYtLink.trim();

    try {
      // Fetch video metadata from YouTube's oEmbed API
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`);

      if (response.ok) {
        const data = await response.json();
        const videoTitle = data.title; // Auto-fetched title!

        console.log("📺 Auto-fetched title:", videoTitle);

        // Auto-save with fetched title
        const library = config.libraries[currentLibrary];
        const newConfig = {
          ...config,
          libraries: {
            ...config.libraries,
            [currentLibrary]: {
              ...library,
              allSongs: [...library.allSongs, cleanUrl],
              songTitles: { ...library.songTitles, [cleanUrl]: videoTitle }
            }
          }
        };
        await saveConfig(newConfig);
        setNewYtLink('');


      } else {
        // Fallback to manual naming if fetch fails
        setPendingYoutubeUrl(cleanUrl);
        setModalType('youtube-name');
        setIsModalOpen(true);
        setNewYtLink('');
      }
    } catch (error) {
      console.error("Failed to fetch YouTube title:", error);
      // Fallback to manual naming
      setPendingYoutubeUrl(cleanUrl);
      setModalType('youtube-name');
      setIsModalOpen(true);
      setNewYtLink('');
    }
  };

  const toggleSongInMood = (mood, song) => {
    const library = config.libraries[currentLibrary];
    const songsInMood = library.moods[mood] || [];
    let newSongs = songsInMood.includes(song)
      ? songsInMood.filter(s => s !== song)
      : [...songsInMood, song];

    const newConfig = {
      ...config,
      libraries: {
        ...config.libraries,
        [currentLibrary]: {
          ...library,
          moods: { ...library.moods, [mood]: newSongs }
        }
      }
    };
    saveConfig(newConfig);
  };

  // --- 7. EMPTY STATE ---
 if (Object.keys(config.libraries).length === 0) {

  return (
    <div className="app empty-launch-screen">
      <div className="empty-state-card">
        <div className="empty-icon">🎵</div>
        <h1>Welcome to Cadence</h1>
        <p className="tagline">Mood-reactive music for immersive reading</p>

        <div className="quick-start-block">
          <button onClick={loadStarterPlaylist} className="btn-primary start-setup-btn quick-start-btn">
            ⚡ Quick Start
          </button>
          <p className="quick-start-desc">
            Load a curated starter playlist and hear Cadence working immediately — no setup required.
          </p>
        </div>

        <div className="divider-text">or</div>

        <button onClick={openAddLibraryModal} className="btn-secondary">
          🗂 Set Up My Own Library
        </button>

        <div className="feature-preview" style={{ marginTop: '32px' }}>
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <div>
              <strong>Auto Mode</strong>
              <p>Monitors your visual novel dialogue and switches music based on detected emotions</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎭</span>
            <div>
              <strong>Manual Moods</strong>
              <p>Trigger Happy, Sad, Energetic, Melancholic, or Calm at any time</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <div>
              <strong>Multiple Libraries</strong>
              <p>Organize music by game, series, or theme with local files and YouTube links</p>
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} title="New Library" onClose={() => setIsModalOpen(false)} onSubmit={handleModalSubmit} />
    </div>
  );
}
  const library = config.libraries[currentLibrary];
  const currentMood = moodEngine.currentMood;

  // --- 8. RENDER ---
  return (
    <div className={`app ${isMiniMode ? 'mini-mode' : ''}`}
      style={{
        transition: 'background 2s ease',
        background: isMiniMode ? 'transparent' : getMoodColor(currentMood)
      }}>


      <HiddenYoutube

        url={audio.youtubeUrl}
        isPlaying={audio.isPlaying}
        volume={audio.volume}
        onEnded={() => {
         if (continuousPlayRef.current) {
      playFromMix(); 
    } 

    else if (currentMood === 'Calm') {
      playRandomFromMood('Calm', true); 
    } 

    else {
      playRandomFromMood('Calm', true);
    }
        }}
        onError={(e) => {
          console.error("YouTube Error", e);
          playRandomFromMood('Calm', true);
        }}
      />

      {isMiniMode ? (
        <div className="mini-container" style={{ background: getMiniMoodStyle(currentMood), transition: 'background 2s ease' }}>
          <div className="mini-header">
            <span className="mini-title">🎵 Cadence </span>
            <div className="mini-controls">
              <button onClick={toggleAlwaysOnTop} className="mini-btn" title={alwaysOnTop ? "Disable Always on Top" : "Enable Always on Top"}>
                {alwaysOnTop ? '📌' : '📍'}
              </button>
              <button onClick={toggleMiniMode} className="mini-btn" title="Expand">⛶</button>
            </div>
          </div>

          {audio.currentSong && (
            <div className="mini-now-playing">
              <span className="mini-song-name">{getFileName(audio.currentSong)}</span>
              {currentMood && <span className="mini-mood-label">({currentMood})</span>}
            </div>
          )}

          <div className="mini-mood-buttons">
            {library && Object.keys(library.moods).slice(0, 5).map(mood => (
              <button key={mood} className={`mini-mood-btn ${currentMood === mood ? 'active' : ''}`} onClick={() => playRandomFromMood(mood)}>
                {mood}
              </button>
            ))}
          </div>

          <div className="mini-playback-controls">
            <button onClick={audio.togglePause} className="mini-control-btn">{audio.isPlaying ? '⏸' : '▶'}</button>
            <button onClick={audio.stopAll} className="mini-control-btn">⏹</button>
            <label className="mini-checkbox">
              <input type="checkbox" checked={continuousPlay} onChange={(e) => setContinuousPlay(e.target.checked)} />
           Loop Mood
            </label>
          </div>
        </div>
      ) : (
        /* --- FULL MODE --- */
        <>
          <header className="main-header">
            <div className="header-left">
<h1 className="app-logo">
  <span className="logo-icon">🎵</span> Cadence
</h1>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['Happy', 'Sad', 'Energetic', 'Melancholic', 'Calm'].map((mood) => {
                  const letter = mood.charAt(0); // H, S, E...
                  const score = moodEngine.moodScores[mood] || 0;
                  const isActive = moodEngine.currentMood === mood;

                  return (
                    <span
                      key={mood}
                      className={`badge ${isActive || (moodEngine.isAutoMode && score > 0) ? 'active' : ''}`}
                      onClick={() => playRandomFromMood(mood)}
                      title={mood}
                      style={{ cursor: 'pointer', minWidth: '20px', textAlign: 'center' }}
                    >
                      {/* Always show the Letter */}
                      {letter}

                      {/* Only show ": Score" if Auto Mode is ON */}
                      {moodEngine.isAutoMode && (
                        <span style={{ opacity: 0.8, marginLeft: '2px' }}>: {score}</span>
                      )}
                    </span>
                  );
                })}
              </div>
              {autoModeEnabled && (
                <div className="mood-debug-badges">
                  {Object.entries(moodEngine.moodScores).map(([m, score]) => (
                    <span key={m} className={`badge ${score > 0 ? 'active' : ''}`}>{m.charAt(0)}: {score}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="header-controls">
              <Tooltip content="Adjusts how sensitive mood detection is. Higher = switches faster">
                <div className="threshold-control">
                  <label>Sensitivity: {threshold}</label>
                  <input type="range" min="1" max="10" value={threshold} onChange={(e) => updateThreshold(e.target.value)} />
                </div></Tooltip>
              <div className="volume-control">
                <label>🔊</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audio.volume * 100}
                  onChange={(e) => audio.setVolumeLevel(e.target.value / 100)}
                  style={{ width: '100px' }}
                />
                <span>{Math.round(audio.volume * 100)}%</span>
              </div>
       <Tooltip content="Automatically monitors visual novel dialogue log for emotions.">
  <button
    onClick={moodEngine.toggleAutoMode}
    className={`status-indicator-btn ${moodEngine.isAutoMode ? "active" : ""}`}
  >
    <div className="status-light"></div>
    <span className="status-text">
      {moodEngine.isAutoMode ? 'LINKED: ON' : 'AUTO: OFF'}
    </span>
    
    {/* Visual "waveform" bars that only appear when active */}
    {moodEngine.isAutoMode && (
      <div className="signal-bars">
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>
    )}
  </button>
</Tooltip>

              <Tooltip content="Compact mode that stays on top of your visual novel">
                <button onClick={toggleMiniMode} className="control-btn btn-secondary">⛶ Minimize</button></Tooltip>
              <button onClick={() => window.close()} className="control-btn btn-stop" style={{ padding: '8px 12px' }}>✕</button>
            </div>
          </header>

          <div className="library-tabs-container">
            <div className="library-tabs">
              {Object.keys(config.libraries).map(libName => (
                <div key={libName} className="tab-wrapper">
                  <button className={`tab-btn ${currentLibrary === libName ? 'active' : ''}`} onClick={() => setCurrentLibrary(libName)}>
                    {libName}
                  </button>
                  {currentLibrary === libName && (
                    <div className="tab-actions">
                      <button onClick={() => rescanLibrary(libName)} title="Rescan">🔄</button>
                      <button onClick={() => renameLibrary(libName)} title="Rename">✏️</button>
                      <button onClick={() => deleteLibrary(libName)} title="Delete" className="text-danger">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
              {currentLibrary && library?.path?.startsWith('YOUTUBE_LIB_') && (
  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
    <button onClick={exportLibraryCode} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
      📤 Share Library
    </button>
    <button onClick={() => setShowSharePanel(p => !p)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
      📥 Import Code
    </button>
  </div>
)}
              <button onClick={openAddLibraryModal} className="tab-btn add-tab-btn">+ Add Library</button>
            </div>
          </div>

          {showSharePanel && (
  <div style={{
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }}>
    {shareCode && (
      <div>
        <p style={{ margin: '0 0 6px', fontSize: '0.85rem', opacity: 0.7 }}>
          Share this code — YouTube songs and mood assignments only. Local files are not included.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            readOnly
            value={shareCode}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px', borderRadius: '4px', flex: 1, fontSize: '0.75rem' }}
          />
          <button
       onClick={async () => { 
  await window.electronAPI.copyToClipboard(shareCode); 
  alert('Copied!'); 
}}
            className="btn-primary"
          >
            Copy
          </button>
        </div>
      </div>
    )}

    <div>
      <p style={{ margin: '0 0 6px', fontSize: '0.85rem', opacity: 0.7 }}>
        Paste a share code to import a library:
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Paste CADENCE:... code here"
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px', borderRadius: '4px', flex: 1 }}
        />
        <button onClick={importLibraryCode} className="btn-primary">Import</button>
        <button onClick={() => { setShowSharePanel(false); setShareCode(''); setImportCode(''); }} className="btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
)}

          {audio.currentSong && (
            <div className="now-playing">
              <div className="now-playing-content">
                <span className="label">Now Playing:</span>
                <span className="song-name">{getFileName(audio.currentSong)}</span>
                {audio.isPlaying && <span className="playing-indicator">♪</span>}
                {currentMood && <span style={{ marginLeft: '10px', opacity: 0.7 }}>({currentMood})</span>}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={continuousPlay} onChange={(e) => setContinuousPlay(e.target.checked)} />
     <span>Continuous Play</span>
                </label>
                <button onClick={audio.togglePause} className={audio.isPlaying ? "btn-secondary" : "btn-primary"}>
                  {audio.isPlaying ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button onClick={audio.stopAll} className="btn-stop">⏹ Stop</button>
              </div>
            </div>
          )}

          {/* MOOD GRID */}
          {!editingMoods && library && (
            <div className="mood-container">
              <div className="mood-header">
                <h2>Select a Mood:</h2>
                <Tooltip content="Add songs and assign moods here.">


                  <button onClick={() => setEditingMoods(true)} className={`btn-secondary ${needsMoodSetup() ? 'needs-attention' : ''}`}>   📝 Manage Songs & Moods
                    {needsMoodSetup() && <span className="pulse-dot"></span>}
                  </button>
                </Tooltip>
              </div>
              <div className="mood-grid">

                {['Happy', 'Sad', 'Energetic', 'Melancholic', 'Calm'].map(mood => {


                  if (!library.moods[mood]) return null;

                  return (
                    <button key={mood} className="mood-card" onClick={() => playRandomFromMood(mood)}>
                      <div className="mood-name">{mood}</div>
                      <div className="song-count">{library.moods[mood].length} songs</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
{!editingMoods && library && (
  <div className="mixer-panel">
    <div className="mixer-header">
      <div className="mixer-title">
        <span className="icon">🎛️</span> 
        <span>Mood Synthesizer</span>
      </div>
      
      {/* Dynamic Mix Gradient Bar */}
      <div className="mix-visualizer" style={{
        background: `linear-gradient(90deg, ${
          Object.keys(moodMix).filter(m => moodMix[m]).length > 0 
            ? Object.keys(moodMix).filter(m => moodMix[m]).map(m => {
                if(m === 'Happy') return '#43e97b';
                if(m === 'Sad') return '#4facfe';
                if(m === 'Energetic') return '#f85032';
                if(m === 'Melancholic') return '#9b7bc8';
                return '#00f2fe'; // Calm
              }).join(', ')
            : '#333'
        })`
      }}></div>
    </div>

    <div className="mixer-controls">
      <div className="mixer-toggles">
        {Object.keys(moodMix).map(mood => (
          <button
            key={mood}
            onClick={() => setMoodMix(prev => ({ ...prev, [mood]: !prev[mood] }))}
            className={`mixer-pill ${mood.toLowerCase()} ${moodMix[mood] ? 'active' : ''}`}
          >
            <span className="dot"></span>
            {mood}
          </button>
        ))}
      </div>

      <div className="mixer-action">
         <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setContinuousPlay(true); 
            playFromMix(); 
          }}
          className="btn-synth"
          disabled={Object.values(moodMix).every(v => !v)}
        >
          <span className="play-icon">⚡</span> 
          INITIATE MIX
        </button>
      </div>
    </div>
  </div>
)}
          {/* EDITOR */}
          {editingMoods && library && (
            <div className="mood-editor-overlay">
              <div className="mood-editor-card">
                <div className="mood-editor-header">
                  <div className="editor-title-group">
                    <h2>Organizing Library: {currentLibrary}</h2>
                    <p>{library.allSongs.length} songs found in folder</p>
                  </div>
                  <button onClick={() => { audio.stopAll(); setEditingMoods(false); }} className="btn-primary done-btn">
                    Save & Exit
                  </button>
                </div>

                <div className="mood-editor-toolbar">
                  <input
                    type="text"
                    placeholder="🔍 Search songs..."
                    value={songFilter}
                    onChange={(e) => setSongFilter(e.target.value)}
                    className="song-search"
                  />
                  <div className="youtube-adder" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input type="text" placeholder="Paste YouTube Link..." value={newYtLink} onChange={(e) => setNewYtLink(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px', borderRadius: '4px', flex: 1 }} />
                    <button onClick={addYoutubeLink} className="btn-secondary">+ Add Link</button>
                  </div>
                  {library.path?.startsWith('YOUTUBE_LIB_') && (
  <div className="youtube-adder" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
    <input
      type="text"
      placeholder="Paste YouTube Playlist URL..."
      value={newPlaylistLink}
      onChange={(e) => setNewPlaylistLink(e.target.value)}
      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px', borderRadius: '4px', flex: 1 }}
    />
    <button
      onClick={importPlaylist}
      disabled={isImportingPlaylist}
      className="btn-secondary"
    >
      {isImportingPlaylist ? '⏳ Importing...' : '📥 Import Playlist'}
    </button>
  </div>
)}
{pendingBulkAssign && (
  <div style={{
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    padding: '14px 16px',
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.9rem' }}>
        ✅ <strong>{pendingBulkAssign.count} songs imported!</strong> Assign all to a mood:
      </span>
      <button
        onClick={() => setPendingBulkAssign(null)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '1rem' }}
        title="Skip, assign manually"
      >
        ✕
      </button>
    </div>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {['Happy', 'Sad', 'Energetic', 'Melancholic', 'Calm'].map(mood => (
        <button
          key={mood}
          onClick={() => bulkAssignMood(mood)}
          className={`mood-pill ${mood.toLowerCase()}`}
          style={{ opacity: 1 }}
        >
          {mood}
        </button>
      ))}
    </div>
    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
      You can always fine-tune individual songs using the mood pills in the table below.
    </span>
  </div>
)}
                  <span className="hint">Click the mood pills next to each song to assign them.</span>
                </div>

                <div className="mood-editor-scroll-area">
                  <table className="song-mood-table">
                    <thead>
                      <tr>
                        <th>Song Filename</th>
                        <th>Assigned Moods</th>
                      </tr>
                    </thead>
                    <tbody>
             {library.allSongs
  .filter(song => {
    if (!songFilter) return true;
    const fileName = getFileName(song).toLowerCase();
    return fileName.includes(songFilter.toLowerCase());
  })
  .map(song => (
                        <tr key={song} className="song-row">
                          <td className="song-name-cell">
                            <div style={{ display: 'inline-flex', gap: '4px', marginRight: '8px', verticalAlign: 'middle' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeSong(song); }}
                                style={{
                                  background: 'rgba(255, 100, 100, 0.2)',
                                  color: '#ff6b6b',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  fontSize: '12px'
                                }}
                                title="Remove Song"
                              >
                                ✕
                              </button>
                              <button
                                className={`preview-btn ${previewingSong === song ? 'is-playing' : ''}`}
                                onClick={() => togglePreview(song)}
                              >
                                {previewingSong === song ? '⏹' : '▶'}
                              </button>
                            </div>
                            <span title={song} style={{ fontSize: song.startsWith('http') ? '0.8rem' : 'inherit' }}>
                              {getFileName(song)}
                            </span>
                          </td>
                          <td className="mood-pills-cell">
                            {['Happy', 'Sad', 'Energetic', 'Melancholic', 'Calm'].map(mood => {
                              const isActive = library.moods[mood]?.includes(song);
                              return (
                                <button key={mood} onClick={() => toggleSongInMood(mood, song)} className={`mood-pill ${mood.toLowerCase()} ${isActive ? 'active' : ''}`}>
                                  {mood}
                                </button>
                              );
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <Modal
            isOpen={isModalOpen}
            title={modalType === 'library' ? "Enter Library Name" : modalType === 'mood' ? "Enter New Mood Name" : modalType === 'rename' ? `Rename "${renameTarget}"` : modalType === 'youtube-name' ? "Name this YouTube Track" : "Enter Name"}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleModalSubmit}
          />
        </>
      )}
    </div>
  );
}

export default App;