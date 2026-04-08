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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  
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
    const interval = setInterval(fetchPlaylist, 5000);
    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (video: any) => {
    const displayName = video.title || `Part ${video.orderIndex + 1}`;
    setEditingId(video.id);
    setEditValue(displayName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveTitle = async (videoId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playlists/rename-video", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPartId: videoId, title: editValue })
      });
      if (!res.ok) throw new Error("Failed to rename");
      // Update local state immediately
      setPlaylist((prev: any) => ({
        ...prev,
        videos: prev.videos.map((v: any) =>
          v.id === videoId ? { ...v, title: editValue.trim() } : v
        )
      }));
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, videoId: string) => {
    if (e.key === "Enter") saveTitle(videoId);
    if (e.key === "Escape") cancelEditing();
  };

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
          PLAY ALL <span className="responsive-hidden-text" style={{ marginLeft: "4px" }}>SEAMLESSLY</span>
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
          const isEditing = editingId === video.id;
          const displayName = video.title || `Part ${i + 1}`;
          
          return (
            <div key={video.id} className="glass-panel playlist-part-card">
              <div className="playlist-part-index">
                {i + 1}
              </div>
              
              <div className="playlist-part-info">
                {isEditing ? (
                  <div className="playlist-part-edit-row">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, video.id)}
                      className="playlist-part-edit-input"
                      disabled={saving}
                    />
                    <button 
                      className="playlist-part-edit-btn save"
                      onClick={() => saveTitle(video.id)} 
                      disabled={saving}
                      title="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      className="playlist-part-edit-btn cancel"
                      onClick={cancelEditing}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="playlist-part-name-row">
                    <h4 className="playlist-part-title">{displayName}</h4>
                    <button 
                      className="playlist-part-rename-btn"
                      onClick={() => startEditing(video)}
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
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
