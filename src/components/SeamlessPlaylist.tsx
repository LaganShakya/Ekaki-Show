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

export default function SeamlessPlaylist({ ids, onPartChange }: { ids: string[]; onPartChange?: (index: number) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [hasResumed, setHasResumed] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const playerRef = useRef<any>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    const saved = loadProgress(ids);
    if (saved && saved.currentTime > 5) {
      setActiveIndex(saved.partIndex);
      setResumeTime(saved.currentTime);
      setShowResumeBanner(true);
      onPartChange?.(saved.partIndex);
    }
  }, []);

  // Notify parent of part changes
  useEffect(() => {
    onPartChange?.(activeIndex);
  }, [activeIndex]);

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

  // Auto-rotate to landscape on fullscreen (mobile)
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const screen = window.screen as any;
      const orientation = screen?.orientation;
      if (!orientation?.lock) return;

      try {
        if (document.fullscreenElement) {
          await orientation.lock("landscape");
        } else {
          orientation.unlock();
        }
      } catch {
        // Orientation lock not supported or failed silently
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const player = playerRef.current;
      if (!player) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          if (player.paused) player.play();
          else player.pause();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          if (typeof player.currentTime === "number") {
             player.currentTime = Math.max(0, player.currentTime - 10);
          }
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          if (typeof player.currentTime === "number") {
             player.currentTime = Math.min(player.duration || Infinity, player.currentTime + 10);
          }
          break;
        case "f":
          e.preventDefault();
          if (!document.fullscreenElement) {
             const container = document.querySelector(".playlist-container > .glass-panel");
             if (container) {
               container.requestFullscreen?.().catch(() => {
                 playerRef.current?.requestFullscreen?.();
               });
             } else {
               playerRef.current?.requestFullscreen?.();
             }
          } else {
             document.exitFullscreen?.();
          }
          break;
        case "m":
          e.preventDefault();
          player.muted = !player.muted;
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case "escape":
          setShowShortcuts(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <DoubleTapOverlay playerRef={playerRef} />
        <KeyboardShortcutHelp show={showShortcuts} onClose={() => setShowShortcuts(false)} />
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

      <DoubleTapOverlay playerRef={playerRef} />
      <KeyboardShortcutHelp show={showShortcuts} onClose={() => setShowShortcuts(false)} />

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

function DoubleTapOverlay({ playerRef }: { playerRef: React.RefObject<any> }) {
  const [feedback, setFeedback] = useState<{ side: "left" | "right"; key: number } | null>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" }>({ time: 0, side: "left" });
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTap = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.changedTouches[0].clientX - rect.left;
    const side: "left" | "right" = touchX < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (now - lastTapRef.current.time < 350 && lastTapRef.current.side === side) {
      // Double tap detected!
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

      const player = playerRef.current;
      if (player && typeof player.currentTime === "number") {
        if (side === "left") {
          player.currentTime = Math.max(0, player.currentTime - 10);
        } else {
          player.currentTime = Math.min(player.duration || Infinity, player.currentTime + 10);
        }
      }

      setFeedback({ side, key: now });
      setTimeout(() => setFeedback(null), 700);
      lastTapRef.current = { time: 0, side };
    } else {
      lastTapRef.current = { time: now, side };
      // Let single taps pass through after a short delay
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = { time: 0, side: "left" };
      }, 350);
    }
  }, [playerRef]);

  if (!isTouchDevice) return null;

  return (
    <div 
      className="doubletap-overlay"
      onTouchEnd={handleTap}
    >
      {/* Left side zone */}
      <div className="doubletap-zone left">
        {feedback?.side === "left" && (
          <div key={feedback.key} className="doubletap-ripple">
            <div className="doubletap-ripple-circle" />
            <div className="doubletap-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
              <span>10s</span>
            </div>
          </div>
        )}
      </div>
      {/* Right side zone */}
      <div className="doubletap-zone right">
        {feedback?.side === "right" && (
          <div key={feedback.key} className="doubletap-ripple">
            <div className="doubletap-ripple-circle" />
            <div className="doubletap-label">
              <span>10s</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeyboardShortcutHelp({ show, onClose }: { show: boolean, onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="shortcuts-grid">
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>Space</kbd> or <kbd>K</kbd></span>
            <span className="shortcut-desc">Play / Pause</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>←</kbd> or <kbd>J</kbd></span>
            <span className="shortcut-desc">Skip backward 10s</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>→</kbd> or <kbd>L</kbd></span>
            <span className="shortcut-desc">Skip forward 10s</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>F</kbd></span>
            <span className="shortcut-desc">Toggle Fullscreen</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>M</kbd></span>
            <span className="shortcut-desc">Mute / Unmute</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-keys"><kbd>?</kbd></span>
            <span className="shortcut-desc">Show Shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
