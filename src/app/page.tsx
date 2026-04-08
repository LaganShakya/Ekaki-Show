"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Layers } from "lucide-react";

type VideoAsset = {
  id: string;
  status: "preparing" | "ready" | "errored";
  created_at: string;
  duration?: number;
  playback_ids?: { id: string; policy: string }[];
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
              const playbackIds = playlist.videos.map((v) => {
                const asset = videos.find(a => a.id === v.muxAssetId);
                return asset?.playback_ids?.[0]?.id;
              }).filter(Boolean) as string[];
              
              const thumbPlaybackId = playbackIds[0];

              // Calculate total playlist duration
              const totalDuration = playlist.videos.reduce((sum, v) => {
                const asset = videos.find(a => a.id === v.muxAssetId);
                return sum + (asset?.duration || 0);
              }, 0);

              return (
                <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                  <div className="video-card glass-panel" style={{ border: "1px solid var(--accent-glow)" }}>
                    <div style={{ position: "relative" }}>
                      {thumbPlaybackId ? (
                        <HoverProgressThumbnail playbackIds={playbackIds} title={playlist.title} totalDuration={totalDuration} />
                      ) : (
                        <div className="video-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139, 92, 246, 0.1)" }}>
                          <Layers size={40} color="var(--accent)" />
                        </div>
                      )}
                      <div className="status-badge" style={{ background: "rgba(139, 92, 246, 0.8)", border: "none" }}>
                        <span style={{ color: "white" }}>{playlist.videos.length} PARTS</span>
                      </div>
                      {totalDuration > 0 && (
                        <div className="duration-badge">{formatDuration(totalDuration)}</div>
                      )}
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

              return (
                <Link key={asset.id} href={asset.status === "ready" && playbackId ? `/player/${playbackId}` : "#"}>
                  <div className="video-card glass-panel" style={{ opacity: asset.status === "ready" ? 1 : 0.7 }}>
                    <div style={{ position: "relative" }}>
                      {playbackId ? (
                        <HoverProgressThumbnail playbackIds={[playbackId]} title={"Video Thumbnail"} totalDuration={asset.duration} />
                      ) : (
                        <div className="video-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Play size={32} color="var(--border)" />
                        </div>
                      )}
                      
                      <div className="status-badge">
                        <div className={`status-dot ${asset.status}`}></div>
                        <span className={`status-text ${asset.status}`}>{asset.status}</span>
                      </div>
                      {asset.duration && asset.status === "ready" && (
                        <div className="duration-badge">{formatDuration(asset.duration)}</div>
                      )}
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

function HoverProgressThumbnail({ playbackIds, title, totalDuration }: { playbackIds: string[], title: string, totalDuration?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);

  const thumbPlaybackId = playbackIds[0];
  
  // Mux URLs
  const staticThumb = `https://image.mux.com/${thumbPlaybackId}/thumbnail.jpg?time=1&width=600`;
  const animatedThumb = `https://image.mux.com/${thumbPlaybackId}/animated.webp?width=600`;

  useEffect(() => {
    try {
      const key = `ekaki-progress:${playbackIds.join(",")}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000) {
          if (totalDuration && totalDuration > 0) {
            // Real percentage: for multi-part we approximate using partIndex
            const partDuration = totalDuration / playbackIds.length;
            const watchedTime = (data.partIndex || 0) * partDuration + data.currentTime;
            const pct = Math.min(95, Math.max(3, (watchedTime / totalDuration) * 100));
            setProgressPercent(pct);
          } else if (data.currentTime > 10) {
            // Fallback: we know they watched at least some
            setProgressPercent(30);
          }
        }
      }
    } catch {}
  }, [playbackIds, totalDuration]);

  return (
    <div 
      className="hover-thumbnail-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={isHovered ? animatedThumb : staticThumb} 
        alt={title} 
        className="video-thumbnail" 
      />
      
      {/* Progress Bar (YouTube style) */}
      {progressPercent !== null && (
        <div className="thumbnail-progress-track">
          <div className="thumbnail-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
    </div>
  );
}
