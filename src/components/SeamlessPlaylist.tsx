"use client";

import { useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

export default function SeamlessPlaylist({ ids }: { ids: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!ids || ids.length === 0) return null;

  if (ids.length === 1) {
    // Standard player for single IDs
    return (
      <MuxPlayer
        playbackId={ids[0]}
        streamType="on-demand"
        primaryColor="#8b5cf6"
        autoPlay
        style={{ width: "100%", aspectRatio: "16/9", display: "block" }}
      />
    );
  }

  // Ping-pong technique:
  // "Ping" player renders even indices (0, 2, 4...)
  // "Pong" player renders odd indices (1, 3, 5...)
  const isPingActive = activeIndex % 2 === 0;

  // Determine what video each player should be preparing/playing
  const pingId = isPingActive ? ids[activeIndex] : ids[activeIndex + 1];
  const pongId = !isPingActive ? ids[activeIndex] : ids[activeIndex + 1];

  const handleEnded = () => {
    if (activeIndex < ids.length - 1) {
      setActiveIndex((prev) => prev + 1);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: "12px", overflow: "hidden" }}>
      {/* PING PLAYER */}
      {pingId && (
        <MuxPlayer
          playbackId={pingId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={isPingActive} // Only active player auto-plays
          onEnded={isPingActive ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: isPingActive ? 1 : 0,
            pointerEvents: isPingActive ? "auto" : "none",
            zIndex: isPingActive ? 10 : 1,
          }}
        />
      )}

      {/* PONG PLAYER */}
      {pongId && (
        <MuxPlayer
          playbackId={pongId}
          streamType="on-demand"
          primaryColor="#8b5cf6"
          autoPlay={!isPingActive} // Only active player auto-plays
          onEnded={!isPingActive ? handleEnded : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: !isPingActive ? 1 : 0,
            pointerEvents: !isPingActive ? "auto" : "none",
            zIndex: !isPingActive ? 10 : 1,
          }}
        />
      )}
      
      {/* Custom Playlist Overlay indicating part track */}
      <div style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          background: "rgba(0,0,0,0.6)",
          padding: "6px 12px",
          borderRadius: "20px",
          color: "white",
          fontSize: "12px",
          fontWeight: 600,
          zIndex: 20,
          pointerEvents: "none",
          backdropFilter: "blur(4px)"
      }}>
        Part {activeIndex + 1} of {ids.length}
      </div>
    </div>
  );
}
