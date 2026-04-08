import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export const revalidate = 0; // Force dynamic to always get latest assets

export async function GET() {
  try {
    const assets = await mux.video.assets.list({
      limit: 100,
    });

    // Mux gives us a data array representing all the assets
    return NextResponse.json({ assets: assets.data });
  } catch (error: any) {
    console.error("Failed to list Mux assets:", error);
    return NextResponse.json(
      { error: "Failed to list Mux assets" },
      { status: 500 }
    );
  }
}
