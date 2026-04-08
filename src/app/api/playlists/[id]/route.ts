import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export const revalidate = 0;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playlist = await prisma.playlist.findUnique({
      where: { id: id },
      include: {
        videos: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch full mux data for each asset in the playlist
    const populatedVideos = await Promise.all(
      playlist.videos.map(async (v) => {
        try {
          const asset = await mux.video.assets.retrieve(v.muxAssetId);
          return {
            ...v,
            muxData: asset
          };
        } catch (e) {
          return { ...v, muxData: null, error: "Asset not found on Mux" };
        }
      })
    );

    return NextResponse.json({ playlist: { ...playlist, videos: populatedVideos } });
  } catch (error: any) {
    console.error("Failed to fetch playlist details:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
