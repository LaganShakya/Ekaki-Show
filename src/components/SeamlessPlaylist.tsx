"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";

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

export interface SeamlessPlaylistRef {
  goToPart: (index: number) => void;
}

const SeamlessPlaylist = forwardRef<SeamlessPlaylistRef, { ids: string[]; onPartChange?: (index: number) => void }>(({ ids, onPartChange }, ref) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [resumeTime, setResumeTime] = useState<number | null>(null);
  const [hasResumed, setHasResumed] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showOverlayControls, setShowOverlayControls] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingPlayerRef = useRef<any>(null);
  const pongPlayerRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    goToPart: (index: number) => {
      if (index >= 0 && index < ids.length) {
        setResumeTime(null);
        setHasResumed(true);
        setActiveIndex(index);
      }
    }
  }));

  // Ambilight render loop
  useEffect(() => {
    const renderAmbilight = () => {
      const videoEl = playerRef.current?.media?.nativeEl;
      const canvas = canvasRef.current;
      if (videoEl && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && videoEl.readyState >= 2 && !videoEl.paused) {
          // Drawing at low res saves crazy processing power but gives same blurred glow
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        }
      }
      animationRef.current = requestAnimationFrame(renderAmbilight);
    };

    animationRef.current = requestAnimationFrame(renderAmbilight);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

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

  // Sync the master playerRef and manage play/pause state on index change
  useEffect(() => {
    const isPingActive = activeIndex % 2 === 0;
    
    if (isPingActive) {
      playerRef.current = pingPlayerRef.current;
      // Ensure the other player is paused when we switch
      if (pongPlayerRef.current) pongPlayerRef.current.pause();
      // Force play and reset time for a fresh start on the new part (if not resuming)
      if (pingPlayerRef.current) {
        if (resumeTime === null) pingPlayerRef.current.currentTime = 0;
        pingPlayerRef.current.play();
      }
    } else {
      playerRef.current = pongPlayerRef.current;
      // Ensure the other player is paused when we switch
      if (pingPlayerRef.current) pingPlayerRef.current.pause();
      // Force play and reset time for a fresh start on the new part (if not resuming)
      if (pongPlayerRef.current) {
        if (resumeTime === null) pongPlayerRef.current.currentTime = 0;
        pongPlayerRef.current.play();
      }
    }

    onPartChange?.(activeIndex);
  }, [activeIndex, onPartChange]);

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

  // Show/Hide Controls logic
  const triggerControls = useCallback(() => {
    setShowOverlayControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowOverlayControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Control Actions
  const seekBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    const player = playerRef.current;
    if (player && typeof player.currentTime === "number") {
      player.currentTime = Math.max(0, player.currentTime - 10);
    }
    triggerControls();
  };

  const seekForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    const player = playerRef.current;
    if (player && typeof player.currentTime === "number") {
      player.currentTime = Math.min(player.duration || Infinity, player.currentTime + 10);
    }
    triggerControls();
  };

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
      <div 
        style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "12px", overflow: "visible" }}
        onMouseMove={triggerControls}
        onClick={triggerControls}
        onTouchStart={triggerControls}
      >
        {/* Ambilight Canvas */}
        <canvas 
          ref={canvasRef}
          width={64} height={36}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            filter: "blur(60px) saturate(200%) opacity(0.6)",
            transform: "scale(1.1) translateY(10%)", zIndex: -1, pointerEvents: "none"
          }}
        />
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
        <PlayerControlsOverlay 
          visible={showOverlayControls}
          onBack={seekBackward}
          onForward={seekForward}
        />
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
    <div 
      style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "12px", overflow: "visible" }}
      onMouseMove={triggerControls}
      onClick={triggerControls}
      onTouchStart={triggerControls}
    >
      {/* Ambilight Canvas */}
      <canvas 
        ref={canvasRef}
        width={64} height={36}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          filter: "blur(60px) saturate(200%) opacity(0.6)",
          transform: "scale(1.1) translateY(10%)", zIndex: -1, pointerEvents: "none"
        }}
      />
      
      {/* PING PLAYER */}
      {pingId && (
        <MuxPlayer
          ref={pingPlayerRef}
          playbackId={pingId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={activeIndex % 2 === 0}
          onLoadedData={activeIndex % 2 === 0 ? handleLoadedData : undefined}
          onEnded={activeIndex % 2 === 0 ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: activeIndex % 2 === 0 ? 1 : 0,
            pointerEvents: activeIndex % 2 === 0 ? "auto" : "none",
            zIndex: activeIndex % 2 === 0 ? 10 : 1,
          }}
        />
      )}

      {/* PONG PLAYER */}
      {pongId && (
        <MuxPlayer
          ref={pongPlayerRef}
          playbackId={pongId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={activeIndex % 2 !== 0}
          onLoadedData={activeIndex % 2 !== 0 ? handleLoadedData : undefined}
          onEnded={activeIndex % 2 !== 0 ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: activeIndex % 2 !== 0 ? 1 : 0,
            pointerEvents: activeIndex % 2 !== 0 ? "auto" : "none",
            zIndex: activeIndex % 2 !== 0 ? 10 : 1,
          }}
        />
      )}

      <PlayerControlsOverlay 
        visible={showOverlayControls}
        onBack={seekBackward}
        onForward={seekForward}
      />
      
      {/* Part indicator overlay */}
      <div className="player-part-badge">
        Part {activeIndex + 1} of {ids.length}
      </div>

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
});

export default SeamlessPlaylist;

function PlayerControlsOverlay({ 
  visible, 
  onBack, 
  onForward 
}: { 
  visible: boolean; 
  onBack: (e: React.MouseEvent) => void;
  onForward: (e: React.MouseEvent) => void;
}) {
  return (
    <div className={`player-controls-overlay ${visible ? 'visible' : ''}`}>
      <div className="player-controls-center">
        <button className="player-control-btn side" onClick={onBack}>
          <RotateCcw size={28} />
          <span className="control-label">10</span>
        </button>
        
        <div className="player-controls-spacer" />
        
        <button className="player-control-btn side" onClick={onForward}>
          <RotateCw size={28} />
          <span className="control-label">10</span>
        </button>
      </div>
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
