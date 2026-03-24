require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, Menu, session, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');

const chokidar = require('chokidar');
const YOUTUBE_API_KEY = process.env.VITE_YOUTUBE_API_KEY;
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
]);

// --- 2. SETTINGS & VARS ---
const isDev = !app.isPackaged;
const PORT = 3000;
let mainWindow;

// --- 3. START INTERNAL SERVER (Production Only) ---
if (!isDev) {
  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: path.join(__dirname, 'dist'),
      rewrites: [
        { source: '**', destination: '/index.html' }
      ]
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Internal Server running SECURELY on http://127.0.0.1:${PORT}`);
  });
}

// --- 4. CREATE WINDOW ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    transparent: true,
    frame: false,
    thickFrame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { isEditable, editFlags } = params;

    if (isEditable) {
      const menu = Menu.buildFromTemplate([
        { label: 'Cut', role: 'cut', enabled: editFlags.canCut },
        { label: 'Copy', role: 'copy', enabled: editFlags.canCopy },
        { label: 'Paste', role: 'paste', enabled: editFlags.canPaste },
        { type: 'separator' },
        { label: 'Select All', role: 'selectAll', enabled: editFlags.canSelectAll }
      ]);

      menu.popup();
    }
  });
  // --- 5. FIXED: CSP HEADERS (Added 'media:') ---
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          // Added 'media:' to default-src and media-src below
          "default-src 'self' 'unsafe-inline' data: blob: media: http://localhost:* https://*.youtube.com https://*.googlevideo.com; " +
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:* https://*.youtube.com https://s.ytimg.com; " +
          "frame-src 'self' http://localhost:* https://*.youtube.com https://www.youtube-nocookie.com; " +
          "img-src 'self' data: https://i.ytimg.com https://*.ytimg.com; " +
          // Added 'media:' here so the audio player is allowed to load it
          "media-src 'self' blob: media: http://localhost:* https://*.googlevideo.com; " +
          "connect-src 'self' http://localhost:* https://*.youtube.com https://*.googlevideo.com"
        ]
      }
    });
  });

  mainWindow.setMenu(null);

  if (isDev) {
    console.log("🔧 Mode: DEVELOPMENT");
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log("🏭 Mode: PRODUCTION (Server-backed)");
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }
}

// --- 6. APP LIFECYCLE ---
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

app.whenReady().then(async () => {
  await session.defaultSession.clearCache();
  protocol.handle('media', (request) => {
    let filePath = request.url.replace('media://', '');
    if (filePath.match(/^[a-zA-Z]\//)) {
      filePath = filePath[0].toUpperCase() + ':' + filePath.slice(1);
    }
    const decodedPath = decodeURIComponent(filePath);
    try {
      const finalUrl = require('url').pathToFileURL(decodedPath).toString();
      return net.fetch(finalUrl);
    } catch (error) {
      return new Response('File not found', { status: 404 });
    }
  });

  createWindow();

  globalShortcut.register('MediaPlayPause', () => {
    mainWindow.webContents.send('toggle-pause');
  });
  globalShortcut.register('F9', () => {
    mainWindow.webContents.send('toggle-pause');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
// --- 7. IPC HANDLERS ---

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
});
ipcMain.handle('copy-to-clipboard', (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return true;
});
ipcMain.handle('scan-music-folder', async (event, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    const musicFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext);
    });
    return musicFiles.map(file => path.join(folderPath, file));
  } catch (error) {
    console.error('Error scanning folder:', error);
    return [];
  }
});
ipcMain.handle('import-youtube-playlist', async (event, playlistUrl) => {
  const match = playlistUrl.match(/[?&]list=([^&]+)/);
  if (!match) return { success: false, error: 'Invalid playlist URL. Make sure it contains ?list= in the URL.' };
  const playlistId = match[1];

  let allVideos = [];
  let nextPageToken = null;

  try {
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const response = await net.fetch(url);
      const data = await response.json();

      if (data.error) {
        if (data.error.code === 403) {
          return { success: false, error: 'quota' };
        }
        return { success: false, error: data.error.message };
      }

      // Filter out deleted/private videos
      const validVideos = (data.items || []).filter(v =>
        v.snippet.title !== 'Deleted video' &&
        v.snippet.title !== 'Private video'
      );

      allVideos = allVideos.concat(validVideos);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return {
      success: true,
      videos: allVideos.map(v => ({
        url: `https://www.youtube.com/watch?v=${v.snippet.resourceId.videoId}`,
        title: v.snippet.title
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'music-config.json');
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { libraries: {} };
  }
});

ipcMain.handle('save-config', async (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'music-config.json');
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('toggle-always-on-top', (event, enabled) => {
  mainWindow.setAlwaysOnTop(enabled);
  return enabled;
});

ipcMain.handle('set-mini-mode', (event, isMini) => {
  if (isMini) {
    mainWindow.setSize(500, 250);
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true);
  } else {
    mainWindow.setSize(1200, 800);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.center();
  }
  return isMini;
});

// --- DIALOGUE MONITOR LOGIC ---
let dialogueWatcher = null;
let lastFileSize = 0;
let debounceTimer = null;
let lastChangeTime = 0;

ipcMain.handle('start-dialogue-monitor', async (event, filePath) => {
  try {
    if (dialogueWatcher) {
      await dialogueWatcher.close();
      dialogueWatcher = null;
    }

    try {
      await fs.writeFile(filePath, '', 'utf-8');
      lastFileSize = 0;
      console.log("🧹 Session started: Log file cleared.");
    } catch (e) {
      const stats = await fs.stat(filePath);
      lastFileSize = stats.size;
    }

    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

    await fs.access(filePath);

    dialogueWatcher = chokidar.watch(filePath, {
      persistent: true, usePolling: true, interval: 500,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 }
    });

    dialogueWatcher.on('change', async () => {
      const now = Date.now();
      if (now - lastChangeTime < 100) return;
      lastChangeTime = now;

      try {
        const stats = await fs.stat(filePath);
        const currentSize = stats.size;

        if (currentSize > lastFileSize) {
          const bufferSize = currentSize - lastFileSize;
          const buffer = Buffer.alloc(bufferSize);
          const fd = await fs.open(filePath, 'r');
          await fd.read(buffer, 0, bufferSize, lastFileSize);
          await fd.close();

          const newText = buffer.toString('utf8');
          const lines = newText.trim().split(/\r?\n/);
          const lastLine = lines[lines.length - 1]?.trim();

          if (!lastLine || lastLine.startsWith('===') || lastLine.startsWith('---')) {
            lastFileSize = currentSize;
            return;
          }

          const result = analyzeMood(lastLine);
          if (result && mainWindow) {
            mainWindow.webContents.send('auto-mood-detected', result.mood, lastLine, result.intensity);
          }
          lastFileSize = currentSize;
        } else if (currentSize < lastFileSize) {
          lastFileSize = 0;
        }
      } catch (err) { console.error("Tail Error:", err); }
    });

    return { success: true };
  } catch (error) {
    console.error("Monitor start error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-dialogue-monitor', async () => {
  try {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (dialogueWatcher) { await dialogueWatcher.close(); dialogueWatcher = null; }
    if (global.gc) global.gc();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// --- MOOD ANALYZER ---
function analyzeMood(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();

  const moodKeywords = {
    'Sad': ['cry', 'sob', 'weep', 'tear', 'died', 'death', 'lost', 'goodbye', 'miss', 'alone', 'pain', 'hurt', 'broken', 'funeral', 'grief', 'sorry', 'stupid'],
    'Happy': ['haha', 'wonderful', 'excited', 'amazing', 'perfect',
      'joy', 'happy', 'fantastic', 'blush', 'giggle', 'glad'],
    'Energetic': ['battle', 'power', 'run', 'fast', 'quick', 'hurry', 'action', 'intense', 'victory', 'danger', 'suddenly', 'clash', 'emergency', 'strike', 'stop', 'escalated', 'combat'],
    'Melancholic': ['memory', 'past', 'nostalgic', 'hollow', 'distant', 'fade', 'dream', 'sigh', 'lonely', 'autumn', 'nostalgia', 'stare', 'silent', 'quiet', 'shadow', 'years', 'old', 'remind', 'drift', 'window', 'sunset', 'night', 'staring', 'cold', 'winter', 'gray', 'grey', 'slowly', 'thinking'],
    'Calm': ['peaceful', 'relax', 'calm', 'quiet', 'gentle', 'soft', 'slow', 'serene', 'tranquil', 'rest', 'breeze', 'afternoon', 'warm', 'sleepy', 'steady', 'safe', 'sit'],
    'Romantic': ['heart', 'darling', 'kiss', 'together', 'hold', 'feelings', 'confess', 'longing', 'tender', 'embrace'],
    'Spooky': ['dark', 'ghost', 'fear', 'scream', 'haunted', 'curse', 'blood', 'terror', 'eerie', 'dread'],
    'Hopeful': ['hope', 'someday', 'believe', 'chance', 'begin', 'tomorrow', 'forward', 'dawn', 'overcome', 'wish', 'brighter', 'courage'],
  };

  let lineScores = {
    'Sad': 0, 'Happy': 0, 'Energetic': 0, 'Melancholic': 0, 'Calm': 0,
    'Romantic': 0, 'Spooky': 0, 'Hopeful': 0
  };
  let foundAny = false;

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    keywords.forEach(word => {
      const count = lowerText.split(word).length - 1;
      if (count > 0) { lineScores[mood] += count; foundAny = true; }
    });
  }

  if (!foundAny) return null;

  const topMood = Object.keys(lineScores).reduce((a, b) => lineScores[a] > lineScores[b] ? a : b);
  return { mood: topMood, intensity: lineScores[topMood] };
}