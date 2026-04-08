"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import SeamlessPlaylist from "@/components/SeamlessPlaylist";
import { use, useEffect, useState } from "react";

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

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/video-info?playbackIds=${playbackIds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setVideoInfo(data.videos || []);
        }
      } catch {
        // Silently fail — we'll just show fallback text
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, [rawId]);

  const isPlaylist = playbackIds.length > 1;
  const playlistTitle = videoInfo.find(v => v.playlistTitle)?.playlistTitle;
  
  // For single video, get title
  const singleTitle = videoInfo[0]?.title;

  // Build display title
  const displayTitle = isPlaylist
    ? (playlistTitle || "Seamless Playlist")
    : (singleTitle || "Now Playing");

  return (
    <div className="playlist-container">
      <Link href="/" className="playlist-back-link">
        <ArrowLeft size={16} />
        Back to Library
      </Link>

      <div className="glass-panel" style={{ overflow: "hidden" }}>
        
        <SeamlessPlaylist ids={playbackIds} />
        
        <div style={{ padding: "24px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            {isPlaylist && <Layers size={24} color="var(--accent)" />}
            {isLoading ? (
              <span style={{ color: "var(--text-secondary)" }}>Loading…</span>
            ) : (
              displayTitle
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {isPlaylist 
              ? `Multi-part playback active. Playing ${playbackIds.length} parts continuously.`
              : (singleTitle ? "Enjoy your video." : "")
            }
          </p>
          {isPlaylist && !isLoading && (
             <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px" }}>
               <h4 style={{ marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>Parts in this stream:</h4>
               <ul style={{ listStylePosition: "inside", fontSize: "14px", color: "var(--text-primary)" }}>
                 {playbackIds.map((id, index) => {
                   const info = videoInfo.find(v => v.playbackId === id);
                   const partName = info?.title || `Part ${index + 1}`;
                   return (
                     <li key={index} style={{ padding: "4px 0" }}>{partName}</li>
                   );
                 })}
               </ul>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
