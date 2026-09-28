import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : request.nextUrl.searchParams.get("access_token") || "";

    if (!token) {
      return NextResponse.json(
        { error: "Instagram access token is missing." },
        { status: 401 },
      );
    }

    const url = new URL("https://graph.instagram.com/v20.0/me/media");
    url.searchParams.set("fields", "id,caption,media_type,media_url,permalink,thumbnail_url,username,timestamp");
    url.searchParams.set("access_token", token);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as {
      data?: Array<{
        id?: string;
        caption?: string;
        media_type?: string;
        media_url?: string;
        permalink?: string;
        thumbnail_url?: string;
        username?: string;
        timestamp?: string;
      }>;
      error?: { message?: string };
    };

    if (!response.ok || !data.data) {
      return NextResponse.json(
        {
          error: data.error?.message || "Unable to fetch Instagram reels.",
        },
        { status: response.status || 400 },
      );
    }

    return NextResponse.json({ data: data.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch Instagram reels." },
      { status: 500 },
    );
  }
}
