import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const serif = Cormorant_Garamond({ variable: "--font-serif", subsets: ["latin"], weight:["500","600","700"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "ReelEstate — Property, in motion";
  const description = "Discover reviewed property walkthroughs. Post a short video, get approved, and connect directly.";
  return {
    metadataBase: new URL(origin), title, description,
    openGraph: { title, description, type:"website", url:origin, images:[{url:`${origin}/og.png`,width:1792,height:933,alt:"ReelEstate — Property, in motion"}] },
    twitter: { card:"summary_large_image", title, description, images:[`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>;
}
