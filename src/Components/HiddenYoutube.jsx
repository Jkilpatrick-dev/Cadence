import React, { useEffect, useRef } from 'react';

const HiddenYoutube = ({ url, isPlaying, onEnded, volume, onError }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);

  // Sync volume dynamically
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(volume * 100); 
    }
  }, [volume]);

  // Keep refs up to date
  useEffect(() => {
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
  }, [onEnded, onError]);

  useEffect(() => {
    if (!url) return;

    // Load YouTube API if missing
    if (!window.YT && !document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : null;
      if (!videoId) return;

      if (playerRef.current) {
        playerRef.current.destroy();
      }


      if (containerRef.current) {
        containerRef.current.innerHTML = ''; 
        const ytDiv = document.createElement('div');
        ytDiv.style.width = '100%';
        ytDiv.style.height = '100%';
        ytDiv.style.pointerEvents = 'none';
        containerRef.current.appendChild(ytDiv);

        try {
          playerRef.current = new window.YT.Player(ytDiv, {
            videoId: videoId,
            host: 'https://www.youtube-nocookie.com',
            playerVars: {
              autoplay: 1,
              controls: 0,
              enablejsapi: 1,
              origin: window.location.origin
            },
            events: {
              onReady: (event) => {
                event.target.unMute();
                event.target.setVolume(volume * 100);
                if (isPlaying) {
                   event.target.playVideo();
                }
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.ENDED) {
                  if (onEndedRef.current) onEndedRef.current();
                }
              },
              onError: (event) => {
                if (onErrorRef.current) onErrorRef.current(event);
              }
            }
          });
        } catch (error) {
          console.error("❌ Error creating player:", error);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => initPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url]);

  // Handle play/pause from parent
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.playVideo) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      // Player not ready yet, ignore
    }
  }, [isPlaying]);

  if (!url) return null;

  return (

    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed',
        top: '0',
        left: '0',
        width: '320px',
        height: '180px',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
        tabIndex: -1
      }} 
    />
  );
};

export default HiddenYoutube;