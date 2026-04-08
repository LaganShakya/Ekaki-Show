import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { playlistId, muxAssetId } = body;
    
    if (!playlistId || !muxAssetId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Determine the next order index
    const count = await prisma.videoPart.count({
      where: { playlistId }
    });

    const newVideo = await prisma.videoPart.create({
      data: {
        playlistId,
        muxAssetId,
        orderIndex: count // zero-indexed
      }
    });

    return NextResponse.json({ video: newVideo });
  } catch (error: any) {
    console.error("Failed to add video to playlist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
