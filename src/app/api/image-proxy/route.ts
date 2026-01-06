// app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

const cache = new Map<string, { buffer: Buffer; contentType: string }>();

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing image URL", { status: 400 });
  }

  // Check cache
  if (cache.has(url)) {
    const { buffer, contentType } = cache.get(url)!;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  try {
    // Fetch directly from the provided URL
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("Content-Type") || "image/jpeg";

    // Cache the image
    cache.set(url, { buffer, contentType });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.log(error);
    return new NextResponse("Image fetch failed", { status: 500 });
  }
}
