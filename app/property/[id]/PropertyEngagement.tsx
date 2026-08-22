"use client";

import { useRef } from "react";
import { Eye, MessageCircle, Phone } from "lucide-react";
import { recordEngagement } from "../../../lib/analytics";
import type { Listing } from "../../../lib/types";

export default function PropertyEngagement({listing,videoUrl,posterUrl}:{listing:Listing;videoUrl?:string;posterUrl?:string}){
  const completionSent=useRef(false);const contact=listing.contact_phone.replace(/\D/g,"");
  return <>
    <div className="property-page-video">{videoUrl?<video src={videoUrl} poster={posterUrl} controls playsInline preload="metadata" onPlay={()=>recordEngagement(listing.id,"play")} onTimeUpdate={event=>{const video=event.currentTarget;if(!completionSent.current&&video.duration&&video.currentTime/video.duration>=.9){completionSent.current=true;recordEngagement(listing.id,"complete")}}}/>:<div className="video-loading">Video unavailable</div>}</div>
    <div className="public-view-count"><Eye/>{(listing.view_count||0).toLocaleString("en-IN")} views</div>
    <div className="detail-contact">{listing.contact_preference!=="whatsapp"&&<a href={`tel:${listing.contact_phone}`} onClick={()=>recordEngagement(listing.id,"call")}><Phone/> Call</a>}{listing.contact_preference!=="call"&&<a href={`https://wa.me/${contact}`} target="_blank" rel="noreferrer" onClick={()=>recordEngagement(listing.id,"whatsapp")}><MessageCircle/> WhatsApp</a>}</div>
  </>;
}
