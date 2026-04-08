"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MuxPlayer from "@mux/mux-player-react";

type ProgressData = {
  partIndex: number;
  currentTime: number;
  updatedAt: number;
};

function getStorageKey(ids: string[]): string {
  return `ekaki-progress:${ids.join(",")}`;
}

function loadProgress(ids: string[]): ProgressData | null {
  try {
    const raw = localStorage.getItem(getStorageKey(ids));
    if (!raw) return null;
    const data = JSON.parse(raw) as ProgressData;
    // Ignore progress older than 30 days
    if (Date.now() - data.updatedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

function saveProgress(ids: string[], partIndex: number, currentTime: number) {
  try {
    const data: ProgressData = { partIndex, currentTime, updatedAt: Date.now() };
    localStorage.setItem(getStorageKey(ids), JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

function clearProgress(ids: string[]) {
  try {
    localStorage.removeItem(getStorageKey(ids));
  } catch {}
}

export default function SeamlessPlaylist({ ids }: { ids: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [hasResumed, setHasResumed] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const playerRef = useRef<any>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    const saved = loadProgress(ids);
    if (saved && saved.currentTime > 5) {
      setActiveIndex(saved.partIndex);
      setResumeTime(saved.currentTime);
      setShowResumeBanner(true);
    }
  }, []);

  // Save progress periodically
  const saveCurrentProgress = useCallback(() => {
    const player = playerRef.current;
    if (player) {
      const time = player.currentTime;
      if (time && time > 0) {
        saveProgress(ids, activeIndex, time);
      }
    }
  }, [ids, activeIndex]);

  useEffect(() => {
    // Save every 3 seconds while playing
    saveIntervalRef.current = setInterval(saveCurrentProgress, 3000);

    // Also save on page unload
    const handleUnload = () => saveCurrentProgress();
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      saveCurrentProgress();
    };
  }, [saveCurrentProgress]);

  // Handle seeking to resume time once player is ready
  const handleLoadedData = useCallback(() => {
    if (resumeTime !== null && !hasResumed) {
      const player = playerRef.current;
      if (player) {
        player.currentTime = resumeTime;
        setHasResumed(true);
        // Auto-hide banner after 5 seconds
        setTimeout(() => setShowResumeBanner(false), 5000);
      }
    }
  }, [resumeTime, hasResumed]);

  const dismissResume = () => {
    setShowResumeBanner(false);
  };

  const restartFromBeginning = () => {
    clearProgress(ids);
    setActiveIndex(0);
    setResumeTime(null);
    setHasResumed(true);
    setShowResumeBanner(false);
    const player = playerRef.current;
    if (player) {
      player.currentTime = 0;
    }
  };

  if (!ids || ids.length === 0) return null;

  if (ids.length === 1) {
    return (
      <div style={{ position: "relative" }}>
        <MuxPlayer
          ref={playerRef}
          playbackId={ids[0]}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay
          onLoadedData={handleLoadedData}
          onEnded={() => clearProgress(ids)}
          style={{ width: "100%", aspectRatio: "16/9", display: "block" }}
        />
        {showResumeBanner && (
          <ResumeBanner 
            time={resumeTime!} 
            onDismiss={dismissResume} 
            onRestart={restartFromBeginning} 
          />
        )}
      </div>
    );
  }

  // Ping-pong technique for multi-part playlists
  const isPingActive = activeIndex % 2 === 0;
  const pingId = isPingActive ? ids[activeIndex] : ids[activeIndex + 1];
  const pongId = !isPingActive ? ids[activeIndex] : ids[activeIndex + 1];

  const handleEnded = () => {
    if (activeIndex < ids.length - 1) {
      setResumeTime(null);
      setHasResumed(true);
      setActiveIndex((prev) => prev + 1);
    } else {
      // Playlist finished — clear saved progress
      clearProgress(ids);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "12px", overflow: "hidden" }}>
      {/* PING PLAYER */}
      {pingId && (
        <MuxPlayer
          ref={isPingActive ? playerRef : undefined}
          playbackId={pingId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={isPingActive}
          onLoadedData={isPingActive ? handleLoadedData : undefined}
          onEnded={isPingActive ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: isPingActive ? 1 : 0,
            pointerEvents: isPingActive ? "auto" : "none",
            zIndex: isPingActive ? 10 : 1,
          }}
        />
      )}

      {/* PONG PLAYER */}
      {pongId && (
        <MuxPlayer
          ref={!isPingActive ? playerRef : undefined}
          playbackId={pongId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={!isPingActive}
          onLoadedData={!isPingActive ? handleLoadedData : undefined}
          onEnded={!isPingActive ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: !isPingActive ? 1 : 0,
            pointerEvents: !isPingActive ? "auto" : "none",
            zIndex: !isPingActive ? 10 : 1,
          }}
        />
      )}
      
      {/* Part indicator overlay */}
      <div style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "rgba(0,0,0,0.6)",
          padding: "6px 12px",
          borderRadius: "20px",
          color: "white",
          fontSize: "12px",
          fontWeight: 600,
          zIndex: 20,
          pointerEvents: "none",
          backdropFilter: "blur(4px)"
      }}>
        Part {activeIndex + 1} of {ids.length}
      </div>

      {/* Resume banner */}
      {showResumeBanner && (
        <ResumeBanner 
          time={resumeTime!} 
          partIndex={activeIndex}
          totalParts={ids.length}
          onDismiss={dismissResume} 
          onRestart={restartFromBeginning} 
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ResumeBanner({ 
  time, 
  partIndex, 
  totalParts, 
  onDismiss, 
  onRestart 
}: { 
  time: number; 
  partIndex?: number; 
  totalParts?: number; 
  onDismiss: () => void; 
  onRestart: () => void; 
}) {
  return (
    <div className="resume-banner">
      <div className="resume-banner-text">
        <span className="resume-banner-icon">▶</span>
        <span>
          Resumed at {formatTime(time)}
          {partIndex !== undefined && totalParts && totalParts > 1 && (
            <span style={{ opacity: 0.7 }}> · Part {partIndex + 1}</span>
          )}
        </span>
      </div>
      <div className="resume-banner-actions">
        <button className="resume-banner-btn restart" onClick={onRestart}>
          Start Over
        </button>
        <button className="resume-banner-btn dismiss" onClick={onDismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}
