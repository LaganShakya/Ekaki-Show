"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Layers, Pencil, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [playlist, setPlaylist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const fetchPlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Failed to fetch playlist");
      const data = await res.json();
      setPlaylist(data.playlist);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", gap: "12px", alignItems: "center" }}>
        <div className="spinner"></div>
        <span style={{ color: "var(--text-secondary)" }}>Loading playlist...</span>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h3 style={{ color: "var(--error)" }}>Error: {error || "Playlist not found"}</h3>
        <Link href="/" style={{ color: "var(--accent)", marginTop: "16px", display: "inline-block" }}>Go Home</Link>
      </div>
    );
  }

  // Get all Playback IDs for the Seamless Player
  const playbackIds = playlist.videos
    .filter((v: any) => v.muxData?.status === "ready")
    .map((v: any) => v.muxData.playback_ids?.[0]?.id)
    .filter(Boolean);

  const canPlayAll = playbackIds.length > 0;

  const handlePlayAll = () => {
    if (canPlayAll) {
      router.push(`/player/${playbackIds.join(",")}`);
    }
  };

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="playlist-container animate-in">
      <Link href="/" className="playlist-back-link" style={{ marginBottom: "24px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
        <ArrowLeft size={16} />
        <span>Return to Library</span>
      </Link>

      <div className="page-header playlist-hero" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        paddingBottom: "48px",
        flexWrap: "wrap",
        gap: "32px"
      }}>
        <div className="playlist-hero-info">
          <span className="hero-badge">
            <Layers size={14} style={{ marginRight: "8px", verticalAlign: "middle" }} /> 
            Collection Segment
          </span>
          <h1 className="page-title">{playlist.title}</h1>
          <div className="playlist-meta">
            <span className="playlist-meta-item">
              {playlist.videos.length} serialized parts
            </span>
            <span className="meta-dot" />
            <span className="playlist-master-badge">
              Cinematic Master
            </span>
          </div>
        </div>
        
        <button 
          className="btn-primary" 
          style={{ 
            opacity: canPlayAll ? 1 : 0.5, 
            cursor: canPlayAll ? "pointer" : "not-allowed",
            padding: "16px 32px",
            fontSize: "16px",
            flexShrink: 0
          }}
          onClick={handlePlayAll}
          disabled={!canPlayAll}
        >
          <Play size={20} fill="currentColor" />
          PLAY SEAMLESSLY
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
        <h3 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>Segment Index</h3>
        {canPlayAll && (
          <span style={{ fontSize: "14px", color: "var(--text-dim)", fontWeight: 500 }}>
            <span style={{ color: "var(--text-secondary)", marginRight: "4px" }}>{formatDuration(playlist.videos.reduce((acc: number, v: any) => acc + (v.muxData?.duration || 0), 0))}</span> Total Runtime
          </span>
        )}
      </div>
      
      <div className="playlist-parts-list" style={{ gap: "12px" }}>
        {playlist.videos.length === 0 && (
          <div className="playlist-empty glass-premium" style={{ borderStyle: "dashed", padding: "60px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>This collection currently contains no visual segments.</p>
            <Link href="/upload" className="btn-secondary" style={{ marginTop: "24px" }}>Initiate Upload</Link>
          </div>
        )}
        
        {playlist.videos.map((video: any, i: number) => {
          const status = video.muxData?.status || "missing";
          const displayName = video.title || `Part ${i + 1}`;
          const duration = video.muxData?.duration;
          
          return (
            <div 
              key={video.id} 
              className="glow-card glass-premium playlist-part-card"
            >
              <div className="playlist-part-index" style={{ 
                color: "var(--accent-primary)", 
                opacity: 0.8,
                fontSize: "24px",
                fontWeight: 700,
                width: "40px",
                flexShrink: 0
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              
              <div className="playlist-part-info" style={{ flex: 1 }}>
                <div className="playlist-part-name-row" style={{ display: "flex", alignItems: "center" }}>
                  <h4 className="playlist-part-title" style={{ fontSize: "18px", fontWeight: 600 }}>{displayName}</h4>
                  {duration && (
                    <span style={{ 
                      fontSize: "12px", 
                      color: "var(--text-dim)", 
                      background: "rgba(255,255,255,0.03)", 
                      padding: "4px 10px", 
                      borderRadius: "20px",
                      marginLeft: "16px",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums"
                    }}>
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="status-badge" style={{ position: "static", flexShrink: 0, padding: "6px 14px", marginLeft: "auto" }}>
                <div className={`status-dot ${status}`}></div>
                <span className={`status-text ${status}`} style={{ fontSize: "12px", fontWeight: 700 }}>{status}</span>
              </div>
              
              {status === "ready" && (
                <button 
                  className="card-options-btn" 
                  style={{ marginLeft: "16px", flexShrink: 0 }}
                  onClick={() => router.push(`/player/${video.muxData.playback_ids[0].id}`)}
                >
                  <Play size={14} fill="currentColor" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
