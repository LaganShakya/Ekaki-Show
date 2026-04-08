"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import SeamlessPlaylist from "@/components/SeamlessPlaylist";
import { use } from "react";

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  // Decode the URL param. If commas exist, split them into an array of playback IDs.
  const resolvedParams = use(params);
  const rawId = decodeURIComponent(resolvedParams.id);
  const playbackIds = rawId.split(",").map(id => id.trim()).filter(Boolean);

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

      <div className="glass-panel" style={{ overflow: "hidden" }}>
        
        <SeamlessPlaylist ids={playbackIds} />
        
        <div style={{ padding: "24px" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            {playbackIds.length > 1 ? (
              <>
                <Layers size={24} color="var(--accent)" />
                Seamless Playlist
              </>
            ) : (
              "Video Asset"
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {playbackIds.length > 1 
              ? `Multi-part playback active. Playing ${playbackIds.length} parts continuously using ping-pong overlapping buffering for maximum performance.`
              : `Playback ID: ${playbackIds[0]}`
            }
          </p>
          {playbackIds.length > 1 && (
             <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px" }}>
               <h4 style={{ marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>Parts included in this stream:</h4>
               <ul style={{ listStylePosition: "inside", fontSize: "14px", color: "var(--text-primary)" }}>
                 {playbackIds.map((id, index) => (
                   <li key={index}>Part {index + 1}: <span style={{ opacity: 0.7, fontFamily: "monospace" }}>{id}</span></li>
                 ))}
               </ul>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
