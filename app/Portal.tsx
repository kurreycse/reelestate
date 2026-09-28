"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Eye,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { recordEngagement } from "../lib/analytics";
import type { Listing, Profile, PropertyEnquiry } from "../lib/types";
import { DUMMY_LISTINGS, isDummyListing } from "../lib/dummyListings";
import { appConfig } from "../lib/config";

type View = "feed" | "post" | "dashboard" | "admin";

const INSTAGRAM_TOKEN_KEY = "reelestate-instagram-access-token";
const INSTAGRAM_ACCOUNT_KEY = "reelestate-instagram-account";

type ImportedReelDetails = {
  title: string;
  purpose: "sale" | "rent";
  price: string;
  city: string;
  locality: string;
  propertyType: string;
  description: string;
};

type ImportedInstagramReel = {
  id: string;
  caption: string;
  media_type: "VIDEO" | "IMAGE" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  permalink?: string;
  username?: string;
  timestamp?: string;
  listingDetails?: ImportedReelDetails;
};

function instagramReelDraftStorageKey() {
  try {
    const account = JSON.parse(localStorage.getItem(INSTAGRAM_ACCOUNT_KEY) || "null") as {
      username?: string;
    } | null;
    const username = account?.username?.toLowerCase() || "connected-account";
    return `reelestate-instagram-reel-drafts:${username}`;
  } catch {
    return "reelestate-instagram-reel-drafts:connected-account";
  }
}

const CITY_LOCALITIES = {
  Raipur: [
    "Avanti Vihar",
    "Kamal Vihar",
    "Khamardih",
    "Mowa",
    "Naya Raipur",
    "Shankar Nagar",
    "Tatibandh",
    "Telibandha",
  ],
  Bilaspur: [
    "Koni",
    "Mangla",
    "Mopka",
    "Nehru Nagar",
    "Rajkishore Nagar",
    "Sarkanda",
    "Torwa",
    "Vyapar Vihar",
  ],
  Bangalore: [
    "Electronic City",
    "HSR Layout",
    "Indiranagar",
    "Koramangala",
    "Marathahalli",
    "Sarjapur Road",
    "Whitefield",
    "Yelahanka",
  ],
} as const;
type SupportedCity = keyof typeof CITY_LOCALITIES;
const money = (minor: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
async function submissionError(error: unknown) {
  let code = "";
  try {
    const context = (error as { context?: Response })?.context;
    if (context)
      code = String(
        ((await context.clone().json()) as { error?: string }).error || "",
      );
  } catch {
    /* invalid error response */
  }
  switch (code) {
    case "authentication_required":
      return "Your login expired. Sign in again, then retry the upload.";
    case "account_inactive":
      return "This account is not permitted to publish properties.";
    case "invalid_listing_details":
      return "Review the property details and required fields, then submit again.";
    case "invalid_amenities":
      return "One or more selected amenities are invalid.";
    case "invalid_media_path":
    case "media_not_found":
      return "The uploaded files could not be found. Please select the video again.";
    case "video_size_invalid":
      return "The video must be no larger than 200 MB.";
    case "video_type_invalid":
    case "video_container_invalid":
      return "Use an MP4 or MOV video file.";
    case "video_codec_invalid":
      return "This video uses an unsupported codec. Convert it to H.264 and try again.";
    case "audio_codec_invalid":
      return "This video's audio must use AAC. Convert it and try again.";
    case "video_duration_invalid":
      return "The video duration could not be determined. Please use another video.";
    case "poster_size_invalid":
    case "poster_type_invalid":
    case "poster_content_invalid":
      return "The video thumbnail could not be validated. Please select the video again.";
    case "video_unavailable":
    case "poster_unavailable":
    case "video_read_failed":
      return "The uploaded video could not be read from storage. Please retry.";
    default:
      return "The property could not be submitted. Please retry; if it continues, use another H.264 MP4 video.";
  }
}
function LoginModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function loginWithFacebook() {
    setBusy(true);
    setError("");
    try {
      if (!isSupabaseConfigured) throw new Error("Authentication is not configured");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: { redirectTo: `${window.location.origin}/auth/facebook`, scopes: "email" },
      });
      if (error) throw error;
    } catch {
      setError("Facebook sign-in could not start. Please try again shortly.");
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-btn close" onClick={onClose} aria-label="Close"><X /></button>
        <div className="brand-mark"><Building2 /></div>
        <span className="eyebrow">Welcome to ReelEstate</span>
        <h2 id="auth-title">Your next move starts here.</h2>
        <p>Sign in or create your account with Facebook.</p>
        <button type="button" className="primary full" disabled={busy || !isSupabaseConfigured} onClick={loginWithFacebook}>
          {busy ? <Loader2 className="spin" /> : <UserRound size={18} />}
          {busy ? "Connecting to Facebook…" : "Continue with Facebook"}
        </button>
        {!isSupabaseConfigured && <p role="alert">Sign-in is temporarily unavailable.</p>}
        {error && <div className="form-error" role="alert"><CircleAlert size={16} />{error}</div>}
        <p className="legal">By continuing, you agree to our <Link href="/terms-conditions">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}

function ProfileModal({ profile, onClose, onSaved }: { profile: Profile; onClose: () => void; onSaved: (profile: Profile) => void }) {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [email, setEmail] = useState(profile.email);
  const [instagram, setInstagram] = useState(profile.instagram_id || "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();setBusy(true);setError("");setSaved(false);
    const { data, error } = await supabase.rpc("update_my_profile", { p_first_name: firstName, p_last_name: lastName, p_email: email, p_instagram_id: instagram || null });
    setBusy(false);
    if (error || !data) { console.warn("Profile update failed", { code: error?.code });setError("Your profile could not be updated. Check the details and try again.");return; }
    onSaved(data as Profile);setEditing(false);setSaved(true);
  }
  return <div className="modal-backdrop" role="presentation"><div className="auth-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
    <button className="icon-btn close" onClick={onClose} aria-label="Close"><X /></button><div className="brand-mark"><UserRound /></div><span className="eyebrow">My account</span><h2 id="profile-title">Profile details</h2>
    <form onSubmit={save}><div className="form-grid two">
      <label>First name<input value={firstName} onChange={(e)=>setFirstName(e.target.value)} disabled={!editing} required maxLength={80}/></label>
      <label>Last name<input value={lastName} onChange={(e)=>setLastName(e.target.value)} disabled={!editing} required maxLength={80}/></label>
    </div><label>Email address<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} disabled={!editing} required maxLength={254}/></label>
    <label>Instagram ID<input value={instagram} onChange={(e)=>setInstagram(e.target.value)} disabled={!editing} placeholder="Not provided" maxLength={31} pattern="@?[A-Za-z0-9._]{1,30}"/></label>
    <label>Verified phone<input value={profile.phone_e164 || "Not available"} disabled/></label><label>Account type<input value={profile.role === "poster" ? "Property user" : profile.role} disabled/></label>
    {error&&<div className="form-error" role="alert"><CircleAlert size={16}/>{error}</div>}{saved&&<div className="form-success" role="status"><Check size={16}/>Profile updated successfully.</div>}
    {editing?<div className="profile-actions"><button type="button" className="back-link" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?<Loader2 className="spin"/>:<Check size={18}/>} Save changes</button></div>:<button type="button" className="primary full" onClick={()=>{setEditing(true);setSaved(false)}}>Edit profile</button>}
    </form></div></div>;
}

function FeedbackModal({ onClose, listing, onUpload }: { onClose: () => void; listing?: Listing; onUpload?: () => void }) {
  const isTestReel=Boolean(listing);const [rating,setRating]=useState(0);const [category,setCategory]=useState(isTestReel?"property_search":"general");const [message,setMessage]=useState("");const [email,setEmail]=useState("");const [mobile,setMobile]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [sent,setSent]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(!rating){setError("Please select a rating.");return}setBusy(true);setError("");const storedMessage=isTestReel?`[Test reel ${listing?.id}: ${listing?.title}] ${message}`:message;const {error}=await supabase.functions.invoke("submit-feedback",{body:{rating,category:isTestReel?"property_search":category,message:storedMessage,email,mobile,website:""}});setBusy(false);if(!error){setSent(true);return}let code="";try{code=String(((await (error as {context?:Response}).context?.clone().json())as{error?:string})?.error||"")}catch{/* invalid error response */}if(code==="rate_limit_exceeded")setError("Too many feedback attempts were made from this connection. Please try again in one hour.");else if(code==="invalid_feedback")setError("Please enter a rating, at least 3 characters of feedback, and a valid email or mobile number if provided.");else if(code==="origin_not_allowed")setError("Feedback is not enabled for this website address.");else setError("Your feedback could not be sent right now. Please try again.")}
  return <div className="modal-backdrop" role="presentation"><div className="auth-modal feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><button className="icon-btn close" onClick={onClose} aria-label="Close"><X/></button><div className="brand-mark"><MessageSquare/></div><span className="eyebrow">{isTestReel?"Test property reel":"Help us improve"}</span><h2 id="feedback-title">{isTestReel?"Did you like this idea?":"Send feedback"}</h2>{sent?<div className="feedback-thanks"><Check/><h3>Thank you!</h3><p>{isTestReel?"Your rating and feedback have been recorded. Upload your own property reels for free.":"Your feedback has been received."}</p>{isTestReel&&onUpload?<button className="primary full" onClick={onUpload}><Plus/> Upload my reel for free</button>:<button className="primary full" onClick={onClose}>Done</button>}</div>:<form onSubmit={submit}>{isTestReel&&<p className="modal-intro">This is a test listing. Please rate the idea and tell us what you liked or what we should improve.</p>}<fieldset className="rating-field"><legend>{isTestReel?"Rate this idea":"How was your experience?"} *</legend><div>{[1,2,3,4,5].map(value=><button type="button" key={value} className={rating===value?"selected":""} onClick={()=>setRating(value)} aria-label={`${value} out of 5`}>{value}</button>)}</div></fieldset>{!isTestReel&&<label>Feedback about<select value={category} onChange={(e)=>setCategory(e.target.value)}><option value="general">General experience</option><option value="property_search">Finding properties</option><option value="posting">Posting a property</option><option value="account">Account or login</option><option value="bug">Something is not working</option></select></label>}<label>{isTestReel?"What did you think?":"Your comments"}<textarea value={message} onChange={(e)=>setMessage(e.target.value)} required minLength={3} maxLength={isTestReel?1800:2000} placeholder={isTestReel?"Tell us what you liked about the idea or what could be better.":"Tell us what worked well or what we can improve."}/></label><label>Email (optional)<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} maxLength={254} placeholder="For a reply from our team"/></label><label>Mobile number (optional)<input value={mobile} onChange={(e)=>setMobile(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} placeholder="For a callback from our team"/></label>{error&&<div className="form-error" role="alert"><CircleAlert size={16}/>{error}</div>}<button className="primary full" disabled={busy}>{busy?<Loader2 className="spin"/>:<Send/>}{busy?"Sending…":"Submit rating & feedback"}</button></form>}</div></div>;
}

function StaffMfaModal({ onVerified }: { onVerified: () => void }) {
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const { data: list } = await supabase.auth.mfa.listFactors();
      const existing = list?.totp.find(
        (factor) => factor.status === "verified",
      );
      if (existing) {
        if (active) setFactorId(existing.id);
      } else {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "ReelEstate admin",
        });
        if (active) {
          if (error) {
            console.warn("MFA enrollment failed", { code: error.code });
            setError(
              "Authenticator setup could not be started. Please try again.",
            );
          } else {
            setFactorId(data.id);
            setQr(data.totp.qr_code);
          }
        }
      }
      if (active) setBusy(false);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);
  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) {
      console.warn("MFA verification failed", { code: error.code });
      setError("The authenticator code is incorrect or expired.");
      setBusy(false);
      return;
    }
    await supabase.auth.refreshSession();
    onVerified();
  }
  return (
    <div className="modal-backdrop">
      <div
        className="auth-modal mfa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mfa-title"
      >
        <div className="brand-mark">
          <ShieldCheck />
        </div>
        <span className="eyebrow">Admin security</span>
        <h2 id="mfa-title">Two-step verification required.</h2>
        {busy && !factorId ? (
          <div className="market-loading">
            <Loader2 className="spin" /> Preparing MFA…
          </div>
        ) : (
          <form onSubmit={verify}>
            {qr && (
              <>
                <p>
                  Scan this QR code with your authenticator app, then enter its
                  six-digit code.
                </p>
                <Image
                  className="mfa-qr"
                  src={qr}
                  width={220}
                  height={220}
                  alt="Authenticator setup QR code"
                  unoptimized
                />
              </>
            )}{" "}
            {!qr && (
              <p>
                Enter the six-digit code from your authenticator app to
                continue.
              </p>
            )}
            <label>
              Authenticator code
              <input
                className="otp"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            {error && (
              <div className="form-error">
                <CircleAlert />
                {error}
              </div>
            )}
            <button
              className="primary full"
              disabled={busy || !factorId || code.length !== 6}
            >
              {busy ? <Loader2 className="spin" /> : <ShieldCheck />} Verify
              administrator
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PropertyTile({
  listing,
  onRequireLogin,
  onDummyAction,
}: {
  listing: Listing;
  onRequireLogin: () => void;
  onDummyAction: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completionSent = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>();
  const [videoBusy, setVideoBusy] = useState(false);
  const toggle = async () => {
    if (isDummyListing(listing)) return;
    const v = videoRef.current;
    if (!v || videoBusy) return;
    if (!videoUrl) {
      setVideoBusy(true);
      const { data } = await supabase.storage
        .from("property-videos")
        .createSignedUrl(listing.video_path, 1800);
      setVideoBusy(false);
      if (!data?.signedUrl) return;
      setVideoUrl(data.signedUrl);
      v.src = data.signedUrl;
    }
    if (v.paused) {
      document.querySelectorAll("video").forEach((other) => {
        if (other !== v) other.pause();
      });
      v.play()
        .then(() => {
          setPlaying(true);
          recordEngagement(listing.id, "play");
        })
        .catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  const share = async () => {
    const url = `${location.origin}/property/${listing.id}`;
    const payload = {
      title: listing.title,
      text: `${listing.title} in ${listing.locality}, ${listing.city}`,
      url,
    };
    if (navigator.share) await navigator.share(payload);
    else await navigator.clipboard.writeText(url);
    recordEngagement(listing.id, "share");
  };
  const contact = listing.contact_phone.replace(/\D/g, "");
  return (
    <article className="property-tile">
      <div className="tile-media">
        {isDummyListing(listing) ? <div
          className="dummy-poster"
          style={{
            backgroundPosition: `${(listing.poster_index % 5) * 25}% ${Math.floor(listing.poster_index / 5) * 33.333}%`,
          }}
          aria-label={`${listing.title} property preview`}
          role="img"
        /> : <video
          ref={videoRef}
          poster={listing.poster_url}
          playsInline
          preload="none"
          loop
          onClick={toggle}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (
              !completionSent.current &&
              video.duration &&
              video.currentTime / video.duration >= 0.9
            ) {
              completionSent.current = true;
              recordEngagement(listing.id, "complete");
            }
          }}
        />}
        <button
          className="tile-play"
          onClick={isDummyListing(listing) ? onDummyAction : toggle}
          disabled={videoBusy}
          aria-label={`${playing ? "Pause" : "Play"} ${listing.title}`}
        >
          {videoBusy ? (
            <Loader2 className="spin" />
          ) : playing ? (
            <Pause />
          ) : (
            <Play fill="currentColor" />
          )}
        </button>
        <span className="video-tag">
          <Video /> Video tour
        </span>
        <span className="reviewed-tag">
          <ShieldCheck /> Reviewed
        </span>
      </div>
      <div className="tile-body">
        <div className="tile-kicker">
          <span>
            {listing.property_type} · For {listing.purpose}
          </span>
          <span className="tile-views">
            <Eye />
            {listing.view_count || 0}
          </span>
          <button onClick={share} aria-label="Share property">
            <Share2 />
          </button>
        </div>
        <h2>{listing.title}</h2>
        <p className="tile-location">
          <MapPin />
          {listing.locality}, {listing.city}
        </p>
        <div className="tile-price">
          {money(listing.price_minor, listing.currency)}
          {listing.purpose === "rent" && <small>/ month</small>}
        </div>
        {(listing.bedrooms != null || listing.carpet_area_sqft) && (
          <div className="tile-facts">
            {listing.bedrooms != null && <span>{listing.bedrooms} BHK</span>}
            {listing.carpet_area_sqft && (
              <span>
                {listing.carpet_area_sqft.toLocaleString("en-IN")} sq.ft.
              </span>
            )}
            {listing.posted_by && <span>By {listing.posted_by}</span>}
          </div>
        )}
        <p className="tile-description">{listing.description}</p>
        {isDummyListing(listing) ? <button className="tile-details" onClick={onDummyAction}>View full details</button> : <a className="tile-details" href={`/property/${listing.id}`} target="_blank" rel="noopener noreferrer">View full details</a>}
        <div className="tile-actions">
          {isDummyListing(listing) ? <>
            <button onClick={onDummyAction}><Phone /> Call</button>
            <button onClick={onDummyAction}><MessageCircle /> WhatsApp</button>
          </> : listing.contact_phone ? (
            <>
              {listing.contact_preference !== "whatsapp" && (
                <a
                  href={`tel:${listing.contact_phone}`}
                  onClick={() => recordEngagement(listing.id, "call")}
                >
                  <Phone /> Call
                </a>
              )}
              {listing.contact_preference !== "call" && (
                <a
                  href={`https://wa.me/${contact}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordEngagement(listing.id, "whatsapp")}
                >
                  <MessageCircle /> WhatsApp
                </a>
              )}
            </>
          ) : (
            <button onClick={onRequireLogin}>
              <MessageCircle /> Get contact
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Marketplace({ onRequireLogin }: { onRequireLogin: () => void }) {
  const PAGE_SIZE = 18;
  const [items, setItems] = useState<Listing[]>(DUMMY_LISTINGS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [purpose, setPurpose] = useState("all");
  const [type, setType] = useState("all");
  const [city, setCity] = useState("all");
  const [locality, setLocality] = useState("all");
  const [budget, setBudget] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [area, setArea] = useState("all");
  const [furnishing, setFurnishing] = useState("all");
  const [postedBy, setPostedBy] = useState("all");
  const [databaseLocalities, setDatabaseLocalities] = useState<string[]>([]);
  const [feedbackListing, setFeedbackListing] = useState<Listing | null>(null);
  const cities = Object.keys(CITY_LOCALITIES) as SupportedCity[];
  const localities = useMemo(
    () =>
      city === "all"
        ? []
        : Array.from(
            new Set([
              ...CITY_LOCALITIES[city as SupportedCity],
              ...databaseLocalities,
            ]),
          ).sort((a, b) => a.localeCompare(b)),
    [databaseLocalities, city],
  );
  const fetchPage = useCallback(
    async (reset: boolean, cursor?: Listing) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setLoadError("");
      const rent = purpose === "rent";
      const minPrice =
        budget === "mid"
          ? rent
            ? 2500000
            : 1000000000
          : budget === "high"
            ? rent
              ? 5000001
              : 3000000001
            : null;
      const maxPrice =
        budget === "low"
          ? rent
            ? 2499999
            : 999999999
          : budget === "mid"
            ? rent
              ? 5000000
              : 3000000000
            : null;
      const minArea = area === "mid" ? 1000 : area === "large" ? 2001 : null;
      const maxArea = area === "small" ? 999 : area === "mid" ? 2000 : null;
      const { data, error } = await supabase.rpc("get_public_feed", {
        p_query: appliedQuery || null,
        p_purpose: purpose === "all" ? null : purpose,
        p_property_type: type === "all" ? null : type,
        p_city: city === "all" ? null : city,
        p_locality: locality === "all" ? null : locality,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_bedrooms: bedrooms === "all" ? null : Number(bedrooms),
        p_min_area: minArea,
        p_max_area: maxArea,
        p_furnishing: furnishing === "all" ? null : furnishing,
        p_possession: null,
        p_posted_by: postedBy === "all" ? null : postedBy,
        p_cursor_published_at: cursor?.published_at || null,
        p_cursor_id: cursor?.id || null,
        p_limit: PAGE_SIZE + 1,
      });
      if (error) {
        setLoadError("Properties could not be loaded. Please try again.");
        if (reset) setItems(DUMMY_LISTINGS);
      } else {
        const rows = (data || []) as Listing[];
        const page = rows.slice(0, PAGE_SIZE);
        const response = page.length
          ? await supabase.rpc("get_public_view_counts", {
              p_listing_ids: page.map((item) => item.id),
            })
          : { data: [] };
        const counts = (response.data || []) as unknown as {
          listing_id: string;
          view_count: number;
        }[];
        const countMap = new Map<string, number>(
          counts.map((row) => [row.listing_id, Number(row.view_count)]),
        );
        const withPosters = await Promise.all(
          page.map(async (item) => ({
            ...item,
            view_count: countMap.get(item.id) || 0,
            poster_url: item.poster_path
              ? (
                  await supabase.storage
                    .from("property-posters")
                    .createSignedUrl(item.poster_path, 3600)
                ).data?.signedUrl
              : undefined,
          })),
        );
        setItems((current) =>
          reset
            ? [...DUMMY_LISTINGS, ...withPosters]
            : [
                ...current,
                ...withPosters.filter(
                  (item) =>
                    !current.some((existing) => existing.id === item.id),
                ),
              ],
        );
        setHasMore(rows.length > PAGE_SIZE);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [
      appliedQuery,
      area,
      bedrooms,
      budget,
      city,
      furnishing,
      locality,
      postedBy,
      purpose,
      type,
    ],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void fetchPage(true), 0);
    return () => window.clearTimeout(timer);
  }, [fetchPage]);
  useEffect(() => {
    if (city === "all") return;
    let active = true;
    supabase.rpc("get_public_localities", { p_city: city }).then(({ data }) => {
      if (active)
        setDatabaseLocalities(
          (data || []).map((row: { locality: string }) => row.locality),
        );
    });
    return () => {
      active = false;
    };
  }, [city]);
  const clear = () => {
    setQuery("");
    setAppliedQuery("");
    setPurpose("all");
    setType("all");
    setCity("all");
    setLocality("all");
    setBudget("all");
    setBedrooms("all");
    setArea("all");
    setFurnishing("all");
    setPostedBy("all");
  };
  const visibleItems = useMemo(() => items.filter((listing) => {
    if (!isDummyListing(listing)) return true;
    const search = appliedQuery.toLowerCase();
    if (search && !`${listing.title} ${listing.city} ${listing.locality} ${listing.property_type}`.toLowerCase().includes(search)) return false;
    if (purpose !== "all" && listing.purpose !== purpose) return false;
    if (type !== "all" && listing.property_type !== type) return false;
    if (city !== "all" && listing.city !== city) return false;
    if (locality !== "all" && listing.locality !== locality) return false;
    if (bedrooms !== "all" && listing.bedrooms !== Number(bedrooms)) return false;
    if (furnishing !== "all" && listing.furnishing_status !== furnishing) return false;
    if (postedBy !== "all" && listing.posted_by !== postedBy) return false;
    const rupees = listing.price_minor / 100;
    if (budget === "low" && rupees >= (listing.purpose === "rent" ? 25000 : 10000000)) return false;
    if (budget === "mid" && (rupees < (listing.purpose === "rent" ? 25000 : 10000000) || rupees > (listing.purpose === "rent" ? 50000 : 30000000))) return false;
    if (budget === "high" && rupees <= (listing.purpose === "rent" ? 50000 : 30000000)) return false;
    const sqft = listing.carpet_area_sqft || 0;
    if (area === "small" && sqft >= 1000) return false;
    if (area === "mid" && (sqft < 1000 || sqft > 2000)) return false;
    if (area === "large" && sqft <= 2000) return false;
    return true;
  }), [items, appliedQuery, purpose, type, city, locality, budget, bedrooms, area, furnishing, postedBy]);
  return (
    <section className="marketplace">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Property discovery, built around video</span>
          <h1>
            Find property by watching,
            <br />
            <em>not scrolling.</em>
          </h1>
          <p>
            ReelEstate is a free, video-first property portal. Owners, agents
            and builders upload short property walkthroughs; buyers and tenants
            search by location and budget, compare clear property details and
            connect directly through calls, WhatsApp or enquiries.
          </p>
        </div>
        <div className="comparison-card"><table><caption>Social media and property portal comparison</caption><thead><tr><th scope="col">Social Media</th><th scope="col">Property Portal</th></tr></thead><tbody>{[["Entertainment algorithm","Location & budget search"],["Catchy captions","Structured property details"],["Visibility fades fast","Listing stays live"],["Paid ads required","Free organic reach"],["Likes & followers","Calls, WhatsApp & enquiries"]].map(([social,portal])=><tr key={social}><td>{social}</td><td><Check/>{portal}</td></tr>)}</tbody></table></div>
      </div>
      <form
        className="search-panel"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQuery(query.trim());
        }}
      >
        <label className="market-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, locality or property name"
          />
        </label>
        <button className="search-button" type="submit">
          Search
        </button>
      </form>
      <div className="filter-row" aria-label="Property filters">
        <span>
          <SlidersHorizontal /> Filters
        </span>
        <select
          value={purpose}
          onChange={(e) => {
            setPurpose(e.target.value);
            setBudget("all");
          }}
          aria-label="Purpose"
        >
          <option value="all">Buy or rent</option>
          <option value="sale">Buy</option>
          <option value="rent">Rent</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Property type"
        >
          <option value="all">Property type</option>
          <option>Apartment</option>
          <option>Villa</option>
          <option>Independent house</option>
          <option>Plot</option>
          <option>Commercial</option>
        </select>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setLocality("all");
          }}
          aria-label="City"
        >
          <option value="all">All cities</option>
          {cities.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          aria-label="Locality"
          disabled={city === "all"}
        >
          <option value="all">
            {city === "all" ? "Select city first" : "All localities"}
          </option>
          {localities.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          aria-label="Budget"
        >
          <option value="all">Any budget</option>
          <option value="low">
            {purpose === "rent" ? "Under ₹25k" : "Under ₹1 Cr"}
          </option>
          <option value="mid">
            {purpose === "rent" ? "₹25k – ₹50k" : "₹1 Cr – ₹3 Cr"}
          </option>
          <option value="high">
            {purpose === "rent" ? "Above ₹50k" : "Above ₹3 Cr"}
          </option>
        </select>
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          aria-label="Bedrooms"
        >
          <option value="all">Any BHK</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} BHK
            </option>
          ))}
        </select>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          aria-label="Area"
        >
          <option value="all">Any area</option>
          <option value="small">Under 1,000 sq.ft.</option>
          <option value="mid">1,000–2,000 sq.ft.</option>
          <option value="large">Above 2,000 sq.ft.</option>
        </select>
        <select
          value={furnishing}
          onChange={(e) => setFurnishing(e.target.value)}
          aria-label="Furnishing"
        >
          <option value="all">Any furnishing</option>
          <option value="unfurnished">Unfurnished</option>
          <option value="semi_furnished">Semi-furnished</option>
          <option value="fully_furnished">Fully furnished</option>
        </select>
        <select
          value={postedBy}
          onChange={(e) => setPostedBy(e.target.value)}
          aria-label="Posted by"
        >
          <option value="all">Posted by anyone</option>
          <option value="owner">Owner</option>
          <option value="agent">Agent</option>
          <option value="builder">Builder</option>
        </select>
        <button className="clear-filters" onClick={clear}>
          Clear all
        </button>
      </div>
      <div className="results-head" id="property-reels">
        <div>
          <span className="eyebrow">Properties for you</span>
          <h2>
            {visibleItems.length} video{" "}
            {visibleItems.length === 1 ? "property" : "properties"} loaded
          </h2>
        </div>
        <span className="newest-label">Newest first</span>
      </div>
      {loading ? (
        <div className="market-loading">
          <Loader2 className="spin" /> Loading properties…
        </div>
      ) : loadError && !visibleItems.length ? (
        <div className="empty-panel">
          <CircleAlert />
          <h2>Unable to load properties</h2>
          <p>{loadError}</p>
          <button className="primary" onClick={() => void fetchPage(true)}>
            Try again
          </button>
        </div>
      ) : visibleItems.length ? (
        <>
          <div className="property-grid">
            {visibleItems.map((x) => (
              <PropertyTile
                key={x.id}
                listing={x}
                onRequireLogin={onRequireLogin}
                onDummyAction={() => setFeedbackListing(x)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="load-more">
              <button
                className="primary"
                disabled={loadingMore}
                onClick={() => void fetchPage(false, items.at(-1))}
              >
                {loadingMore ? <Loader2 className="spin" /> : <ChevronDown />}
                {loadingMore ? "Loading…" : "Load more properties"}
              </button>
            </div>
          )}
          {loadError && <p className="pagination-error">{loadError}</p>}
        </>
      ) : (
        <div className="empty-panel">
          <Search />
          <h2>No homes match these filters</h2>
          <p>Try another locality, property type or budget.</p>
          <button className="primary" onClick={clear}>
            Reset filters
          </button>
        </div>
      )}
      <section className="about-reelestate">
        <span className="eyebrow">About ReelEstate</span>
        <h2>A focused marketplace for people who want to see the property before they visit.</h2>
        <p>ReelEstate is a free property-reel platform where buyers and tenants watch short walkthroughs, compare useful details and connect directly. Owners, agents and builders get a simple way to make every property video searchable and actionable.</p>
      </section>
      {feedbackListing&&<FeedbackModal listing={feedbackListing} onClose={()=>setFeedbackListing(null)} onUpload={()=>{setFeedbackListing(null);onRequireLogin()}}/>}
    </section>
  );
}

function PostForm({
  user,
  onDone,
  initial,
  instagramReel,
  instagramQueuePosition,
  instagramQueueTotal,
  onClearInstagramImport,
}: {
  user: Session["user"];
  onDone: () => void;
  initial?: Listing;
  instagramReel?: ImportedInstagramReel;
  instagramQueuePosition: number;
  instagramQueueTotal: number;
  onClearInstagramImport?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [poster, setPoster] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(
    initial?.video_duration_seconds || 0,
  );
  const [preview, setPreview] = useState(initial?.video_url || "");
  const [purpose, setPurpose] = useState<"sale" | "rent">(
    initial?.purpose || instagramReel?.listingDetails?.purpose || "sale",
  );
  const importedCaption = instagramReel?.caption?.replace(/\s+/g, " ").trim() || "";
  const importedTitle = initial?.title ||
    instagramReel?.listingDetails?.title ||
    (importedCaption ? importedCaption.slice(0, 70) : "Instagram reel property listing");
  const importedDescription = initial?.description ||
    instagramReel?.listingDetails?.description ||
    (importedCaption || "A short property walkthrough imported from Instagram.");
  const [propertyType, setPropertyType] = useState(
    initial?.property_type || instagramReel?.listingDetails?.propertyType || "Apartment",
  );
  const importedCity = initial?.city || instagramReel?.listingDetails?.city;
  const initialCity: SupportedCity =
    importedCity && importedCity in CITY_LOCALITIES
      ? (importedCity as SupportedCity)
      : "Raipur";
  const importedLocality = initial?.locality || instagramReel?.listingDetails?.locality;
  const initialLocality =
    importedLocality && CITY_LOCALITIES[initialCity].includes(importedLocality as never)
      ? importedLocality
      : initial || instagramReel?.listingDetails?.locality
        ? "__custom__"
        : CITY_LOCALITIES.Raipur[0];
  const [propertyCity, setPropertyCity] = useState<SupportedCity>(initialCity);
  const [propertyLocality, setPropertyLocality] =
    useState<string>(initialLocality);

  useEffect(() => {
    if (!instagramReel || initial || video) return;
    let active = true;
    const loadRemoteReel = async () => {
      try {
        const response = await fetch(instagramReel.media_url, { cache: "no-store" });
        if (!response.ok) throw new Error("Instagram reel could not be loaded.");
        const blob = await response.blob();
        const mediaType = blob.type.startsWith("video/") ? "video/mp4" : "image/jpeg";
        const fileName = `${instagramReel.id}.${mediaType.includes("video") ? "mp4" : "jpg"}`;
        const importedFile = new File([blob], fileName, { type: mediaType });
        if (!active) return;
        const objectUrl = URL.createObjectURL(importedFile);
        setVideo(importedFile);
        setPreview(objectUrl);
        setDuration(instagramReel.timestamp ? 15 : 0);
        if (instagramReel.thumbnail_url) {
          const thumbnailResponse = await fetch(instagramReel.thumbnail_url, { cache: "no-store" });
          const thumbnailBlob = await thumbnailResponse.blob();
          if (active) setPoster(thumbnailBlob);
        }
      } catch {
        if (active) setError("This Instagram reel could not be imported. Please try another reel.");
      }
    };
    void loadRemoteReel();
    return () => {
      active = false;
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [instagramReel, initial, video, preview]);

  const select = (file?: File) => {
    if (!file) return;
    setError("");
    setPoster(null);
    if (file.size > 200 * 1024 * 1024) {
      setError("Video must be 200 MB or smaller.");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.playsInline = true;
    probe.onloadedmetadata = () => {
      setDuration(Math.ceil(probe.duration));
      probe.currentTime = Math.min(1, Math.max(0, probe.duration / 3));
    };
    probe.onseeked = () => {
      const canvas = document.createElement("canvas");
      const width = Math.min(720, probe.videoWidth || 720);
      canvas.width = width;
      canvas.height = Math.max(
        1,
        Math.round(
          (width * (probe.videoHeight || 1280)) / (probe.videoWidth || 720),
        ),
      );
      canvas
        .getContext("2d")
        ?.drawImage(probe, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError("We could not create a video thumbnail.");
            return;
          }
          setPoster(blob);
          setVideo(file);
          setPreview(url);
        },
        "image/jpeg",
        0.82,
      );
    };
    probe.onerror = () => {
      setError(
        "We could not read this video. Use an H.264 MP4 or compatible MOV file.",
      );
      URL.revokeObjectURL(url);
    };
    probe.src = url;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if ((!initial && (!video || !poster)) || (video && !poster)) {
      setError(
        "Choose a compatible property video and wait for its thumbnail.",
      );
      return;
    }
    setBusy(true);
    setProgress(12);
    setError("");
    const form = new FormData(e.currentTarget);
    const id = initial?.id || crypto.randomUUID();
    const ext = video?.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = initial?.video_path || `${user.id}/${id}.${ext}`;
    const posterPath = initial?.poster_path || `${user.id}/${id}.jpg`;
    if (video) {
      const upload = await supabase.storage
        .from("property-videos")
        .upload(path, video, {
          contentType: video.type,
          upsert: Boolean(initial),
        });
      if (upload.error) {
        setError("The video could not be uploaded. Please try again.");
        setBusy(false);
        return;
      }
    }
    setProgress(55);
    if (poster) {
      const posterUpload = await supabase.storage
        .from("property-posters")
        .upload(posterPath, poster, {
          contentType: "image/jpeg",
          upsert: Boolean(initial),
        });
      if (posterUpload.error) {
        if (!initial)
          await supabase.storage.from("property-videos").remove([path]);
        setError("The thumbnail could not be uploaded. Please try again.");
        setBusy(false);
        return;
      }
    }
    setProgress(75);
    const amenities = form.getAll("amenities").map(String);
    const payload = {
      id,
      title: form.get("title"),
      property_type: form.get("type"),
      purpose,
      price_minor: Math.round(Number(form.get("price")) * 100),
      city: form.get("city"),
      locality: form.get("locality"),
      description: form.get("description"),
      contact_preference: form.get("contact"),
      contact_phone: form.get("phone"),
      video_path: path,
      poster_path: posterPath,
      video_duration_seconds: duration,
      furnishing_status: form.get("furnishing"),
      ownership_type: purpose === "sale" ? form.get("ownership") : null,
      possession_status: purpose === "sale" ? form.get("possession") : null,
      available_from: purpose === "rent" ? form.get("available_from") : null,
      security_deposit_minor:
        purpose === "rent"
          ? Math.round(Number(form.get("security_deposit")) * 100)
          : null,
      maintenance_minor:
        purpose === "rent"
          ? Math.round(Number(form.get("maintenance") || 0) * 100)
          : null,
      tenant_preference:
        purpose === "rent" ? form.get("tenant_preference") : null,
      bedrooms: Number(form.get("bedrooms") || 0) || null,
      bathrooms: Number(form.get("bathrooms") || 0) || null,
      carpet_area_sqft: Number(form.get("carpet_area") || 0) || null,
      builtup_area_sqft: Number(form.get("builtup_area") || 0) || null,
      property_age_years: Number(form.get("property_age") || 0),
      floor_number: Number(form.get("floor") || 0),
      total_floors: Number(form.get("total_floors") || 0) || null,
      parking_spaces: Number(form.get("parking") || 0),
      facing: form.get("facing") || null,
      project_name: form.get("project_name") || null,
      posted_by: form.get("posted_by"),
      amenities,
      instagram_source_url: instagramReel?.permalink || null,
    };
    const { error } = await supabase.functions.invoke(
      "finalize-property-listing",
      { body: payload },
    );
    if (error) {
      if (!initial)
        await Promise.all([
          supabase.storage.from("property-videos").remove([path]),
          supabase.storage.from("property-posters").remove([posterPath]),
        ]);
      setError(await submissionError(error));
      setBusy(false);
      return;
    }
    setProgress(100);
    setTimeout(onDone, 450);
  }
  return (
    <section className="workspace">
      <header className="section-head">
        <div>
          <span className="eyebrow">
            {initial ? "Correct and resubmit" : "Create a listing"}
          </span>
          <h1>
            {initial ? "Address the feedback," : "Show the space,"}
            <br />
            <em>{initial ? "then send it back." : "not just the specs."}</em>
          </h1>
        </div>
        <div className="review-note">
          <ShieldCheck />
          <span>
            <b>Free to upload</b>
            <small>Every post is reviewed before it goes live.</small>
          </span>
        </div>
      </header>
      <form className="post-layout" onSubmit={submit}>
        <div className="video-uploader">
          {preview ? (
            <video src={preview} controls playsInline />
          ) : (
            <label className="drop">
              <Upload />
              <b>Drop your property video here</b>
              <span>MP4 or MOV · up to 200 MB</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => select(e.target.files?.[0])}
              />
            </label>
          )}
          {preview && (
            <label className="replace">
              Replace video
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => select(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
        <div className="listing-fields">
          <h2>Property details</h2>
          {instagramReel && (
            <div className="instagram-import-banner">
              <span className="eyebrow">Imported from Instagram</span>
              <p>{instagramReel.username || "Instagram reel"}</p>
              {instagramQueueTotal > 1 && (
                <small>Listing {instagramQueuePosition} of {instagramQueueTotal}</small>
              )}
              {onClearInstagramImport && (
                <button type="button" className="back-link" onClick={onClearInstagramImport}>Use another reel</button>
              )}
            </div>
          )}
          <div className="form-grid two">
            <label>
              Listing title
              <input
                name="title"
                defaultValue={importedTitle}
                placeholder="Sunlit 3 BHK with garden view"
                required
                minLength={5}
              />
            </label>
            <label>
              Property type
              <select
                name="type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                required
              >
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Independent house">Independent house</option>
                <option value="Plot">Plot</option>
                <option value="Commercial">Commercial</option>
              </select>
            </label>
            <label>
              Purpose
              <select
                name="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as "sale" | "rent")}
              >
                <option value="sale">For sale</option>
                <option value="rent">For rent</option>
              </select>
            </label>
            <label>
              {purpose === "sale" ? "Total sale price (₹)" : "Monthly rent (₹)"}
              <input
                name="price"
                defaultValue={initial ? initial.price_minor / 100 : instagramReel?.listingDetails?.price || undefined}
                type="number"
                min="1"
                placeholder={purpose === "sale" ? "8500000" : "25000"}
                required
              />
            </label>
            <label>
              Posted by
              <select
                name="posted_by"
                defaultValue={initial?.posted_by || "owner"}
                required
              >
                <option value="owner">Property owner</option>
                <option value="agent">Real-estate agent</option>
                <option value="builder">Builder / developer</option>
              </select>
            </label>
            <label>
              Project / society name
              <input
                name="project_name"
                defaultValue={initial?.project_name}
                maxLength={120}
                placeholder="Optional"
              />
            </label>
            <label>
              City
              <select
                name="city"
                value={propertyCity}
                onChange={(e) => {
                  const next = e.target.value as SupportedCity;
                  setPropertyCity(next);
                  setPropertyLocality(CITY_LOCALITIES[next][0]);
                }}
                required
              >
                {(Object.keys(CITY_LOCALITIES) as SupportedCity[]).map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Locality
              <select
                value={propertyLocality}
                onChange={(e) => setPropertyLocality(e.target.value)}
                required
              >
                {CITY_LOCALITIES[propertyCity].map((value) => (
                  <option key={value}>{value}</option>
                ))}
                <option value="__custom__">Other / Add new locality</option>
              </select>
            </label>
            {propertyLocality === "__custom__" && (
              <label>
                New locality
                <input
                  name="locality"
                  defaultValue={initial?.locality || instagramReel?.listingDetails?.locality}
                  placeholder="Enter locality name"
                  minLength={2}
                  maxLength={150}
                  required
                  autoFocus
                />
              </label>
            )}
            {propertyLocality !== "__custom__" && (
              <input type="hidden" name="locality" value={propertyLocality} />
            )}
            {!["Plot", "Commercial"].includes(propertyType) && (
              <label>
                Bedrooms
                <input
                  name="bedrooms"
                  defaultValue={initial?.bedrooms}
                  type="number"
                  min="0"
                  max="20"
                  placeholder="3"
                />
              </label>
            )}
            {propertyType !== "Plot" && (
              <label>
                Bathrooms
                <input
                  name="bathrooms"
                  defaultValue={initial?.bathrooms}
                  type="number"
                  min="0"
                  max="20"
                  placeholder="2"
                />
              </label>
            )}
            <label>
              {propertyType === "Plot"
                ? "Plot area (sq.ft.)"
                : "Carpet area (sq.ft.)"}
              <input
                name="carpet_area"
                defaultValue={initial?.carpet_area_sqft}
                type="number"
                min="1"
                placeholder="1250"
                required
              />
            </label>
            {propertyType !== "Plot" && (
              <>
                <label>
                  Built-up area (sq.ft.)
                  <input
                    name="builtup_area"
                    defaultValue={initial?.builtup_area_sqft}
                    type="number"
                    min="1"
                    placeholder="1500"
                  />
                </label>
                <label>
                  Property age (years)
                  <input
                    name="property_age"
                    defaultValue={initial?.property_age_years ?? 0}
                    type="number"
                    min="0"
                    max="200"
                  />
                </label>
                <label>
                  Floor number
                  <input
                    name="floor"
                    defaultValue={initial?.floor_number ?? 0}
                    type="number"
                    min="-5"
                    max="200"
                  />
                </label>
                <label>
                  Total floors
                  <input
                    name="total_floors"
                    type="number"
                    min="0"
                    max="200"
                    defaultValue={initial?.total_floors}
                  />
                </label>
                <label>
                  Parking spaces
                  <input
                    name="parking"
                    defaultValue={initial?.parking_spaces ?? 0}
                    type="number"
                    min="0"
                    max="50"
                  />
                </label>
              </>
            )}
            <label>
              Facing
              <select name="facing" defaultValue={initial?.facing || ""}>
                <option value="">Not specified</option>
                {[
                  "north",
                  "north_east",
                  "east",
                  "south_east",
                  "south",
                  "south_west",
                  "west",
                  "north_west",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            {propertyType !== "Plot" && (
              <label>
                Furnishing
                <select
                  name="furnishing"
                  defaultValue={initial?.furnishing_status || "unfurnished"}
                  required
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi-furnished</option>
                  <option value="fully_furnished">Fully furnished</option>
                </select>
              </label>
            )}
            {purpose === "sale" ? (
              <>
                <label>
                  Ownership type
                  <select
                    name="ownership"
                    defaultValue={initial?.ownership_type || "freehold"}
                    required
                  >
                    <option value="freehold">Freehold</option>
                    <option value="leasehold">Leasehold</option>
                    <option value="power_of_attorney">Power of attorney</option>
                    <option value="cooperative_society">
                      Co-operative society
                    </option>
                  </select>
                </label>
                <label>
                  Possession status
                  <select
                    name="possession"
                    defaultValue={initial?.possession_status || "ready_to_move"}
                    required
                  >
                    <option value="ready_to_move">Ready to move</option>
                    <option value="under_construction">
                      Under construction
                    </option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  Security deposit (₹)
                  <input
                    name="security_deposit"
                    defaultValue={
                      initial?.security_deposit_minor != null
                        ? initial.security_deposit_minor / 100
                        : undefined
                    }
                    type="number"
                    min="0"
                    placeholder="50000"
                    required
                  />
                </label>
                <label>
                  Available from
                  <input
                    name="available_from"
                    type="date"
                    defaultValue={initial?.available_from}
                    required
                  />
                </label>
                <label>
                  Monthly maintenance (₹)
                  <input
                    name="maintenance"
                    defaultValue={
                      initial?.maintenance_minor != null
                        ? initial.maintenance_minor / 100
                        : 0
                    }
                    type="number"
                    min="0"
                  />
                </label>
                {!["Plot", "Commercial"].includes(propertyType) && (
                  <label>
                    Preferred tenant
                    <select
                      name="tenant_preference"
                      defaultValue={initial?.tenant_preference || "any"}
                      required
                    >
                      <option value="any">Any</option>
                      <option value="family">Family</option>
                      <option value="bachelor">Bachelor</option>
                      <option value="company">Company lease</option>
                    </select>
                  </label>
                )}
              </>
            )}
          </div>
          {propertyType !== "Plot" && (
            <fieldset className="amenities">
              <legend>Amenities</legend>
              {[
                "Lift",
                "Parking",
                "Power backup",
                "Security",
                "Gym",
                "Swimming pool",
                "Garden",
                "Clubhouse",
              ].map((value) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    name="amenities"
                    value={value}
                    defaultChecked={initial?.amenities?.includes(value)}
                  />
                  {value}
                </label>
              ))}
            </fieldset>
          )}
          <label>
            Description
            <textarea
              name="description"
              defaultValue={initial?.description || importedDescription}
              placeholder="What makes this property special? Mention the layout, light, amenities and surroundings."
              minLength={20}
              maxLength={2000}
              required
            />
          </label>
          <div className="form-grid two">
            <label>
              Contact number
              <input
                name="phone"
                defaultValue={initial?.contact_phone || user.phone || "+91 "}
                required
              />
            </label>
            <label>
              Preferred contact
              <select
                name="contact"
                defaultValue={initial?.contact_preference || "both"}
              >
                <option value="both">Call or WhatsApp</option>
                <option value="call">Call only</option>
                <option value="whatsapp">WhatsApp only</option>
              </select>
            </label>
          </div>
          {error && (
            <div className="form-error">
              <CircleAlert size={16} />
              {error}
            </div>
          )}
          {busy && (
            <div className="progress">
              <i style={{ width: `${progress}%` }} />
            </div>
          )}
          <button className="primary submit" disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <Send />}{" "}
            {busy
              ? "Uploading…"
              : initial
                ? "Resubmit for review"
                : instagramReel
                  ? "Save to database and submit for review"
                  : "Submit for review"}
          </button>
        </div>
      </form>
    </section>
  );
}

function EnquiryInbox({
  items,
  onChanged,
}: {
  items: PropertyEnquiry[];
  onChanged: () => void;
}) {
  async function setStatus(id: string, status: PropertyEnquiry["status"]) {
    const { error } = await supabase
      .from("property_enquiries")
      .update({ status })
      .eq("id", id);
    if (!error) onChanged();
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this enquiry and its contact details?")) return;
    const { error } = await supabase
      .from("property_enquiries")
      .delete()
      .eq("id", id);
    if (!error) onChanged();
  }
  return (
    <section className="enquiry-inbox">
      <div className="results-head">
        <div>
          <span className="eyebrow">Buyer and tenant leads</span>
          <h2>{items.length} enquiries</h2>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-panel">
          <MessageCircle />
          <h2>No enquiries yet</h2>
          <p>
            New enquiries from your published property pages will appear here.
          </p>
        </div>
      ) : (
        <div className="enquiry-list">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <span className={`status ${item.status}`}>{item.status}</span>
                <h3>{item.name}</h3>
                <p>
                  <b>{item.listing?.title || "Property enquiry"}</b> ·{" "}
                  {item.listing?.locality}, {item.listing?.city}
                </p>
                <p>{item.message || "No message provided."}</p>
                {item.preferred_visit_date && (
                  <small>
                    Preferred visit:{" "}
                    {new Date(
                      `${item.preferred_visit_date}T00:00:00`,
                    ).toLocaleDateString("en-IN")}
                  </small>
                )}
              </div>
              <div className="enquiry-actions">
                <a href={`tel:${item.phone_e164}`}>
                  <Phone /> {item.phone_e164}
                </a>
                {item.email && (
                  <a href={`mailto:${item.email}`}>
                    <Send /> Email
                  </a>
                )}
                <select
                  value={item.status}
                  onChange={(event) =>
                    void setStatus(
                      item.id,
                      event.target.value as PropertyEnquiry["status"],
                    )
                  }
                  aria-label={`Status for ${item.name}`}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                  <option value="spam">Spam</option>
                </select>
                <button
                  className="delete-enquiry"
                  onClick={() => void remove(item.id)}
                >
                  <Trash2 /> Delete contact
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function InstagramReelPicker({
  onClose,
  onUseReels,
  connected,
}: {
  onClose: () => void;
  onUseReels: (reels: ImportedInstagramReel[]) => void;
  connected: boolean;
}) {
  const [reels, setReels] = useState<ImportedInstagramReel[]>([]);
  const [selectedReelIds, setSelectedReelIds] = useState<string[]>([]);
  const [reelDetails, setReelDetails] = useState<Record<string, ImportedReelDetails>>({});
  const [expandedReelIds, setExpandedReelIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(connected);
  const [error, setError] = useState("");

  const fetchReels = useCallback(async () => {
    const token = localStorage.getItem(INSTAGRAM_TOKEN_KEY);
    if (!token) return;
    try {
      const response = await fetch("/api/instagram/reels", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Unable to fetch your reels.");
      const json = (await response.json()) as { data?: ImportedInstagramReel[] };
      const next = (json.data || []).map((item) => {
        const mediaUrl = item.media_url || item.thumbnail_url || "";
        return {
          id: item.id,
          caption: item.caption || "Imported from Instagram",
          media_type: item.media_type || "VIDEO",
          media_url: mediaUrl,
          thumbnail_url: item.thumbnail_url || mediaUrl,
          permalink: item.permalink,
          username: item.username,
          timestamp: item.timestamp,
        };
      });
      let savedDetails: Record<string, ImportedReelDetails> = {};
      try {
        savedDetails = JSON.parse(
          localStorage.getItem(instagramReelDraftStorageKey()) || "{}",
        ) as Record<string, ImportedReelDetails>;
      } catch {
        localStorage.removeItem(instagramReelDraftStorageKey());
      }
      setReels(next);
      setSelectedReelIds([]);
      setExpandedReelIds([]);
      const detailsByReel = Object.fromEntries(next.map((reel) => {
        const caption = reel.caption.replace(/\s+/g, " ").trim();
        const defaults: ImportedReelDetails = {
          title: caption.slice(0, 70).length >= 5 ? caption.slice(0, 70) : "Instagram property reel",
          purpose: "sale",
          price: "",
          city: "Raipur",
          locality: CITY_LOCALITIES.Raipur[0],
          propertyType: "Apartment",
          description: reel.caption.length >= 20
            ? reel.caption.slice(0, 2000)
            : `${reel.caption} Property walkthrough imported from Instagram.`.slice(0, 2000),
        };
        return [reel.id, { ...defaults, ...savedDetails[reel.id] }];
      }));
      setReelDetails(detailsByReel);
      localStorage.setItem(instagramReelDraftStorageKey(), JSON.stringify(detailsByReel));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Your reels could not be loaded right now.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (connected && localStorage.getItem(INSTAGRAM_TOKEN_KEY)) {
      void Promise.resolve().then(fetchReels);
    }
  }, [connected, fetchReels]);

  function connect() {
    setBusy(true);
    setError("");
    setReels([]);
    setSelectedReelIds([]);
    if (localStorage.getItem(INSTAGRAM_TOKEN_KEY)) {
      void fetchReels();
      return;
    }

    const clientId = appConfig.instagram.clientId;
    const redirectUri = appConfig.instagram.redirectUri;
    const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(appConfig.instagram.scope)}`;
    window.location.assign(authUrl);
  }

  const selectedReels = reels
    .filter((reel) => selectedReelIds.includes(reel.id))
    .map((reel) => ({ ...reel, listingDetails: reelDetails[reel.id] }));

  function updateReelDetails(id: string, changes: Partial<ImportedReelDetails>) {
    const next = {
      ...reelDetails,
      [id]: { ...reelDetails[id], ...changes },
    };
    setReelDetails(next);
    try {
      localStorage.setItem(instagramReelDraftStorageKey(), JSON.stringify(next));
    } catch {
      setError("This browser could not save the reel details draft.");
    }
  }

  function toggleDetails(id: string) {
    setExpandedReelIds((current) =>
      current.includes(id)
        ? current.filter((reelId) => reelId !== id)
        : [...current, id],
    );
  }

  function continueWithSelected() {
    const incomplete = selectedReels.some(({ listingDetails }) =>
      !listingDetails ||
      listingDetails.title.trim().length < 5 ||
      !Number.isFinite(Number(listingDetails.price)) ||
      Number(listingDetails.price) <= 0 ||
      listingDetails.city.trim().length < 2 ||
      listingDetails.locality.trim().length < 2 ||
      listingDetails.description.trim().length < 20,
    );
    if (!selectedReels.length) return;
    if (incomplete) {
      setError("Complete the title, price, city, locality, and 20-character description for every selected reel.");
      return;
    }
    setError("");
    onUseReels(selectedReels);
  }

  return (
    <section className="instagram-inline" aria-labelledby="instagram-title">
      <div className="instagram-inline-heading">
        <div>
          <span className="eyebrow">Instagram</span>
        <h2 id="instagram-title">{connected ? "Your reels" : "Connect your reels"}</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close reel list"><X /></button>
      </div>
        <p className="modal-intro">
          {connected
            ? "We only read your reel metadata and media URLs so you can choose one to import. We never post to Instagram automatically."
            : "Pick a reel, save it to your draft, then publish it like any other property post."}
        </p>
        {!connected && (
          <button className="primary full" disabled={busy} onClick={() => void connect()}>
            {busy ? <Loader2 className="spin" /> : <Video />}
            {busy ? "Loading reels…" : "Connect Instagram"}
          </button>
        )}
        {connected && (
          <button className="secondary full" disabled={busy} onClick={() => void connect()}>
            {busy ? <Loader2 className="spin" /> : <Video />}
            {busy ? "Loading reels…" : "Fetch reels"}
          </button>
        )}
        {error && <div className="form-error"><CircleAlert size={16} />{error}</div>}
        {!busy && !error && connected && reels.length === 0 && (
          <p className="instagram-empty">No Instagram reels were found for this account.</p>
        )}
        {reels.length > 0 && (
          <>
            <div className="instagram-reel-grid">
              {reels.map((reel) => {
                const details = reelDetails[reel.id];
                return (
                  <article className="instagram-reel-card" key={reel.id}>
                    <label className="instagram-reel-select">
                      <input
                        type="checkbox"
                        checked={selectedReelIds.includes(reel.id)}
                        onChange={(event) =>
                          setSelectedReelIds((current) =>
                            event.target.checked
                              ? [...current, reel.id]
                              : current.filter((id) => id !== reel.id),
                          )
                        }
                        aria-label={`Select reel: ${reel.caption || "Instagram reel"}`}
                      />
                      Include this reel
                    </label>
                    {reel.media_url ? (
                      <video
                        className="instagram-reel-player"
                        controls
                        playsInline
                        preload="none"
                        poster={reel.thumbnail_url}
                        aria-label={`Play reel: ${reel.caption || "Instagram reel"}`}
                      >
                        <source src={reel.media_url} />
                      </video>
                    ) : (
                      <div className="instagram-reel-player instagram-reel-placeholder"><Video size={22} /></div>
                    )}
                    <p className="instagram-reel-caption">{reel.caption || "Instagram reel"}</p>
                    {details && (
                      <>
                        <button
                          type="button"
                          className="instagram-details-toggle"
                          aria-expanded={expandedReelIds.includes(reel.id)}
                          onClick={() => toggleDetails(reel.id)}
                        >
                          {expandedReelIds.includes(reel.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {expandedReelIds.includes(reel.id) ? "Hide property details" : "Add property details"}
                        </button>
                        {expandedReelIds.includes(reel.id) && (
                      <div className="instagram-reel-details">
                        <small className="instagram-draft-status">Draft auto-saved on this device. It is not added to the database until submission.</small>
                        <label>Listing title<input value={details.title} maxLength={120} minLength={5} onChange={(event) => updateReelDetails(reel.id, { title: event.target.value })} /></label>
                        <div className="form-grid two">
                          <label>Purpose<select value={details.purpose} onChange={(event) => updateReelDetails(reel.id, { purpose: event.target.value as "sale" | "rent" })}><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
                          <label>{details.purpose === "sale" ? "Sale price (INR)" : "Monthly rent (INR)"}<input type="number" min="1" value={details.price} onChange={(event) => updateReelDetails(reel.id, { price: event.target.value })} placeholder={details.purpose === "sale" ? "8500000" : "25000"} /></label>
                        </div>
                        <div className="form-grid two">
                          <label>Property type<select value={details.propertyType} onChange={(event) => updateReelDetails(reel.id, { propertyType: event.target.value })}><option>Apartment</option><option>Villa</option><option>Independent house</option><option>Plot</option><option>Commercial</option></select></label>
                          <label>City<select value={details.city} onChange={(event) => updateReelDetails(reel.id, { city: event.target.value, locality: CITY_LOCALITIES[event.target.value as SupportedCity][0] })}>{(Object.keys(CITY_LOCALITIES) as SupportedCity[]).map((city) => <option key={city}>{city}</option>)}</select></label>
                        </div>
                        <label>Locality<input value={details.locality} maxLength={150} onChange={(event) => updateReelDetails(reel.id, { locality: event.target.value })} placeholder="Area or locality" /></label>
                        <label>Description<textarea value={details.description} minLength={20} maxLength={2000} onChange={(event) => updateReelDetails(reel.id, { description: event.target.value })} rows={3} /></label>
                      </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
            <button
              type="button"
              className="primary full"
              disabled={!selectedReels.length || busy}
              onClick={continueWithSelected}
            >
              Continue with {selectedReels.length || "selected"} reels
            </button>
          </>
        )}
    </section>
  );
}

function Dashboard({
  items,
  enquiries,
  onPost,
  onEdit,
  onRefresh,
  onImportReels,
}: {
  items: Listing[];
  enquiries: PropertyEnquiry[];
  onPost: () => void;
  onEdit: (listing: Listing) => void;
  onRefresh: () => void;
  onImportReels: (reels: ImportedInstagramReel[]) => void;
}) {
  const [instagramOpen, setInstagramOpen] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramAccount, setInstagramAccount] = useState<{
    username: string;
    profilePictureUrl?: string;
  } | null>(null);

  const syncInstagramStatus = () => {
    const connected = Boolean(localStorage.getItem(INSTAGRAM_TOKEN_KEY));
    setInstagramConnected(connected);
    try {
      const stored = localStorage.getItem(INSTAGRAM_ACCOUNT_KEY);
      setInstagramAccount(stored ? JSON.parse(stored) : null);
    } catch {
      setInstagramAccount(null);
    }
  };

  useEffect(() => {
    syncInstagramStatus();
    window.addEventListener("storage", syncInstagramStatus);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "instagram-connected") {
        const profile = {
          username: event.data.username || "instagram_user",
          profilePictureUrl: event.data.profilePictureUrl || "",
        };
        localStorage.setItem(INSTAGRAM_ACCOUNT_KEY, JSON.stringify(profile));
        setInstagramAccount(profile);
        setInstagramConnected(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("storage", syncInstagramStatus);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const disconnectInstagram = () => {
    if (!window.confirm("Disconnect Instagram and remove the saved reel access?")) return;
    localStorage.removeItem(INSTAGRAM_TOKEN_KEY);
    localStorage.removeItem(INSTAGRAM_ACCOUNT_KEY);
    localStorage.removeItem("reelestate-instagram-reels");
    syncInstagramStatus();
    setInstagramOpen(false);
  };

  return (
    <section className="workspace">
      <header className="section-head compact">
        <div>
          <span className="eyebrow">Your portfolio</span>
          <h1>My property posts</h1>
          <p>Track every draft, review and live listing in one place.</p>
        </div>
        <div className="dashboard-actions">
          {instagramConnected && instagramAccount && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.75)",
                boxShadow: "0 2px 6px rgba(12, 16, 36, 0.04)",
              }}
            >
              {instagramAccount.profilePictureUrl ? (
                <img
                  src={instagramAccount.profilePictureUrl}
                  alt={instagramAccount.username}
                  style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    background: "linear-gradient(135deg, #f58529, #dd2a7b)",
                  }}
                >
                  {instagramAccount.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: "#2a2d3a" }}>
                @{instagramAccount.username}
              </span>
            </div>
          )}
          <button className="secondary" onClick={() => setInstagramOpen(true)}>
            <Video /> {instagramConnected ? "Fetch reels" : "Connect Instagram"}
          </button>
          {instagramConnected && (
            <button className="secondary" onClick={disconnectInstagram}>
              <X /> Disconnect Instagram
            </button>
          )}
          <button className="primary" onClick={onPost}>
            <Plus /> Post a free listing
          </button>
        </div>
      </header>
      {instagramOpen && (
        <InstagramReelPicker
          onClose={() => setInstagramOpen(false)}
          connected={instagramConnected}
          onUseReels={(reels) => {
            setInstagramOpen(false);
            onImportReels(reels);
          }}
        />
      )}
      <div className="stats">
        <div>
          <span>All posts</span>
          <b>{items.length}</b>
        </div>
        <div>
          <span>Live</span>
          <b>{items.filter((x) => x.status === "published").length}</b>
        </div>
        <div>
          <span>In review</span>
          <b>{items.filter((x) => x.status === "pending_review").length}</b>
        </div>
        <div>
          <span>Needs attention</span>
          <b>{items.filter((x) => x.status === "rejected").length}</b>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-panel">
          <Video />
          <h2>Your first walkthrough awaits.</h2>
          <p>
            Post a short property video for free and we’ll review it before it
            reaches buyers and tenants.
          </p>
          <button className="primary" onClick={onPost}>
            Create free listing
          </button>
        </div>
      ) : (
        <div className="listing-list">
          {items.map((x) => (
            <article key={x.id}>
              <div className="thumb">
                {x.poster_url ? (
                  <Image
                    src={x.poster_url}
                    alt=""
                    width={110}
                    height={90}
                    unoptimized
                  />
                ) : (
                  <Building2 />
                )}
              </div>
              <div className="listing-main">
                <span className={`status ${x.status}`}>
                  {x.status.replace("_", " ")}
                </span>
                <h3>{x.title}</h3>
                <p>
                  <MapPin /> {x.locality}, {x.city} ·{" "}
                  {money(x.price_minor, x.currency)}
                </p>
                {x.rejection_note && (
                  <div className="reject-note">
                    <CircleAlert />
                    {x.rejection_note}
                  </div>
                )}
              </div>
              <div className="listing-meta">
                <b className="listing-views">
                  <Eye /> {(x.view_count || 0).toLocaleString("en-IN")} views
                </b>
                <small>
                  {new Date(x.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </small>
                {x.status === "rejected" ? (
                  <button className="primary" onClick={() => onEdit(x)}>
                    Edit &amp; resubmit
                  </button>
                ) : (
                  <MoreHorizontal />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <EnquiryInbox items={enquiries} onChanged={onRefresh} />
    </section>
  );
}

function Admin({
  items,
  analyticsItems,
  onDecision,
}: {
  items: Listing[];
  analyticsItems: Listing[];
  onDecision: () => void;
}) {
  const [selected, setSelected] = useState<Listing | null>(items[0] || null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function decide(decision: "approve" | "reject") {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("moderate-listing", {
      body: {
        listing_id: selected.id,
        decision,
        note: note || null,
      },
    });
    setBusy(false);
    if (!error) {
      setSelected(null);
      setNote("");
      onDecision();
    }
  }
  return (
    <section className="workspace admin">
      <header className="section-head compact">
        <div>
          <span className="eyebrow">Moderation desk</span>
          <h1>Review queue</h1>
          <p>Make every live listing useful, safe and trustworthy.</p>
        </div>
        <div className="queue-count">
          <Clock3 />
          {items.length} awaiting review
        </div>
      </header>
      <section className="engagement-overview">
        <div className="results-head">
          <div>
            <span className="eyebrow">Property performance</span>
            <h2>Engagement totals</h2>
          </div>
        </div>
        <div className="engagement-table">
          <div className="engagement-row heading">
            <span>Property</span>
            <span>Views</span>
            <span>Completed</span>
            <span>Shares</span>
            <span>Calls</span>
            <span>WhatsApp</span>
          </div>
          {analyticsItems.map((x) => (
            <div className="engagement-row" key={x.id}>
              <span>
                <b>{x.title}</b>
                <small>{x.status.replace("_", " ")}</small>
              </span>
              <span>{x.view_count || 0}</span>
              <span>{x.completion_count || 0}</span>
              <span>{x.share_count || 0}</span>
              <span>{x.call_count || 0}</span>
              <span>{x.whatsapp_count || 0}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="admin-grid">
        <div className="queue">
          <div className="queue-tools">
            <label>
              <Search />
              <input placeholder="Search listings" />
            </label>
          </div>
          {items.map((x) => (
            <button
              key={x.id}
              className={selected?.id === x.id ? "selected" : ""}
              onClick={() => setSelected(x)}
            >
              <span className="queue-thumb">
                <Video />
              </span>
              <span>
                <b>{x.title}</b>
                <small>
                  {x.locality}, {x.city}
                </small>
                <em>{money(x.price_minor, x.currency)}</em>
              </span>
              <ChevronUp />
            </button>
          ))}
        </div>
        <div className="review-pane">
          {!selected ? (
            <div className="empty-panel">
              <ShieldCheck />
              <h2>Queue clear</h2>
              <p>Select a pending listing to review its video and details.</p>
            </div>
          ) : (
            <>
              <div className="review-video">
                <video src={selected.video_url} controls playsInline />
              </div>
              <div className="review-content">
                <span className="property-pill">
                  {selected.property_type} · {selected.purpose}
                </span>
                <h2>{selected.title}</h2>
                <p className="location">
                  <MapPin />
                  {selected.locality}, {selected.city}
                </p>
                <div className="price">
                  {money(selected.price_minor, selected.currency)}
                </div>
                <p>{selected.description}</p>
                <label>
                  Rejection note (required when rejecting)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tell the poster exactly what needs to be corrected."
                  />
                </label>
                <div className="decision-row">
                  <button
                    className="reject"
                    disabled={busy || !note.trim()}
                    onClick={() => decide("reject")}
                  >
                    <X /> Reject
                  </button>
                  <button
                    className="approve"
                    disabled={busy}
                    onClick={() => decide("approve")}
                  >
                    {busy ? <Loader2 className="spin" /> : <Check />} Approve &
                    publish
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Portal() {
  const [view, setView] = useState<View>("feed");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [login, setLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mine, setMine] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [queue, setQueue] = useState<Listing[]>([]);
  const [analyticsItems, setAnalyticsItems] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [instagramImportQueue, setInstagramImportQueue] = useState<ImportedInstagramReel[]>([]);
  const [instagramQueueTotal, setInstagramQueueTotal] = useState(0);
  const load = useCallback(async () => {
    if (session?.user) {
      const [{ data: own }, { data: p }, { data: leadData }] =
        await Promise.all([
          supabase.rpc("get_my_listings"),
          supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("property_enquiries")
            .select("*")
            .eq("owner_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
      const ownListings = (own || []) as Listing[];
      const listingMap = new Map(ownListings.map((item) => [item.id, item]));
      setMine(ownListings);
      setEnquiries(
        ((leadData || []) as PropertyEnquiry[]).map((lead) => ({
          ...lead,
          listing: listingMap.get(lead.listing_id),
        })),
      );
      setProfile(p as Profile | null);
      if (p && ["moderator", "admin"].includes(p.role)) {
        const [{ data: pending }, { data: performance }] = await Promise.all([
          supabase.rpc("get_staff_review_queue"),
          supabase.rpc("get_staff_listing_performance"),
        ]);
        const signed = await Promise.all(
          (pending || []).map(async (x: Listing) => ({
            ...x,
            video_url: (
              await supabase.storage
                .from("property-videos")
                .createSignedUrl(x.video_path, 3600)
            ).data?.signedUrl,
          })),
        );
        setQueue(signed);
        setAnalyticsItems((performance || []) as unknown as Listing[]);
      }
    } else {
      setMine([]);
      setEnquiries([]);
      setQueue([]);
      setAnalyticsItems([]);
      setProfile(null);
    }
  }, [session]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setView("feed");
        setMenu(false);
        setProfile(null);
        setMine([]);
        setEnquiries([]);
        setQueue([]);
        setAnalyticsItems([]);
      }
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const onInstagramConnected = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "instagram-connected") {
        setView("dashboard");
        setMenu(false);
      }
    };
    window.addEventListener("message", onInstagramConnected);
    return () => window.removeEventListener("message", onInstagramConnected);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("instagram") !== "connected") return;
    window.history.replaceState(null, "", url.pathname);
    void Promise.resolve().then(() => setView("dashboard"));
  }, []);
  useEffect(() => {
    const stop = () =>
      document.querySelectorAll("video").forEach((v) => v.pause());
    document.addEventListener("visibilitychange", stop);
    return () => document.removeEventListener("visibilitychange", stop);
  }, []);
  function guarded(next: View) {
    if (!session) {
      setLogin(true);
      return;
    }
    setView(next);
    setMenu(false);
  }
  async function logout() {
    setView("feed");
    setMenu(false);
    setShowProfile(false);
    setProfile(null);
    setMine([]);
    setEnquiries([]);
    setQueue([]);
    setAnalyticsItems([]);
    setSession(null);
    await supabase.auth.signOut();
  }
  async function editRejected(listing: Listing) {
    const [video, poster] = await Promise.all([
      supabase.storage
        .from("property-videos")
        .createSignedUrl(listing.video_path, 1800),
      listing.poster_path
        ? supabase.storage
            .from("property-posters")
            .createSignedUrl(listing.poster_path, 1800)
        : Promise.resolve({ data: null }),
    ]);
    setEditing({
      ...listing,
      video_url: video.data?.signedUrl,
      poster_url: poster.data?.signedUrl,
    });
    setView("post");
  }
  const isStaff = Boolean(
    session && profile && ["moderator", "admin"].includes(profile.role),
  );
  const nav = [
    { id: "feed" as View, label: "Discover", icon: Home },
    { id: "post" as View, label: "Post for free", icon: Plus },
    { id: "dashboard" as View, label: "My posts", icon: Video },
  ];
  if (isStaff) nav.push({ id: "admin", label: "Review", icon: ShieldCheck });
  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="logo" onClick={() => setView("feed")}>
          <span>
            <Building2 />
          </span>
          <b>
            Reel<span>Estate</span>
          </b>
        </button>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() =>
                n.id === "feed" ? setView("feed") : guarded(n.id)
              }
            >
              <n.icon />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="account">
          <button className="feedback-button" onClick={() => setShowFeedback(true)}><MessageSquare /> Feedback</button>
          {session ? (
            <>
              <button className="user-chip" onClick={() => setMenu(!menu)}>
                <span>{profile?.first_name?.[0] || <UserRound />}</span>
                <b>{profile?.first_name || "My account"}</b>
                <ChevronDown />
              </button>
              {menu && (
                <div className="account-menu">
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setMenu(false);
                    }}
                  >
                    <UserRound /> My profile
                  </button>
                  <button onClick={() => guarded("dashboard")}>
                    <UserRound /> My posts
                  </button>
                  <button onClick={() => void logout()}>
                    <LogOut /> Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            authReady && (
              <button className="sign-in" onClick={() => setLogin(true)}>
                Sign in
              </button>
            )
          )}
          <button
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
          >
            <Menu />
          </button>
        </div>
      </header>
      {!isSupabaseConfigured && (
        <div className="config-banner">
          Connect Supabase to activate accounts and listings.
        </div>
      )}
      {view === "feed" ? (
        <Marketplace onRequireLogin={() => setLogin(true)} />
      ) : view === "post" && session ? (
        <PostForm
          key={editing?.id || instagramImportQueue[0]?.id || "new"}
          user={session.user}
          initial={editing || undefined}
          instagramReel={instagramImportQueue[0]}
          instagramQueuePosition={instagramQueueTotal - instagramImportQueue.length + 1}
          instagramQueueTotal={instagramQueueTotal}
          onClearInstagramImport={() => {
            setInstagramImportQueue([]);
            setInstagramQueueTotal(0);
          }}
          onDone={() => {
            load();
            setEditing(null);
            if (!editing && instagramImportQueue[0]) {
              try {
                const draftKey = instagramReelDraftStorageKey();
                const saved = JSON.parse(localStorage.getItem(draftKey) || "{}") as Record<string, ImportedReelDetails>;
                delete saved[instagramImportQueue[0].id];
                localStorage.setItem(draftKey, JSON.stringify(saved));
              } catch {
                /* Listing is already saved; a stale local draft is harmless. */
              }
            }
            if (!editing && instagramImportQueue.length > 1) {
              setInstagramImportQueue((current) => current.slice(1));
              setView("post");
            } else {
              setInstagramImportQueue([]);
              setInstagramQueueTotal(0);
              setView("dashboard");
            }
          }}
        />
      ) : view === "dashboard" && session ? (
        <Dashboard
          items={mine}
          enquiries={enquiries}
          onPost={() => {
            setEditing(null);
            setInstagramImportQueue([]);
            setInstagramQueueTotal(0);
            guarded("post");
          }}
          onEdit={(listing) => void editRejected(listing)}
          onRefresh={() => void load()}
          onImportReels={(reels) => {
            setInstagramImportQueue(reels);
            setInstagramQueueTotal(reels.length);
            setEditing(null);
            setView("post");
          }}
        />
      ) : view === "admin" && isStaff ? (
        <Admin
          items={queue}
          analyticsItems={analyticsItems}
          onDecision={load}
        />
      ) : (
        <Marketplace onRequireLogin={() => setLogin(true)} />
      )}
      <nav className="bottom-nav">
        {nav.map((n) => (
          <button
            key={n.id}
            className={view === n.id ? "active" : ""}
            onClick={() => (n.id === "feed" ? setView("feed") : guarded(n.id))}
          >
            <n.icon />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {login && <LoginModal onClose={() => setLogin(false)} />}
      {showProfile && profile && (
        <ProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={setProfile}
        />
      )}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </main>
  );
}
