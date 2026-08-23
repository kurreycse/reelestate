import { createClient } from "@supabase/supabase-js";

const origins=new Set(["https://reelestate.co.in","https://www.reelestate.co.in","http://localhost:3000","http://localhost:5173","http://localhost:5174"]);
const cors=(origin:string|null)=>({"access-control-allow-origin":origin&&origins.has(origin)?origin:"https://reelestate.co.in","access-control-allow-headers":"authorization, x-client-info, apikey, content-type","access-control-allow-methods":"POST, OPTIONS",vary:"Origin"});
const json=(body:unknown,status:number,origin:string|null)=>new Response(JSON.stringify(body),{status,headers:{...cors(origin),"content-type":"application/json","cache-control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowed=new Set(["Lift","Parking","Power backup","Security","Gym","Swimming pool","Garden","Clubhouse"]);
const bytes=(value:string)=>new TextEncoder().encode(value).byteLength;
const readU32=(data:Uint8Array,offset:number)=>new DataView(data.buffer,data.byteOffset,data.byteLength).getUint32(offset);
const readU64=(data:Uint8Array,offset:number)=>Number(new DataView(data.buffer,data.byteOffset,data.byteLength).getBigUint64(offset));
const ascii=(data:Uint8Array)=>new TextDecoder("latin1").decode(data);

function mediaDuration(chunks:Uint8Array[]){
  for(const data of chunks){const text=ascii(data);const marker=text.indexOf("mvhd");if(marker<0)continue;try{const version=data[marker+4];const timescale=readU32(data,marker+(version===1?24:16));const duration=version===1?readU64(data,marker+28):readU32(data,marker+20);if(timescale>0)return duration/timescale;}catch{/* malformed box */}}
  return 0;
}

async function inspectVideoStream(url:string,expectedSize:number,maxSize:number){
  const response=await fetch(url);if(!response.ok||!response.body)throw new Error("video_read_failed");
  const reader=response.body.getReader();let total=0;let carry=new Uint8Array();let signature="";let hasVideoCodec=false;let hasAudioTrack=false;let hasAudioCodec=false;let duration=0;
  while(true){const {done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>maxSize){await reader.cancel();throw new Error("video_size_invalid")}if(!signature)signature=ascii(value.slice(0,64));const combined=new Uint8Array(carry.byteLength+value.byteLength);combined.set(carry);combined.set(value,carry.byteLength);const text=ascii(combined);hasVideoCodec||=text.includes("avc1")||text.includes("avc3");hasAudioTrack||=text.includes("soun");hasAudioCodec||=text.includes("mp4a");if(!duration)duration=mediaDuration([combined]);carry=combined.slice(Math.max(0,combined.byteLength-64));}
  if(!total||Math.abs(total-expectedSize)>1024)throw new Error("video_read_failed");
  if(!signature.includes("ftyp"))throw new Error("video_container_invalid");if(!hasVideoCodec)throw new Error("video_codec_invalid");if(hasAudioTrack&&!hasAudioCodec)throw new Error("audio_codec_invalid");if(!Number.isFinite(duration)||duration<1)throw new Error("video_duration_invalid");return {size:total,duration:Math.ceil(duration)};
}

async function inspect(url:string,maxSize:number,kind:"video"|"poster"){
  const head=await fetch(url,{method:"HEAD"});if(!head.ok)throw new Error(`${kind}_unavailable`);
  let size=Number(head.headers.get("content-length")||0);const type=(head.headers.get("content-type")||"").split(";")[0].toLowerCase();
  if(!size){const probe=await fetch(url,{headers:{range:"bytes=0-0"}});const match=probe.headers.get("content-range")?.match(/\/(\d+)$/);size=Number(match?.[1]||probe.headers.get("content-length")||0);await probe.body?.cancel()}
  if(!size||size>maxSize)throw new Error(`${kind}_size_invalid`);
  if(kind==="poster"){
    if(type!=="image/jpeg")throw new Error("poster_type_invalid");const response=await fetch(url,{headers:{range:"bytes=0-15"}});const data=new Uint8Array(await response.arrayBuffer());if(data[0]!==0xff||data[1]!==0xd8||data[2]!==0xff)throw new Error("poster_content_invalid");return {size,duration:0};
  }
  if(!["video/mp4","video/quicktime","application/octet-stream"].includes(type))throw new Error("video_type_invalid");
  return inspectVideoStream(url,size,maxSize);
}

Deno.serve(async request=>{
  const origin=request.headers.get("origin");if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});if(request.method!=="POST")return json({error:"method_not_allowed"},405,origin);if(origin&&!origins.has(origin))return json({error:"origin_not_allowed"},403,origin);
  try{
    const raw=await request.text();if(bytes(raw)>24000)return json({error:"payload_too_large"},413,origin);const data=JSON.parse(raw) as Record<string,unknown>;
    const authorization=request.headers.get("authorization")||"";const token=authorization.replace(/^Bearer\s+/i,"");if(!token)return json({error:"authentication_required"},401,origin);
    const url=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"server_not_configured"},500,origin);const admin=createClient(url,key,{auth:{persistSession:false}});
    const {data:{user},error:userError}=await admin.auth.getUser(token);if(userError||!user)return json({error:"authentication_required"},401,origin);
    const {data:profile}=await admin.from("profiles").select("is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active)return json({error:"account_inactive"},403,origin);
    const id=String(data.id||"");const videoPath=String(data.video_path||"");const posterPath=String(data.poster_path||"");if(!uuid.test(id)||!new RegExp(`^${user.id}/${id}\\.(mp4|mov)$`,"i").test(videoPath)||posterPath!==`${user.id}/${id}.jpg`)return json({error:"invalid_media_path"},400,origin);
    const title=String(data.title||"").trim(),description=String(data.description||"").trim(),city=String(data.city||"").trim(),locality=String(data.locality||"").trim(),phone=String(data.contact_phone||"").trim();const purpose=String(data.purpose||"");const propertyType=String(data.property_type||"");const preference=String(data.contact_preference||"");const postedBy=String(data.posted_by||"");
    if(title.length<5||title.length>120||description.length<20||description.length>2000||city.length<2||city.length>100||locality.length<2||locality.length>150||phone.length<8||phone.length>20||!["sale","rent"].includes(purpose)||!["Apartment","Villa","Independent house","Plot","Commercial"].includes(propertyType)||!["call","whatsapp","both"].includes(preference)||!["owner","agent","builder"].includes(postedBy)||!Number.isSafeInteger(Number(data.price_minor))||Number(data.price_minor)<=0)return json({error:"invalid_listing_details"},400,origin);
    const amenities=Array.isArray(data.amenities)?data.amenities.map(String):[];if(amenities.length>8||amenities.some(value=>!allowed.has(value)))return json({error:"invalid_amenities"},400,origin);
    const [{data:videoSigned},{data:posterSigned}]=await Promise.all([admin.storage.from("property-videos").createSignedUrl(videoPath,300),admin.storage.from("property-posters").createSignedUrl(posterPath,300)]);if(!videoSigned?.signedUrl||!posterSigned?.signedUrl)return json({error:"media_not_found"},400,origin);
    const [video]=await Promise.all([inspect(videoSigned.signedUrl,200*1024*1024,"video"),inspect(posterSigned.signedUrl,5*1024*1024,"poster")]);data.video_duration_seconds=video.duration;data.title=title;data.description=description;data.city=city;data.locality=locality;data.contact_phone=phone;data.amenities=amenities;
    const {data:listingId,error}=await admin.rpc("create_validated_listing",{p_owner_id:user.id,p_data:data});if(error)throw error;return json({accepted:true,listing_id:listingId},201,origin);
  }catch(error){const code=error instanceof Error?error.message:"validation_failed";console.error("Listing finalization failed",code);const safe=code.includes("invalid")||code.includes("unavailable")||code.includes("failed")||code.includes("not_found")?code:"listing_submission_failed";return json({error:safe},400,origin)}
});
