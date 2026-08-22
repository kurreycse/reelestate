import { createClient } from "@supabase/supabase-js";

const allowedOrigins=new Set(["https://reelestate.co.in","https://www.reelestate.co.in","http://localhost:3000","http://localhost:5173","http://localhost:5174"]);
const cors=(origin:string|null)=>({"access-control-allow-origin":origin&&allowedOrigins.has(origin)?origin:"https://reelestate.co.in","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS",vary:"Origin"});
const json=(body:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"content-type":"application/json","cache-control":"no-store"}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,"0")).join("");
const eventTypes=new Set(["play","complete","share","call","whatsapp"]);

Deno.serve(async request=>{
  const origin=request.headers.get("origin");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(origin&&!allowedOrigins.has(origin))return json({error:"origin_not_allowed"},403,origin);
  try{
    if(Number(request.headers.get("content-length")||0)>2000)return json({error:"payload_too_large"},413,origin);
    const body=await request.json() as Record<string,unknown>;
    const listingId=String(body.listing_id||"");const eventType=String(body.event_type||"");const visitorId=String(body.visitor_id||"");
    if(!/^[0-9a-f-]{36}$/i.test(listingId)||!eventTypes.has(eventType)||!/^[0-9a-f-]{36}$/i.test(visitorId))return json({error:"invalid_event"},400,origin);
    const url=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"server_not_configured"},500,origin);
    const admin=createClient(url,key,{auth:{persistSession:false}});const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
    const [sessionHash,ipHash]=await Promise.all([hash(`${visitorId}:${key.slice(-32)}`),hash(`${forwarded}:${key.slice(-24)}`)]);
    const since=new Date(Date.now()-60*60*1000).toISOString();const {count}=await admin.from("engagement_events").select("id",{count:"exact",head:true}).eq("ip_hash",ipHash).gte("created_at",since);
    if((count||0)>=120)return json({error:"rate_limit_exceeded"},429,origin);
    const {data,error}=await admin.rpc("record_engagement_event",{p_listing_id:listingId,p_event_type:eventType,p_session_hash:sessionHash,p_ip_hash:ipHash});if(error)throw error;
    return json({accepted:true,counted:Boolean(data)},202,origin);
  }catch(error){console.error("Engagement recording failed",error instanceof Error?error.message:error);return json({error:"event_failed"},500,origin)}
});

