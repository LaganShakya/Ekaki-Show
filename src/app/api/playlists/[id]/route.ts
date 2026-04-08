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
          let asset = null;
          let currentId = v.muxAssetId;
          
          // First try to retrieve it directly as an asset
          try {
            asset = await mux.video.assets.retrieve(currentId);
          } catch (e) {
            // If it fails, it's likely an Upload ID (which we stored at creation)
            const upload = await mux.video.uploads.retrieve(currentId);
            if (upload.asset_id) {
              asset = await mux.video.assets.retrieve(upload.asset_id);
              // Heal the database so we don't have to do this 2-step lookup again!
              await prisma.videoPart.update({
                where: { id: v.id },
                data: { muxAssetId: upload.asset_id }
              });
            } else {
              // Still uploading/processing
              return { ...v, muxData: { status: upload.status === 'waiting' ? 'preparing' : upload.status } };
            }
          }

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
