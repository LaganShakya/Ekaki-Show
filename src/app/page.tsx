"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Layers, MoreVertical, ListMusic, PlayCircle, UploadCloud } from "lucide-react";

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

  const [vidError, setVidError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const vidRes = await fetch("/api/videos");
        if (!vidRes.ok) throw new Error("Failed to fetch videos");
        const vidData = await vidRes.json();
        setVideos(vidData.assets || []);
      } catch (err: any) {
        setVidError(err.message);
      }
    };

    const fetchPlaylists = async () => {
      try {
        const playRes = await fetch("/api/playlists");
        if (!playRes.ok) throw new Error("Failed to fetch playlists");
        const playData = await playRes.json();
        setPlaylists(playData.playlists || []);
      } catch (err: any) {
        setPlayError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
    fetchPlaylists();
  }, []);

  // Filter out videos that belong to a playlist
  const playlistAssetIds = new Set(playlists.flatMap(p => p.videos.map(v => v.muxAssetId)));
  const standaloneVideos = videos.filter(v => !playlistAssetIds.has(v.id));

  return (
    <div className="animate-in">
      <div className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">{playlists.length > 0 ? "Featured Collection" : "Premium Experience"}</span>
          {playlists.length > 0 ? (
            <>
              <h1 className="hero-title">
                Watch <span className="aurora-text">{playlists[0].title}</span>
              </h1>
              <p className="hero-description">
                Dive back into your latest cinematic experience. Seamlessly transition between segments with our high-fidelity player.
              </p>
              <div className="hero-actions">
                <Link href={`/playlist/${playlists[0].id}`} className="btn-primary">
                  <PlayCircle size={20} />
                  Watch Latest
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="hero-title">Your Cinematic <br /><span className="aurora-text">Video Library</span></h1>
              <p className="hero-description">
                Experience high-performance, seamless video playback powered by Mux. 
                Manage your playlists and standalone assets with an elegant, modern interface.
              </p>
              <div className="hero-actions">
                <Link href="/upload" className="btn-primary">
                  <UploadCloud size={20} />
                  Start Uploading
                </Link>
              </div>
            </>
          )}
        </div>
        <div className="hero-visual">
          {playlists.length > 0 && playlists[0].videos.length > 0 ? (
            <div className="hero-featured-visual glow-card">
              {(() => {
                const firstVideo = playlists[0].videos[0];
                const matchingAsset = videos.find(v => v.id === firstVideo.muxAssetId);
                const playbackId = matchingAsset?.playback_ids?.[0]?.id;
                
                const thumbUrl = playbackId 
                  ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1000&time=1`
                  : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&q=80";

                return (
                  <img 
                    src={thumbUrl} 
                    alt="Featured Playlist" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--rounded-lg)' }}
                  />
                );
              })()}
              <div className="hero-visual-overlay" />
            </div>
          ) : (
            <div className="aurora-sphere"></div>
          )}
        </div>
      </div>

      <div className="page-header library-header">
        <div>
          <h2 className="section-title">Library Overview</h2>
          <p className="section-subtitle">Playlists and Standalone Videos.</p>
        </div>
      </div>

      {isLoading && videos.length === 0 && (
        <div style={{ display: "flex", justifyContent: "center", padding: "100px 0", gap: "12px", alignItems: "center" }}>
          <div className="spinner"></div>
          <span style={{ color: "var(--text-secondary)" }}>Loading library...</span>
        </div>
      )}

      {playError && (
        <div style={{ 
          marginTop: "24px", 
          padding: "16px", 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid var(--error)",
          borderRadius: "var(--rounded-md)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <h4 style={{ color: "var(--error)", margin: 0 }}>⚠️ Database Connection Issue</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
            We couldn't connect to the database to fetch your playlists. Standalone videos from Mux are still visible below.
            <br />
            <span style={{ fontSize: "12px", opacity: 0.7 }}>Error: P1001 (Connection Timeout) - Check if your Supabase project is paused.</span>
          </p>
        </div>
      )}

      {vidError && (
        <div style={{ 
          marginTop: "24px", 
          padding: "16px", 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid var(--error)",
          borderRadius: "var(--rounded-md)"
        }}>
          <h4 style={{ color: "var(--error)", margin: 0 }}>⚠️ Video Provider Error</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Failed to fetch videos from Mux. {vidError}</p>
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
            {playlists.map((playlist) => (
              <PlaylistCard 
                key={playlist.id} 
                playlist={playlist} 
                videos={videos} 
              />
            ))}
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
            {standaloneVideos.map((asset, i) => {
              const playbackId = asset.playback_ids?.[0]?.id;

              // Check if user has watch progress
              const progressKey = `homies-progress:${playbackId}`;
              let hasProgress = false;
              try {
                const raw = typeof window !== "undefined" ? localStorage.getItem(progressKey) : null;
                if (raw) {
                  const data = JSON.parse(raw);
                  if (Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000) {
                    hasProgress = true;
                  }
                }
              } catch {}

              const href = asset.status === "ready" && playbackId ? `/player/${playbackId}` : "#";

              return (
                <Link key={asset.id} href={href} className="animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="video-card glow-card" style={{ opacity: asset.status === "ready" ? 1 : 0.7 }}>
                    <div style={{ position: "relative" }}>
                      {playbackId ? (
                        <HoverProgressThumbnail 
                          playbackIds={[playbackId]} 
                          title={"Video Thumbnail"} 
                          totalDuration={asset.duration} 
                          partDurations={asset.duration ? [asset.duration] : []}
                        />
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
                      <div className="video-title">{new Date(Number(asset.created_at) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="video-meta">
                        {hasProgress ? "Continue watching" : (asset.status === "ready" ? "Ready to play" : asset.status)}
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
    </div>
  );
}

function HoverProgressThumbnail({ 
  playbackIds, 
  title, 
  totalDuration, 
  partDurations 
}: { 
  playbackIds: string[], 
  title: string, 
  totalDuration?: number,
  partDurations?: number[]
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [savedProgress, setSavedProgress] = useState<{ partIndex: number; currentTime: number; totalWatchedTime: number } | null>(null);

  const thumbPlaybackId = playbackIds[0];

  useEffect(() => {
    try {
      const key = `homies-progress:${playbackIds.join(",")}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000) {
          const partIndex = data.partIndex || 0;
          const currentTime = data.currentTime || 0;
          
          // Calculate total watched time across all previous parts
          let totalWatched = currentTime;
          if (partDurations && partDurations.length > 0) {
            totalWatched = partDurations.slice(0, partIndex).reduce((sum, d) => sum + d, 0) + currentTime;
          }

          setSavedProgress({ partIndex, currentTime, totalWatchedTime: totalWatched });

          if (totalDuration && totalDuration > 0) {
            const pct = Math.min(95, Math.max(3, (totalWatched / totalDuration) * 100));
            setProgressPercent(pct);
          } else if (currentTime > 10) {
            setProgressPercent(30);
          }
        }
      }
    } catch {}
  }, [playbackIds, totalDuration]);

  // Pick the right playbackId and time for the hover preview
  const previewPartId = savedProgress 
    ? (playbackIds[savedProgress.partIndex] || thumbPlaybackId)
    : thumbPlaybackId;
  const previewStartTime = savedProgress ? Math.max(0, Math.floor(savedProgress.currentTime)) : 1;
  
  // Mux URLs
  const staticThumb = savedProgress
    ? `https://image.mux.com/${previewPartId}/thumbnail.jpg?time=${previewStartTime}&width=600`
    : `https://image.mux.com/${thumbPlaybackId}/thumbnail.jpg?time=1&width=600`;
  const animatedThumb = `https://image.mux.com/${previewPartId}/animated.webp?start=${previewStartTime}&width=600`;

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
      
      {/* Cinematic Resume Badge Overlay */}
      {savedProgress && (
        <div className={`thumbnail-continue-badge ${isHovered ? 'hovered' : ''}`}>
          <div className="continue-badge-icon">
            <Play size={10} fill="currentColor" />
          </div>
          <span>Resume · {formatDuration(savedProgress.totalWatchedTime)}</span>
        </div>
      )}

      {/* Progress Bar (YouTube style) */}
      {progressPercent !== null && (
        <div className="thumbnail-progress-track">
          <div className="thumbnail-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
    </div>
  );
}

function PlaylistCard({ playlist, videos }: { playlist: Playlist, videos: VideoAsset[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Find a thumbnail from the first ready video in this playlist
  const firstAssetId = playlist.videos[0]?.muxAssetId;
  const matchingAsset = videos.find(v => v.id === firstAssetId);
  const playbackIds = playlist.videos.map((v) => {
    const asset = videos.find(a => a.id === v.muxAssetId);
    return asset?.playback_ids?.[0]?.id;
  }).filter(Boolean) as string[];
  
  const thumbPlaybackId = playbackIds[0];

  // Calculate individual durations for each part
  const partDurations = playlist.videos.map(v => {
    const asset = videos.find(a => a.id === v.muxAssetId);
    return asset?.duration || 0;
  });

  // Calculate total playlist duration
  const totalDuration = partDurations.reduce((sum, d) => sum + d, 0);

  // Check if user has watch progress
  const progressKey = `homies-progress:${playbackIds.join(",")}`;
  let hasProgress = false;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(progressKey) : null;
    if (raw) {
      const data = JSON.parse(raw);
      if (Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000) {
        hasProgress = true;
      }
    }
  } catch {}

  const mainHref = hasProgress && playbackIds.length > 0
    ? `/player/${playbackIds.join(",")}`
    : `/playlist/${playlist.id}`;

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const goToParts = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/playlist/${playlist.id}`);
  };

  const playFromStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Logic to clear progress for this specific playlist
    localStorage.removeItem(progressKey);
    router.push(`/player/${playbackIds.join(",")}`);
  };

  return (
    <div className="video-card-container animate-in" style={{ position: "relative" }}>
      <Link href={mainHref}>
        <div className="video-card glow-card" style={{ border: "1px solid var(--border-bold)" }}>
          <div style={{ position: "relative" }}>
            {thumbPlaybackId ? (
              <HoverProgressThumbnail 
                playbackIds={playbackIds} 
                title={playlist.title} 
                totalDuration={totalDuration} 
                partDurations={partDurations}
              />
            ) : (
              <div className="video-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(192, 132, 252, 0.05)" }}>
                <Layers size={40} color="var(--accent-primary)" />
              </div>
            )}
          </div>
          <div className="video-info">
            <div className="video-title">{playlist.title}</div>
            <div className="video-meta">
              {`Collection · ${playlist.videos.length} parts`}
            </div>
          </div>
        </div>
      </Link>

      {/* Options Menu Button */}
      <div ref={menuRef} className="card-options-wrapper">
        <button 
          className={`card-options-btn ${menuOpen ? "active" : ""}`} 
          onClick={toggleMenu}
          aria-label="Options"
        >
          <MoreVertical size={20} />
        </button>

        {menuOpen && (
          <div className="card-options-dropdown glass-panel">
            <button className="card-option-item" onClick={goToParts}>
              <ListMusic size={16} />
              <span>See parts / Manage</span>
            </button>
            {hasProgress && (
              <button className="card-option-item" onClick={playFromStart}>
                <PlayCircle size={16} />
                <span>Start from beginning</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
