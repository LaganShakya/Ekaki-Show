"use client";

import { useState, useRef, useEffect } from "react";
import * as UpChunk from "@mux/upchunk";
import { UploadCloud, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Playlist = {
  id: string;
  title: string;
};

export default function UploadPage() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState<string>("0 MB/s");
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("none");
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");

  const speedTracker = useRef({
    lastBytes: 0,
    lastTime: Date.now()
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/playlists")
      .then(res => res.json())
      .then(data => {
        if (data.playlists) setPlaylists(data.playlists);
      })
      .catch(console.error);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      startUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startUpload(e.target.files[0]);
    }
  };

  const startUpload = async (file: File) => {
    setError(null);
    setProgress(0);
    setIsUploading(true);
    setIsComplete(false);

    try {
      let activePlaylistId = selectedPlaylistId === "none" ? null : selectedPlaylistId;

      // Create new playlist on the fly if requested
      if (selectedPlaylistId === "new" && newPlaylistTitle.trim()) {
        const pRes = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newPlaylistTitle.trim() })
        });
        if (!pRes.ok) throw new Error("Failed to create playlist");
        const pData = await pRes.json();
        activePlaylistId = pData.playlist.id;
      }

      // 1. Get the upload URL from our secure API
      const res = await fetch("/api/upload", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { url, id: muxAssetId } = await res.json();

      // 2. Start the chunked upload directly to Mux (32MB chunks for speed)
      const upload = UpChunk.createUpload({
        endpoint: url,
        file: file,
        chunkSize: 32768, // 32MB chunks (reduced overhead)
        attempts: 5,      // Handle minor network glitches
      });

      // 3. Add to Playlist DB concurrently - don't block the actual upload start
      if (activePlaylistId) {
        fetch("/api/playlists/add-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: activePlaylistId, muxAssetId })
        }).catch(err => console.error("Async DB register failed:", err));
      }

      upload.on("progress", (progressEvent) => {
        const percent = progressEvent.detail;
        setProgress(percent);

        // Calculate speed
        const currentTime = Date.now();
        const timeDiff = (currentTime - speedTracker.current.lastTime) / 1000; // seconds
        if (timeDiff >= 0.5) { // Update speed every 0.5s for stability
          const currentBytes = (percent / 100) * file.size;
          const bytesDiff = currentBytes - speedTracker.current.lastBytes;
          const speedMBs = (bytesDiff / timeDiff) / (1024 * 1024);
          
          setUploadSpeed(`${speedMBs.toFixed(2)} MB/s`);
          
          speedTracker.current.lastBytes = currentBytes;
          speedTracker.current.lastTime = currentTime;
        }
      });

      upload.on("success", () => {
        setIsUploading(false);
        setIsComplete(true);
        setUploadSpeed("0 MB/s");
      });

      upload.on("error", (err) => {
        console.error("Upload error:", err);
        setError(err.detail?.message || "Upload failed");
        setIsUploading(false);
      });
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">Upload Masterpiece</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Upload high-resolution videos without limits. Select a Playlist if this is part of a series.
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "40px", position: "relative" }}>
        {isComplete ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <CheckCircle size={64} color="#10b981" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ marginBottom: "16px", color: "#10b981" }}>Upload Complete!</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
              Your video is now processing on Mux. It will be available in your library shortly.
            </p>
            <button className="btn-primary" onClick={() => {
              setIsComplete(false);
              setProgress(0);
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.onchange = handleFileInput as any;
              fileInput.click();
            }}>
              Upload Another Part
            </button>
            <button className="btn-secondary" style={{ marginLeft: "12px" }} onClick={() => router.push("/")}>
              Go Home
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "left", marginBottom: "24px", background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Add to Playlist (Optional)</label>
              <select 
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                style={{ width: "100%", padding: "10px", background: "var(--bg-surface)", color: "white", border: "1px solid var(--border)", borderRadius: "6px", marginBottom: selectedPlaylistId === "new" ? "12px" : "0" }}
                disabled={isUploading}
              >
                <option value="none">Standalone Video</option>
                <option value="new">+ Create New Playlist</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              {selectedPlaylistId === "new" && (
                <input 
                  type="text"
                  placeholder="Enter Playlist Name..."
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  style={{ width: "100%", padding: "10px", background: "var(--bg-surface)", color: "white", border: "1px solid var(--border)", borderRadius: "6px" }}
                  disabled={isUploading}
                />
              )}
            </div>

            <div
              className={`upload-dropzone ${isDragActive ? "active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{ pointerEvents: isUploading ? "none" : "auto", opacity: isUploading ? 0.5 : 1, marginTop: 0 }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept="video/*"
              />
              <UploadCloud className="upload-icon" />
              <h3>{isDragActive ? "Drop the video here" : "Drag & drop a video"}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                or click to browse your files
              </p>
            </div>

            {isUploading && (
              <div className="upload-progress-container">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 500 }}>Uploading...</span>
                    <span style={{ fontSize: "12px", background: "rgba(139, 92, 246, 0.2)", color: "var(--accent)", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                      {uploadSpeed}
                    </span>
                  </div>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>{progress.toFixed(1)}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ 
                marginTop: "24px", 
                padding: "16px", 
                background: "rgba(239, 68, 68, 0.1)", 
                border: "1px solid var(--error)",
                borderRadius: "var(--rounded-md)",
                color: "var(--error)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left"
              }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
