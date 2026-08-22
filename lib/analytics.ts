import { supabase } from "./supabase";

export type EngagementType="play"|"complete"|"share"|"call"|"whatsapp";
const storageKey="reelestate_visitor_id";

function visitorId(){
  let id=localStorage.getItem(storageKey);
  if(!id){id=crypto.randomUUID();localStorage.setItem(storageKey,id);}
  return id;
}

export function recordEngagement(listingId:string,eventType:EngagementType){
  if(typeof window==="undefined")return;
  void supabase.functions.invoke("record-engagement",{body:{listing_id:listingId,event_type:eventType,visitor_id:visitorId()}});
}
