"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Layers } from "lucide-react";

type VideoAsset = {
  id: string;
  status: "preparing" | "ready" | "errored";
  created_at: string;
  playback_ids?: { id: string; policy: string }[];
};

type Playlist = {
  id: string;
  title: string;
  createdAt: string;
  videos: { id: string; muxAssetId: string; orderIndex: number }[];
};

export default function Home() {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vidRes, playRes] = await Promise.all([
          fetch("/api/videos"),
          fetch("/api/playlists")
        ]);
        
        if (!vidRes.ok) throw new Error("Failed to fetch videos");
        if (!playRes.ok) throw new Error("Failed to fetch playlists");
        
        const vidData = await vidRes.json();
        const playData = await playRes.json();
        
        setVideos(vidData.assets || []);
        setPlaylists(playData.playlists || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter out videos that belong to a playlist
  const playlistAssetIds = new Set(playlists.flatMap(p => p.videos.map(v => v.muxAssetId)));
  const standaloneVideos = videos.filter(v => !playlistAssetIds.has(v.id));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Your Library</h1>
          <p style={{ color: "var(--text-secondary)" }}>Manage your playlists and standalone videos.</p>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", gap: "12px", alignItems: "center" }}>
          <div className="spinner"></div>
          <span style={{ color: "var(--text-secondary)" }}>Loading library...</span>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ 
          marginTop: "32px", 
          padding: "20px", 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid var(--error)",
          borderRadius: "var(--rounded-md)",
          textAlign: "center"
        }}>
          <h3 style={{ color: "var(--error)", marginBottom: "8px" }}>Failed to load Library</h3>
          <p style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      )}

      {/* PLAYLISTS SECTION */}
      {!isLoading && playlists.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Layers size={24} color="var(--accent)" />
            Playlists
          </h2>
          <div className="video-grid">
            {playlists.map((playlist) => {
              // Find a thumbnail from the first ready video in this playlist
              const firstAssetId = playlist.videos[0]?.muxAssetId;
              const matchingAsset = videos.find(v => v.id === firstAssetId);
              const thumbPlaybackId = matchingAsset?.playback_ids?.[0]?.id;
              const thumbnailUrl = thumbPlaybackId
                ? `https://image.mux.com/${thumbPlaybackId}/thumbnail.jpg?time=1&width=600`
                : "";

              return (
                <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                  <div className="video-card glass-panel" style={{ border: "1px solid var(--accent-glow)" }}>
                    <div style={{ position: "relative" }}>
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={playlist.title} className="video-thumbnail" />
                      ) : (
                        <div className="video-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139, 92, 246, 0.1)" }}>
                          <Layers size={40} color="var(--accent)" />
                        </div>
                      )}
                      <div className="status-badge" style={{ background: "rgba(139, 92, 246, 0.8)", border: "none" }}>
                        <span style={{ color: "white" }}>{playlist.videos.length} PARTS</span>
                      </div>
                    </div>
                    <div className="video-info">
                      <div className="video-title" style={{ fontSize: "18px", fontWeight: 600 }}>{playlist.title}</div>
                      <div className="video-meta">
                        Created {new Date(playlist.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* STANDALONE VIDEOS SECTION */}
      {!isLoading && standaloneVideos.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Play size={24} color="var(--text-secondary)" />
            Standalone Videos
          </h2>
          <div className="video-grid">
            {standaloneVideos.map((asset) => {
              const playbackId = asset.playback_ids?.[0]?.id;
              const posterUrl = playbackId 
                ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1&width=600` 
                : "";

              return (
                <Link key={asset.id} href={asset.status === "ready" && playbackId ? `/player/${playbackId}` : "#"}>
                  <div className="video-card glass-panel" style={{ opacity: asset.status === "ready" ? 1 : 0.7 }}>
                    <div style={{ position: "relative" }}>
                      {posterUrl ? (
                        <img src={posterUrl} alt="Video Thumbnail" className="video-thumbnail" />
                      ) : (
                        <div className="video-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Play size={32} color="var(--border)" />
                        </div>
                      )}
                      
                      <div className="status-badge">
                        <div className={`status-dot ${asset.status}`}></div>
                        <span className={`status-text ${asset.status}`}>{asset.status}</span>
                      </div>
                    </div>
                    
                    <div className="video-info">
                      <div className="video-title">Video — {new Date(Number(asset.created_at) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="video-meta">
                        {asset.status === "ready" ? "Ready to play" : asset.status}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && !error && standaloneVideos.length === 0 && playlists.length === 0 && (
        <div className="glass-panel" style={{ textAlign: "center", padding: "80px 20px", marginTop: "32px" }}>
          <Play size={48} color="var(--border)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ marginBottom: "12px" }}>No videos yet</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Upload your first video to start building your library.
          </p>
          <Link href="/upload" className="btn-primary">
            Upload Now
          </Link>
        </div>
      )}
    </>
  );
}
