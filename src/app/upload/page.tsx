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

    // Request notification permission early
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

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

      // 1. Get the upload URL upgrade from our secure API
      const res = await fetch("/api/upload", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const { url: uploadUrl, id: muxAssetId } = await res.json();

      // 3. Add to Playlist DB concurrently
      if (activePlaylistId) {
        fetch("/api/playlists/add-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistId: activePlaylistId, muxAssetId })
        }).catch(err => console.error("Async DB register failed:", err));
      }

      // 2. Start the chunked upload direktly to Mux
      const upload = UpChunk.createUpload({
        endpoint: uploadUrl!,
        file: file,
        chunkSize: 10240, // 10MB starting chunk
        dynamicChunkSize: true, 
        attempts: 100,    // High retry count for stability
        // @ts-ignore - Some versions support useWorker
        useWorker: true  
      });


      upload.on("progress", (progressEvent) => {
        const percent = progressEvent.detail;
        setProgress(percent);

        // Calculate speed
        const currentTime = Date.now();
        const timeDiff = (currentTime - speedTracker.current.lastTime) / 1000; // seconds
        if (timeDiff >= 0.5) { // Update speed every 0.5s
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
        localStorage.removeItem("pending_upload");

        // Background notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Upload Complete! 🎉", {
            body: `"${file.name}" has been successfully uploaded and is now processing.`,
            silent: false
          });
        }
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
    <div className="upload-container animate-in">
      <div className="page-header" style={{ marginBottom: "32px", textAlign: "center" }}>
        <div>
          <h1 className="page-title">
            Upload <span className="aurora-text">Masterpiece</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginTop: "12px" }}>
            Experience high-fidelity uploads with intelligent chunking.
          </p>
        </div>
      </div>

      <div className="glass-premium" style={{ padding: "40px", position: "relative" }}>
        {isComplete ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ 
              width: "80px", 
              height: "80px", 
              background: "rgba(52, 211, 153, 0.1)", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <CheckCircle size={48} color="var(--success)" />
            </div>
            <h2 style={{ marginBottom: "12px", color: "var(--success)", fontSize: "28px" }}>Upload Complete!</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", maxWidth: "400px", margin: "0 auto 32px" }}>
              Your cinematic asset is now being processed and will be available in your library shortly.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
              <button className="btn-primary" onClick={() => {
                setIsComplete(false);
                setProgress(0);
                fileInputRef.current?.click();
              }}>
                Upload Another
              </button>
              <button className="btn-secondary" onClick={() => router.push("/")}>
                Return Home
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ 
              textAlign: "left", 
              marginBottom: "32px", 
              background: "rgba(255,255,255,0.02)", 
              padding: "24px", 
              borderRadius: "var(--rounded-md)", 
              border: "1px solid var(--border-bold)" 
            }}>
              <label style={{ 
                display: "block", 
                marginBottom: "12px", 
                fontWeight: 600, 
                fontSize: "14px",
                color: "var(--accent-secondary)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                Context Selection
              </label>
              <select 
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: "var(--bg-deep)", 
                  color: "white", 
                  border: "1px solid var(--border-bold)", 
                  borderRadius: "10px", 
                  marginBottom: selectedPlaylistId === "new" ? "16px" : "0",
                  outline: "none",
                  fontFamily: "inherit"
                }}
                disabled={isUploading}
              >
                <option value="none">Standalone Video</option>
                <option value="new">+ Create New Collection</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>

              {selectedPlaylistId === "new" && (
                <input 
                  type="text"
                  placeholder="Collection Title..."
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "14px", 
                    background: "var(--bg-deep)", 
                    color: "white", 
                    border: "1px solid var(--accent-primary)", 
                    borderRadius: "10px",
                    outline: "none",
                    boxShadow: "0 0 15px rgba(192, 132, 252, 0.1)"
                  }}
                  disabled={isUploading}
                />
              )}
            </div>

            <div
              className={`upload-dropzone glow-card ${isDragActive ? "active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{ 
                pointerEvents: isUploading ? "none" : "auto", 
                opacity: isUploading ? 0.4 : 1, 
                marginTop: 0,
                borderStyle: "dashed",
                padding: "60px 40px"
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                accept="video/*"
              />
              <div className="brand-icon-wrapper" style={{ margin: "0 auto 20px", width: "64px", height: "64px" }}>
                <UploadCloud size={32} />
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>
                {isDragActive ? "Release to drop" : "Drag & drop your visual"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Supporting high-bitrate MP4, MOV, and MKV up to 5GB
              </p>
            </div>

            {isUploading && (
              <div className="upload-progress-container animate-in">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-primary)" }}>
                      Streaming to Nebula
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>
                      {uploadSpeed} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>available bandwidth</span>
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>{progress.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="progress-bar-bg" style={{ height: "12px" }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ 
                marginTop: "24px", 
                padding: "20px", 
                background: "rgba(251, 113, 133, 0.05)", 
                border: "1px solid var(--error)",
                borderRadius: "var(--rounded-md)",
                color: "var(--error)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                textAlign: "left"
              }}>
                <div style={{ background: "rgba(251, 113, 133, 0.1)", padding: "10px", borderRadius: "50%" }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>Transmission Error</div>
                  <div style={{ fontSize: "13px", opacity: 0.8 }}>{error}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
