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
    <div className="playlist-container">
      <Link href="/" className="playlist-back-link">
        <ArrowLeft size={16} />
        Back to Library
      </Link>

      <div className="page-header playlist-hero">
        <div>
          <span className="playlist-label">
            <Layers size={16} /> Playlist
          </span>
          <h1 className="page-title">{playlist.title}</h1>
          <p style={{ color: "var(--text-secondary)" }}>{playlist.videos.length} part{playlist.videos.length !== 1 ? "s" : ""}</p>
        </div>
        
        <button 
          className="btn-primary" 
          style={{ opacity: canPlayAll ? 1 : 0.5, cursor: canPlayAll ? "pointer" : "not-allowed" }}
          onClick={handlePlayAll}
          disabled={!canPlayAll}
        >
          <Play size={20} />
          PLAY SEAMLESSLY
        </button>
      </div>

      <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Parts</h3>
      
      <div className="playlist-parts-list">
        {playlist.videos.length === 0 && (
          <div className="playlist-empty">
            <p style={{ color: "var(--text-secondary)" }}>No parts uploaded to this playlist yet.</p>
            <Link href="/upload" className="btn-secondary" style={{ marginTop: "16px" }}>Upload a Part</Link>
          </div>
        )}
        
        {playlist.videos.map((video: any, i: number) => {
          const status = video.muxData?.status || "missing";
          const displayName = video.title || `Part ${i + 1}`;
          const duration = video.muxData?.duration;
          
          return (
            <div key={video.id} className="glass-panel playlist-part-card">
              <div className="playlist-part-index">
                {i + 1}
              </div>
              
              <div className="playlist-part-info">
                <div className="playlist-part-name-row">
                  <h4 className="playlist-part-title">{displayName}</h4>
                  {duration && (
                    <span style={{ 
                      fontSize: "13px", 
                      color: "var(--text-secondary)", 
                      background: "rgba(255,255,255,0.05)", 
                      padding: "2px 8px", 
                      borderRadius: "4px",
                      marginLeft: "12px"
                    }}>
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="status-badge" style={{ position: "static", flexShrink: 0 }}>
                <div className={`status-dot ${status}`}></div>
                <span className={`status-text ${status}`}>{status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
