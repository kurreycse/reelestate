import { createClient } from "@supabase/supabase-js";

const allowedOrigins=new Set(["https://reelestate.co.in","https://www.reelestate.co.in","http://localhost:3000","http://localhost:5173","http://localhost:5174"]);
const cors=(origin:string|null)=>({"access-control-allow-origin":origin&&allowedOrigins.has(origin)?origin:"https://reelestate.co.in","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS",vary:"Origin"});
const json=(body:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"content-type":"application/json"}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(byte=>byte.toString(16).padStart(2,"0")).join("");
const phone=(value:string)=>{const digits=value.replace(/\D/g,"");return digits.length===10?`+91${digits}`:digits.length>=8&&digits.length<=15?`+${digits}`:""};

Deno.serve(async request=>{
  const origin=request.headers.get("origin");
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(request.method!=="POST")return json({error:"method_not_allowed"},405,origin);
  if(origin&&!allowedOrigins.has(origin))return json({error:"origin_not_allowed"},403,origin);
  try{
    if(Number(request.headers.get("content-length")||0)>12000)return json({error:"payload_too_large"},413,origin);
    const body=await request.json() as Record<string,unknown>;
    if(String(body.website||""))return json({accepted:true},202,origin);
    const listingId=String(body.listing_id||"");const name=String(body.name||"").trim().replace(/\s+/g," ");const phoneE164=phone(String(body.phone||""));const email=String(body.email||"").trim().toLowerCase()||null;const message=String(body.message||"").trim();const visit=String(body.preferred_visit_date||"")||null;
    if(!/^[0-9a-f-]{36}$/.test(listingId)||name.length<2||name.length>120||!phoneE164||message.length>1000||(email&&(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>254))||(visit&&Number.isNaN(Date.parse(visit))))return json({error:"invalid_enquiry_details"},400,origin);
    const url=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"server_not_configured"},500,origin);const admin=createClient(url,key,{auth:{persistSession:false}});
    const {data:listing}=await admin.from("listings").select("id,owner_id,status").eq("id",listingId).eq("status","published").maybeSingle();if(!listing)return json({error:"listing_not_found"},404,origin);
    const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";const ipHash=await hash(`${forwarded}:${key.slice(-24)}`);const since=new Date(Date.now()-60*60*1000).toISOString();const {count}=await admin.from("property_enquiries").select("id",{count:"exact",head:true}).eq("ip_hash",ipHash).gte("created_at",since);if((count||0)>=5)return json({error:"rate_limit_exceeded"},429,origin);
    const {error}=await admin.from("property_enquiries").insert({listing_id:listing.id,owner_id:listing.owner_id,name,phone_e164:phoneE164,email,message,preferred_visit_date:visit,ip_hash:ipHash});if(error)throw error;
    return json({accepted:true},201,origin);
  }catch(error){console.error("Property enquiry failed",error instanceof Error?error.message:error);return json({error:"submission_failed"},500,origin)}
});
