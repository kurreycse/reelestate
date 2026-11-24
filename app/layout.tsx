import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"] });

export function generateMetadata(): Metadata {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://reelestate.co.in";
  const title = "ReelEstate — See the property before you visit";
  const description = "Discover reviewed real estate video walkthroughs from owners and brokers. Compare property details, then connect directly by call or WhatsApp.";
  return {
    metadataBase: new URL(origin), title, description,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
    },
    openGraph: { title, description, type:"website", url:origin, images:[{url:`${origin}/og.png`,width:1792,height:933,alt:"ReelEstate — Property, in motion"}] },
    twitter: { card:"summary_large_image", title, description, images:[`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={sans.variable}>{children}</body></html>;
}
