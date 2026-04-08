import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { videoPartId, title } = body;

    if (!videoPartId || typeof title !== "string") {
      return NextResponse.json({ error: "Missing videoPartId or title" }, { status: 400 });
    }

    const updated = await prisma.videoPart.update({
      where: { id: videoPartId },
      data: { title: title.trim() }
    });

    return NextResponse.json({ video: updated });
  } catch (error: any) {
    console.error("Failed to rename video part:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
