import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playbackIds = searchParams.get("playbackIds");

    if (!playbackIds) {
      return NextResponse.json({ error: "Missing playbackIds" }, { status: 400 });
    }

    // We need to find VideoParts whose muxAssetId corresponds to a given playback ID.
    // Since playback IDs come from Mux and muxAssetId is the Mux asset ID,
    // we need to look up assets by playback ID via the Mux API first.
    const Mux = (await import("@mux/mux-node")).default;
    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    });

    const ids = playbackIds.split(",").map(id => id.trim()).filter(Boolean);

    const results = await Promise.all(
      ids.map(async (playbackId) => {
        try {
          // Look up the asset that owns this playback ID
          const assets = await mux.video.assets.list({ limit: 100 });
          const matchingAsset = assets.data.find(
            (a) => a.playback_ids?.some((p) => p.id === playbackId)
          );

          if (!matchingAsset) {
            return { playbackId, title: null, playlistTitle: null };
          }

          // Now find the VideoPart by muxAssetId
          const videoPart = await prisma.videoPart.findFirst({
            where: { muxAssetId: matchingAsset.id },
            include: { playlist: true }
          });

          return {
            playbackId,
            title: videoPart?.title || null,
            playlistTitle: videoPart?.playlist?.title || null,
            orderIndex: videoPart?.orderIndex ?? null
          };
        } catch {
          return { playbackId, title: null, playlistTitle: null };
        }
      })
    );

    return NextResponse.json({ videos: results });
  } catch (error: any) {
    console.error("Failed to lookup video info:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
