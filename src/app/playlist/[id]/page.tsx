"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [playlist, setPlaylist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
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
    
    fetchPlaylist();
    const interval = setInterval(fetchPlaylist, 5000);
    return () => clearInterval(interval);
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

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px 0" }}>
      <Link 
        href="/" 
        style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          marginBottom: "24px",
          color: "var(--text-secondary)",
          fontSize: "14px",
          fontWeight: 500
        }}
      >
        <ArrowLeft size={16} />
        Back to Library
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", borderBottom: "1px solid var(--border)", paddingBottom: "32px" }}>
        <div>
          <span style={{ fontSize: "14px", color: "var(--accent)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Layers size={16} /> Playlist
          </span>
          <h1 style={{ fontSize: "40px", marginBottom: "8px" }}>{playlist.title}</h1>
          <p style={{ color: "var(--text-secondary)" }}>{playlist.videos.length} parts</p>
        </div>
        
        <button 
          className="btn-primary" 
          style={{ padding: "14px 32px", fontSize: "16px", opacity: canPlayAll ? 1 : 0.5, cursor: canPlayAll ? "pointer" : "not-allowed" }}
          onClick={handlePlayAll}
          disabled={!canPlayAll}
        >
          <Play size={20} />
          PLAY ALL SEAMLESSLY
        </button>
      </div>

      <h3 style={{ marginBottom: "16px", fontSize: "20px" }}>Parts</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {playlist.videos.length === 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "40px", textAlign: "center", borderRadius: "12px", border: "1px dashed var(--border)" }}>
            <p style={{ color: "var(--text-secondary)" }}>No parts uploaded to this playlist yet.</p>
            <Link href="/upload" className="btn-secondary" style={{ marginTop: "16px" }}>Upload a Part</Link>
          </div>
        )}
        
        {playlist.videos.map((video: any, i: number) => {
          const status = video.muxData?.status || "missing";
          return (
            <div key={video.id} className="glass-panel" style={{ display: "flex", alignItems: "center", padding: "16px 24px", gap: "24px" }}>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--border)" }}>
                {i + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: "16px", marginBottom: "4px" }}>Part {i + 1}</h4>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                  Asset: {video.muxAssetId}
                </div>
              </div>
              
              <div className="status-badge" style={{ position: "static" }}>
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
