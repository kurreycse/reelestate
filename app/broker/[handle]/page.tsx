import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AtSign, Building2, MapPin, Play, ShieldCheck } from "lucide-react";
import type { Listing } from "../../../lib/types";

type Catalogue = { name: string; instagram_id: string; listings: Listing[] };
const client=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://placeholder.supabase.co",process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"placeholder",{auth:{persistSession:false,autoRefreshToken:false}});
const validHandle=(value:string)=>/^[A-Za-z0-9._]{1,30}$/.test(value);
async function getCatalogue(handle:string){if(!validHandle(handle))return null;const {data}=await client().rpc("get_public_broker_catalogue",{p_instagram_id:handle});return data as Catalogue|null;}
const money=(minor:number,currency="INR")=>new Intl.NumberFormat("en-IN",{style:"currency",currency,maximumFractionDigits:0}).format(minor/100);

export async function generateMetadata({params}:{params:Promise<{handle:string}>}):Promise<Metadata>{const {handle}=await params;const catalogue=await getCatalogue(handle);if(!catalogue)return{title:"Broker catalogue not found — ReelEstate"};const title=`${catalogue.name}'s property catalogue — ReelEstate`;const description=`Watch ${catalogue.listings.length} available property video ${catalogue.listings.length===1?"listing":"listings"} from @${catalogue.instagram_id}.`;return{title,description,alternates:{canonical:`/broker/${catalogue.instagram_id}`},openGraph:{title,description,type:"website",url:`/broker/${catalogue.instagram_id}`},twitter:{card:"summary",title,description}};}

export default async function BrokerCataloguePage({params}:{params:Promise<{handle:string}>}){const {handle}=await params;const catalogue=await getCatalogue(handle);if(!catalogue)notFound();const storage=client().storage;const listings=await Promise.all(catalogue.listings.map(async listing=>({...listing,poster_url:listing.poster_path?(await storage.from("property-posters").createSignedUrl(listing.poster_path,3600)).data?.signedUrl:undefined})));
  return <main className="broker-page">
    <header className="broker-page-header"><Link className="logo" href="/"><span><Building2/></span><b>Reel<span>Estate</span></b></Link><nav><Link href="/">Browse all</Link><Link className="broker-manage" href="/?view=dashboard">Manage listings</Link></nav></header>
    <section className="broker-profile"><span className="broker-avatar">{catalogue.name.slice(0,1).toUpperCase()}</span><div><span className="eyebrow">Property video catalogue</span><h1>{catalogue.name}</h1><a href={`https://instagram.com/${catalogue.instagram_id}`} target="_blank" rel="noreferrer"><AtSign/> @{catalogue.instagram_id}</a><p><ShieldCheck/> Published listings shown here passed ReelEstate video and content moderation. Independently verify ownership and availability.</p></div><div className="broker-count"><b>{listings.length}</b><span>live {listings.length===1?"property":"properties"}</span></div></section>
    <section className="broker-catalogue" aria-label={`${catalogue.name}'s property listings`}>
      {listings.length?<div className="broker-grid">{listings.map(listing=><article className="broker-card" key={listing.id}><Link className="broker-card-media" href={`/property/${listing.id}`}>{listing.poster_url?<Image src={listing.poster_url} alt={listing.title} fill sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw" unoptimized/>:<span><Building2/>Property video</span>}<i><Play fill="currentColor"/></i></Link><div><span>{listing.property_type} · For {listing.purpose}</span><h2><Link href={`/property/${listing.id}`}>{listing.title}</Link></h2><p><MapPin/>{listing.locality}, {listing.city}</p><b>{money(listing.price_minor,listing.currency)}{listing.purpose==="rent"&&<small>/ month</small>}</b><Link className="broker-card-action" href={`/property/${listing.id}`}>Watch property video</Link></div></article>)}</div>:<div className="broker-empty"><Building2/><h2>No live properties right now</h2><p>This broker’s catalogue will update automatically when a property is published.</p></div>}
    </section>
    <aside className="broker-private-note"><div><b>Are you {catalogue.name}?</b><span>Use your verified phone number to view private analytics, enquiries and listing status.</span></div><Link href="/?view=dashboard">Open broker dashboard</Link></aside>
  </main>;
}
