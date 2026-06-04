import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Mic2 } from 'lucide-react';

const parseLyrics = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const parsed = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)/;
  
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        parsed.push({ time: minutes * 60 + seconds, text });
      }
    }
  }
  return parsed;
};

export default function LyricsView({ track, currentTime, onSeek }) {
  const [lyricsData, setLyricsData] = useState({ synced: [], plain: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const lineRefs = useRef([]);
  const scrollTimeoutRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!track || !track.name) return;

    let isMounted = true;
    const fetchLyrics = async () => {
      setLoading(true);
      setError('');
      setLyricsData({ synced: [], plain: null });
      setActiveIndex(-1);

      try {
        const queryParams = new URLSearchParams({
          track: track.name,
          artist: track.artist || ''
        });
        
        const res = await fetch(`/api/spotify/lyrics?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Paroles introuvables');
        const data = await res.json();
        
        if (!isMounted) return;

        if (data.syncedLyrics) {
          setLyricsData({ synced: parseLyrics(data.syncedLyrics), plain: null });
        } else if (data.plainLyrics) {
          setLyricsData({ synced: [], plain: data.plainLyrics });
        } else {
          setError('Aucune parole disponible pour ce titre.');
        }
      } catch (err) {
        if (isMounted) setError('Aucune parole disponible.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyrics();

    return () => { isMounted = false; };
  }, [track?.id, track?.name, track?.artist]); // Re-fetch on track change

  // Determine active lyric index
  useEffect(() => {
    if (lyricsData.synced.length === 0) return;
    
    let newIndex = -1;
    for (let i = 0; i < lyricsData.synced.length; i++) {
      if (currentTime >= lyricsData.synced[i].time - 0.5) { // 0.5s anticipation 
        newIndex = i;
      } else {
        break;
      }
    }
    
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  }, [currentTime, lyricsData.synced, activeIndex]);

  // Handle user manual scroll
  const handleScroll = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    
    // Resume auto-scroll after 3 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 3000);
  };

  // Auto-scroll to active line
  useEffect(() => {
    if (!isUserScrolling && activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex, isUserScrolling]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-white/50">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Recherche des paroles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-white/40 text-center">
        <Mic2 size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-bold text-white/70 mb-2">Oups !</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="absolute inset-0 overflow-y-auto w-full flex flex-col custom-scrollbar px-4 pb-24 mask-image-top-bottom"
    >
      {lyricsData.synced.length > 0 ? (
        <div className="flex flex-col gap-6 py-24 min-h-screen transition-all duration-300">
          {lyricsData.synced.map((line, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            
            return (
              <p
                key={i}
                ref={el => lineRefs.current[i] = el}
                onClick={() => {
                  if (onSeek) {
                    onSeek(line.time);
                    setIsUserScrolling(false); // Snap back immediately after click
                  }
                }}
                className={`text-2xl md:text-3xl lg:text-4xl font-black leading-tight tracking-tight transition-all duration-500 origin-left 
                  ${isActive 
                    ? 'text-white scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                    : isPast 
                      ? 'text-white/40' 
                      : 'text-white/20'
                  } hover:text-white/80 cursor-pointer`}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      ) : lyricsData.plain ? (
        <div className="py-8 min-h-full flex flex-col items-center justify-center">
          <p className="text-white/60 whitespace-pre-wrap text-center font-medium leading-loose text-lg max-w-lg mx-auto">
            {lyricsData.plain}
          </p>
          <div className="mt-8 text-xs font-bold uppercase tracking-wider text-white/30 border border-white/10 px-3 py-1.5 rounded-full">
            Non synchronisé
          </div>
        </div>
      ) : null}
      
      {/* Dynamic inline gradient mask to fade top/bottom of the scroll container */}
      <style dangerouslySetInnerHTML={{__html: `
        .mask-image-top-bottom {
          mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
        }
      `}} />
    </div>
  );
}
