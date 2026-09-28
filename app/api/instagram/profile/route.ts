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

    const url = new URL("https://graph.instagram.com/v20.0/me");
    url.searchParams.set("fields", "id,username,account_type,profile_picture_url");
    url.searchParams.set("access_token", token);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as {
      id?: string;
      username?: string;
      account_type?: string;
      profile_picture_url?: string;
      error?: { message?: string };
    };

    if (!response.ok || !data.username) {
      return NextResponse.json(
        {
          error: data.error?.message || "Unable to fetch Instagram account profile.",
        },
        { status: response.status || 400 },
      );
    }

    return NextResponse.json({
      id: data.id,
      username: data.username,
      account_type: data.account_type,
      profile_picture_url: data.profile_picture_url || "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch Instagram profile." },
      { status: 500 },
    );
  }
}
