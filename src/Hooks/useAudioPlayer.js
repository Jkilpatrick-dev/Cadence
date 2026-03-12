import { useState, useRef, useCallback, useEffect } from 'react';
import { Howl } from 'howler';

export function useAudioPlayer(onTrackEnd) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [isYoutube, setIsYoutube] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(null);
 const [volume, setVolume] = useState(0.7);
   const volumeRef = useRef(volume); 
 const audioRef = useRef(new Audio());
   const youtubePlayerRef = useRef(null); 
    const soundRef = useRef(null); 

      useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
 useEffect(() => {
    if (soundRef.current && !isYoutube) {
      soundRef.current.volume(volume);

    }
  }, [volume, isYoutube]);
    const setVolumeLevel = (level) => {
    const clampedVolume = Math.max(0, Math.min(1, level));
    setVolume(clampedVolume);
  };

  const stopAll = useCallback(() => {
    // Stop Howler
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
      soundRef.current = null;
    }
    // Stop YouTube
    setYoutubeUrl(null); 
    setIsYoutube(false);
    setIsPlaying(false);
      setCurrentSong(null); 
  }, []);
const playTrack = useCallback((songPath) => {
    // 1. Stop current track
    if (soundRef.current) {
      const oldSound = soundRef.current;
      oldSound.fade(oldSound.volume(), 0, 1000);
      setTimeout(() => { oldSound.unload(); }, 1100);
    }
    
    // 2. Determine Mode using the ORIGINAL path (don't clean yet)
    const lowerSong = songPath.toLowerCase();
    const isYoutubeLink = lowerSong.includes("youtube.com") || lowerSong.includes("youtu.be");
    const isWeb = lowerSong.startsWith("http") || isYoutubeLink;

    setCurrentSong(songPath);
    setIsPlaying(true);

    if (isWeb) {
      // --- YOUTUBE MODE ---
      // ONLY clean spaces for YouTube
      const cleanPath = songPath.replace(/\s/g, ''); 

      setIsYoutube(true);
      
      let finalUrl = cleanPath;
      if (!cleanPath.startsWith("http")) finalUrl = `https://${cleanPath}`;

      // Clean Playlist Junk
      try {
          if (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be")) {
              if (finalUrl.includes("v=")) {
                  const parts = finalUrl.split('v=');
                  // specific check to avoid index errors
                  if (parts[1]) {
                      const videoId = parts[1].split('&')[0];
                      finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  }
              }
          }
      } catch (e) {
          console.warn("Cleaner failed, using raw URL");
      }
      
      setYoutubeUrl(finalUrl);

    } else {

      setIsYoutube(false);
      setYoutubeUrl(null);
          audioRef.current.volume = volume; 
      // Just ensure forward slashes for the protocol
      const webPath = songPath.replaceAll("\\", "/");
          const currentVolume = volumeRef.current;
      // Use the media:// protocol
      const sound = new Howl({
        src: [`media://${webPath}`],
        html5: false,
         volume: currentVolume,

       onplay: () => {
    const targetVolume = volumeRef.current; 
    sound.fade(0, targetVolume, 1000); 
    console.log("▶️ Fading to volume:", targetVolume);
  },
        onend: () => { if (onTrackEnd) onTrackEnd(); },
        onloaderror: (id, err) => console.error("Howler Error:", err)
      });
      
      soundRef.current = sound;
      sound.play();
    }
  }, [onTrackEnd]);
  const togglePause = () => {
    if (isPlaying) {
      // Pause
      if (!isYoutube && soundRef.current) soundRef.current.pause();
      setIsPlaying(false);
    } else {
      // Resume
      if (!isYoutube && soundRef.current) soundRef.current.play();
      setIsPlaying(true);
    }
  };

  return {
    isPlaying,
    currentSong,
    isYoutube,
    youtubeUrl,
    playTrack,
    stopAll,
    volume,
    setVolumeLevel,
    togglePause,
    setIsPlaying, 
    youtubePlayerRef 
  };
}