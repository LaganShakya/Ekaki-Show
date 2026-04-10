"use client";

import Link from "next/link";
import { ArrowLeft, Layers, Share2, ListMusic, ChevronDown, ChevronUp, Play } from "lucide-react";
import SeamlessPlaylist, { SeamlessPlaylistRef } from "@/components/SeamlessPlaylist";
import { use, useEffect, useState, useCallback, useRef } from "react";

type VideoInfo = {
  playbackId: string;
  title: string | null;
  playlistTitle: string | null;
  orderIndex: number | null;
};

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const rawId = decodeURIComponent(resolvedParams.id);
  const playbackIds = rawId.split(",").map(id => id.trim()).filter(Boolean);
  
  const [videoInfo, setVideoInfo] = useState<VideoInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePartIndex, setActivePartIndex] = useState(0);
  const [showParts, setShowParts] = useState(false);
  const [copied, setCopied] = useState(false);
  const playlistRef = useRef<SeamlessPlaylistRef>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/video-info?playbackIds=${playbackIds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setVideoInfo(data.videos || []);
        }
      } catch {}
       finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, [rawId]);

  const handlePartChange = useCallback((index: number) => {
    setActivePartIndex(index);
  }, []);

  const isPlaylist = playbackIds.length > 1;
  const playlistTitle = videoInfo.find(v => v.playlistTitle)?.playlistTitle;
  const singleTitle = videoInfo[0]?.title;
  const displayTitle = isPlaylist
    ? (playlistTitle || "Seamless Playlist")
    : (singleTitle || "Now Playing");

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const getPartName = (index: number) => {
    const info = videoInfo[index];
    return info?.title || `Part ${index + 1}`;
  };

  return (
    <div className="player-page animate-in">
      <div className="player-ambient-glow" />

      <div className="player-top-bar">
        <Link href="/" className="player-back-btn">
          <ArrowLeft size={20} />
          <span className="responsive-hidden-text">Back to Library</span>
        </Link>
        
          <div className="player-top-actions">
            <button className="player-action-btn" onClick={handleShare} title="Share Content" aria-label="Share this video or playlist">
              <Share2 size={18} />
              <span>{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </div>

      <div className="player-main-layout">
        <div className="player-content-area">
          {/* Video Player wrapper inherits glass-premium now */}
          <div className="player-video-wrapper">
            <SeamlessPlaylist ref={playlistRef} ids={playbackIds} onPartChange={handlePartChange} />
          </div>

          <div className="player-info-section">
            <div className="player-info-main">
              <div className="player-title-stack">
                <span className="player-category-badge">{isPlaylist ? "Playlist" : "Single Video"}</span>
                <h1 className="player-video-title">
                  {isLoading ? (
                    <span className="player-title-skeleton" />
                  ) : (
                    <span className="player-title-text">{displayTitle}</span>
                  )}
                </h1>
              </div>
              
              {!isLoading && (
                <div className="player-meta-row">
                  {isPlaylist ? (
                    <div className="player-meta-group">
                      <div className="player-meta-tags">
                        <span className="player-meta-tag">
                          <ListMusic size={14} />
                          {playbackIds.length} segments
                        </span>
                      </div>
                      <span className="player-meta-active-part">
                        Now playing: <span className="aurora-text">{getPartName(activePartIndex)}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="player-meta-tag">High Fidelity Stream</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Sidebar-style Playlist Panel */}
        {isPlaylist && !isLoading && (
          <aside className="player-sidebar glass-panel">
            <div className="sidebar-header">
              <h3 className="sidebar-title">
                <Layers size={18} />
                Playlist Parts
              </h3>
              <span className="sidebar-count">{activePartIndex + 1} / {playbackIds.length}</span>
            </div>
            
            <div className="sidebar-scroll-area">
              {playbackIds.map((id, index) => {
                const isActive = index === activePartIndex;
                return (
                  <div 
                    key={index} 
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => !isActive && playlistRef.current?.goToPart(index)}
                  >
                    <div className="sidebar-item-index">
                      {isActive ? (
                        <div className="playing-bars">
                          <span /><span /><span />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="sidebar-item-info">
                      <span className="sidebar-item-name">{getPartName(index)}</span>
                      {isActive && <span className="sidebar-active-label">Active</span>}
                    </div>
                    <div className="sidebar-item-play">
                      <Play size={14} fill={isActive ? "currentColor" : "none"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
