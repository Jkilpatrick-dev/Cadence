const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanMusicFolder: (folderPath) => ipcRenderer.invoke('scan-music-folder', folderPath),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  importYoutubePlaylist: (playlistUrl) => ipcRenderer.invoke('import-youtube-playlist', playlistUrl),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  // Mini mode functions - ADD THESE IF MISSING
  toggleAlwaysOnTop: (enabled) => ipcRenderer.invoke('toggle-always-on-top', enabled),
  setMiniMode: (isMini) => ipcRenderer.invoke('set-mini-mode', isMini),
  
  // Dialogue monitoring functions - ADD THESE IF MISSING
  startDialogueMonitor: (filePath) => ipcRenderer.invoke('start-dialogue-monitor', filePath),
  stopDialogueMonitor: () => ipcRenderer.invoke('stop-dialogue-monitor'),
onAutoMoodDetected: (callback) => {
  const channel = 'auto-mood-detected';
  // 1. MUST remove all previous listeners to stop the "2" bug
  ipcRenderer.removeAllListeners(channel);
  
  const subscription = (event, mood, rawText, intensity) => callback(mood, rawText, intensity);
  ipcRenderer.on(channel, subscription);
  
  return () => {
    ipcRenderer.removeListener(channel, subscription);
  };
},
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

});