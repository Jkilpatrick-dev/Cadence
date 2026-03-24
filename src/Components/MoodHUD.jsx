import React, { useEffect, useState } from 'react';

// Maps full names to single letters
const MOOD_MAP = {
  'Happy': 'H', 'Sad': 'S', 'Energetic': 'E',
  'Melancholic': 'M', 'Calm': 'C',
  'Romantic': 'R', 'Spooky': 'Sp', 'Hopeful': 'Ho'
};

const MoodHUD = ({ currentMood, onMoodChange }) => {
  const [detectedMood, setDetectedMood] = useState(null);

  // Listen for the "Auto Mood" signal from Electron
  useEffect(() => {
    if (!window.electron) return;

    const handleAutoMood = (mood, line, intensity) => {
      // 1. Light it up!
      setDetectedMood(mood);

      // 2. Tell the parent app to switch music
      if (onMoodChange) onMoodChange(mood);

      // 3. Turn off the "flash" after 1.5 seconds
      setTimeout(() => setDetectedMood(null), 1500);
    };

    // The listener you added to preload.js
window.electronAPI.onAutoMoodDetected(handleAutoMood);
}, [onMoodChange]);

  return (
    <div style={styles.container}>
      {Object.keys(MOOD_MAP).map((moodName) => {
        // It lights up if it's the Current active song OR if it was just Detected
        const isActive = currentMood === moodName;
        const isFlashed = detectedMood === moodName;
        const letter = MOOD_MAP[moodName];

        return (
          <div
            key={moodName}
            onClick={() => onMoodChange(moodName)} // Manual click works too
            title={moodName} // Hover to see full name
            style={{
              ...styles.light,
              // Different colors for each mood? Or just uniform 'On/Off'?
              // Let's go with the "Light Up" effect:
              backgroundColor: isActive || isFlashed ? getMoodColor(moodName) : '#222',
              color: isActive || isFlashed ? '#000' : '#555',
              boxShadow: isFlashed ? `0 0 15px ${getMoodColor(moodName)}` : 'none',
              borderColor: isActive ? getMoodColor(moodName) : '#444',
              transform: isFlashed ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
};

// --- STYLES ---
const styles = {
  container: {
      display: 'flex',
       flexDirection: 'column',
    position: 'fixed',
    top: '50%',          // Center vertically
    left: '20px',
    transform: 'translateY(-50%)', // Perfect centering
    flexDirection: 'column',       // <--- Stack them vertically
    gap: '12px',
    zIndex: 9999,
    background: 'rgba(0,0,0,0.4)',
    padding: '10px',
    borderRadius: '20px',
    backdropFilter: 'blur(4px)'
  },
  light: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease-out'
  }
};

// Helper for the "Glow" colors
const getMoodColor = (mood) => {
  switch (mood) {
    case 'Happy': return '#FFD700';      // Gold
    case 'Sad': return '#00BFFF';        // Blue
    case 'Energetic': return '#FF4500';  // Red/Orange
    case 'Melancholic': return '#9370DB';// Purple
    case 'Calm': return '#00FA9A';       // Spring Green
    case 'Romantic': return '#FF69B4';  // Hot pink
    case 'Spooky': return '#DC2626';   // Sickly green
    case 'Hopeful': return '#87CEEB';
    default: return '#FFF';
  }
};

export default MoodHUD;