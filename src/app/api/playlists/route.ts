import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export async function GET() {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        videos: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error("Failed to fetch playlists:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title } = body;
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const newPlaylist = await prisma.playlist.create({
      data: { title }
    });
    return NextResponse.json({ playlist: newPlaylist });
  } catch (error: any) {
    console.error("Failed to create playlist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
