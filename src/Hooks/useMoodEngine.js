import { useState, useEffect, useRef, useCallback } from 'react';

// Configuration constants
const SCORE_THRESHOLD = 3;
const DECAY_INTERVAL = 10000;
const KEYWORD_WEIGHTS = {
  'Sad': 2, 'Happy': 2, 'Energetic': 2, 'Melancholic': 2, 'Calm': 2
};

export function useMoodEngine(onMoodTrigger,threshold = 3) {
  const [moodScores, setMoodScores] = useState({ 
    Happy: 0, Sad: 0,  Energetic: 0,Melancholic: 0, Calm: 0 
  });
  const [currentMood, setCurrentMood] = useState(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  
  // Refs to prevent stale closures
  const currentMoodRef = useRef(currentMood);
  const isTransitioningRef = useRef(false);

  useEffect(() => { currentMoodRef.current = currentMood; }, [currentMood]);

  // --- NEW: TOGGLE LOGIC (Handles File Selection) ---
  const toggleAutoMode = useCallback(async () => {
    if (!isAutoMode) {
      // 1. TURNING ON: Ask for folder
      if (!window.electronAPI) return;
      
      const folderPath = await window.electronAPI.selectFolder();
      if (!folderPath) return; // User cancelled

      const dialoguePath = `${folderPath}\\dialogue_log.txt`;
      const result = await window.electronAPI.startDialogueMonitor(dialoguePath);

      if (result.success) {
        setIsAutoMode(true);
        console.log("🤖 Auto-mode started.");
        
        // Prime with Calm if nothing is playing
        if (onMoodTrigger) onMoodTrigger('Calm'); 
      } else {
        alert("Failed to start monitor: " + result.error);
      }
    } else {
      // 2. TURNING OFF
      await window.electronAPI.stopDialogueMonitor();
      setIsAutoMode(false);
    }
  }, [isAutoMode, onMoodTrigger]);


  // 1. Decay Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setMoodScores(prev => {
        const newScores = { ...prev };
        Object.keys(newScores).forEach(m => {
          if (newScores[m] > 0) newScores[m] = Math.max(0, newScores[m] - 1);
        });
        return newScores;
      });
    }, DECAY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // 2. Electron Listener
  useEffect(() => {
    if (!window.electronAPI?.onAutoMoodDetected) return;

    const removeListener = window.electronAPI.onAutoMoodDetected((detectedMood, rawText, intensity = 1) => {
      // Gatekeeper: Only process if Auto Mode is actually ON in state
      if (isTransitioningRef.current || !isAutoMode) return;

        if (detectedMood === currentMoodRef.current) {
      console.log(`⏭️ Already in ${detectedMood}, ignoring keyword`);
      

      setMoodScores(prev => ({
        ...prev,
        [detectedMood]: prev[detectedMood] + ((KEYWORD_WEIGHTS[detectedMood] || 1) * intensity)
      }));
      return; 
    }

      setMoodScores(prev => {
        const weight = (KEYWORD_WEIGHTS[detectedMood] || 1) * intensity;
        const newScore = prev[detectedMood] + weight;
        
        const isBaseline = currentMoodRef.current === 'Calm' || currentMoodRef.current === null;
        const isNewMood = detectedMood !== currentMoodRef.current;
        const buffer = (isNewMood && !isBaseline && intensity === 1) ? 1 : 0;
        
        if (newScore >= (threshold + buffer)) {
          console.log(`🎯 Hook: Threshold Met for ${detectedMood}`);
          
          isTransitioningRef.current = true;
          setCurrentMood(detectedMood);
          
          if (onMoodTrigger) onMoodTrigger(detectedMood);
          
          setTimeout(() => { isTransitioningRef.current = false; }, 2000);
          return { Happy: 0, Sad: 0,  Energetic: 0,Melancholic: 0, Calm: 0 };
        }
        
        return { ...prev, [detectedMood]: newScore };
      });
    });

    return () => removeListener();
  }, [isAutoMode, onMoodTrigger,threshold]); // dependency on isAutoMode ensures listener respects the switch

  return {
    moodScores,
    currentMood,
    setCurrentMood,
    isAutoMode,       // Export the state
    toggleAutoMode    // Export the NEW function
  };
}