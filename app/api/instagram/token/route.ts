import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "../../../../lib/config";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { code?: string; redirect_uri?: string };
    const { code, redirect_uri } = body;

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: "Missing Instagram authorization code or redirect URI." },
        { status: 400 },
      );
    }

    const clientId = appConfig.instagram.clientId;
    const clientSecret = appConfig.instagram.clientSecret;

    const payload = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri,
      code,
    });

    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: payload.toString(),
    });

    const data = (await response.json()) as {
      access_token?: string;
      user_id?: string;
      expires_in?: number;
      error_message?: string;
      error?: string;
    };

    if (!response.ok || !data.access_token) {
      return NextResponse.json(
        {
          error: data.error_message || data.error || "Instagram token exchange failed.",
        },
        { status: response.status || 400 },
      );
    }

    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(data.access_token)}`,
    );
    const longLivedData = (await longLivedResponse.json()) as {
      access_token?: string;
      expires_in?: number;
      token_type?: string;
      error?: { message?: string };
    };

    if (!longLivedResponse.ok || !longLivedData.access_token) {
      return NextResponse.json(
        {
          error:
            longLivedData.error?.message ||
            "Instagram long-lived token exchange failed.",
        },
        { status: longLivedResponse.status || 400 },
      );
    }

    return NextResponse.json({
      access_token: longLivedData.access_token,
      user_id: data.user_id,
      expires_in: longLivedData.expires_in || data.expires_in,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete Instagram OAuth." },
      { status: 500 },
    );
  }
}
