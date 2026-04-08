"use client";

import Link from "next/link";
import { ArrowLeft, Layers, Share2, ListMusic, ChevronDown, ChevronUp, Play } from "lucide-react";
import SeamlessPlaylist from "@/components/SeamlessPlaylist";
import { use, useEffect, useState, useCallback } from "react";

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
    <div className="player-page">

      <div className="player-top-bar">
        <Link href="/" className="player-back-btn">
          <ArrowLeft size={18} />
          <span className="responsive-hidden-text">Back</span>
        </Link>
        
        <div className="player-top-actions">
          <button className="player-action-btn" onClick={handleShare} title="Share">
            <Share2 size={18} />
            <span className="responsive-hidden-text">{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div className="player-video-wrapper">
        <SeamlessPlaylist ids={playbackIds} onPartChange={handlePartChange} />
      </div>

      {/* Info Section */}
      <div className="player-info-section">
        <div className="player-info-main">
          <div className="player-title-row">
            <h1 className="player-video-title">
              {isPlaylist && <Layers size={22} color="var(--accent)" className="player-title-icon" />}
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
                <>
                  <span className="player-meta-tag">
                    <ListMusic size={14} />
                    {playbackIds.length} parts
                  </span>
                  <span className="player-meta-divider">·</span>
                  <span className="player-meta-tag player-meta-active-part">
                    Now playing: {getPartName(activePartIndex)}
                  </span>
                </>
              ) : (
                <span className="player-meta-tag">On-demand stream</span>
              )}
            </div>
          )}
        </div>

        {/* Playlist Parts Panel */}
        {isPlaylist && !isLoading && (
          <div className="player-parts-panel">
            <button 
              className="player-parts-toggle" 
              onClick={() => setShowParts(!showParts)}
            >
              <div className="player-parts-toggle-text">
                <ListMusic size={16} />
                <span>Playlist ({playbackIds.length} parts)</span>
              </div>
              {showParts ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            <div className={`player-parts-list ${showParts ? "open" : ""}`}>
              {playbackIds.map((id, index) => {
                const isActive = index === activePartIndex;
                return (
                  <div 
                    key={index} 
                    className={`player-part-item ${isActive ? "active" : ""}`}
                  >
                    <div className="player-part-index">
                      {isActive ? (
                        <div className="player-part-playing-indicator">
                          <span /><span /><span />
                        </div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="player-part-name">
                      {getPartName(index)}
                    </div>
                    {isActive && (
                      <span className="player-part-now-badge">NOW</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
