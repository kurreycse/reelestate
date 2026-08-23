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
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Eye,
  HeartHandshake,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
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

type View = "feed" | "post" | "dashboard" | "admin";
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
function safeAuthError(code?: string) {
  switch (code) {
    case "otp_expired":
      return "The verification code has expired. Request a new code.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit":
      return "Too many attempts. Please wait before trying again.";
    case "invalid_credentials":
      return "The verification code is incorrect or expired.";
    default:
      return "Authentication could not be completed. Please try again.";
  }
}
const OTP_SEND_LIMIT = 5;
const OTP_WINDOW_MS = 30 * 60 * 1000;
const OTP_ATTEMPTS_KEY = "reelestate-otp-send-attempts";
function recentOtpAttempts(now = Date.now()) {
  try {
    const stored = JSON.parse(localStorage.getItem(OTP_ATTEMPTS_KEY) || "[]");
    return Array.isArray(stored)
      ? stored.filter(
          (value): value is number =>
            typeof value === "number" && value > now - OTP_WINDOW_MS,
        )
      : [];
  } catch {
    return [];
  }
}
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
  const [mode, setMode] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const phoneDigits = phone.replace(/\D/g, "");
  const normalized =
    phoneDigits.length === 10 ? `+91${phoneDigits}` : `+${phoneDigits}`;
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(
      () => setResendIn((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendIn]);
  async function requestOtp() {
    const now = Date.now();
    const attempts = recentOtpAttempts(now);
    if (attempts.length >= OTP_SEND_LIMIT) {
      const wait = Math.max(
        1,
        Math.ceil((attempts[0] + OTP_WINDOW_MS - now) / 1000),
      );
      setResendIn(wait);
      setError(
        `Five OTP requests are allowed every 30 minutes. Try again in ${Math.ceil(wait / 60)} minute(s).`,
      );
      return false;
    }
    const updatedAttempts = [...attempts, now];
    localStorage.setItem(OTP_ATTEMPTS_KEY, JSON.stringify(updatedAttempts));
    setBusy(true);
    setError("");
    const { error } = await supabase.functions.invoke("request-phone-otp", {
      body: { phone: normalized },
    });
    setBusy(false);
    if (error) {
      console.warn("OTP request failed");
      let rateLimited = false;
      try {
        rateLimited =
          (
            (await (error as { context?: Response }).context
              ?.clone()
              .json()) as {
              error?: string;
            }
          )?.error === "otp_rate_limited";
      } catch {
        /* invalid provider response */
      }
      if (rateLimited) {
        setResendIn(30 * 60);
        setError(
          "Five OTP requests are allowed every 30 minutes. Please try again later.",
        );
      } else
        setError("The verification code could not be sent. Please try again.");
      return false;
    }
    setOtp("");
    setResendIn(
      updatedAttempts.length >= OTP_SEND_LIMIT
        ? Math.ceil((updatedAttempts[0] + OTP_WINDOW_MS - now) / 1000)
        : 30,
    );
    return true;
  }
  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    if (await requestOtp()) setMode("otp");
  }
  async function resendOtp() {
    await requestOtp();
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: "sms",
    });
    if (error) {
      console.warn("OTP verification failed", { code: error.code });
      setError(safeAuthError(error.code));
      setBusy(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user?.id)
      .maybeSingle();
    setBusy(false);
    if (profile) onClose();
    else setMode("profile");
  }
  async function finish(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("complete_phone_registration", {
      p_first_name: first,
      p_last_name: last,
      p_email: email,
      p_instagram_id: instagram || null,
    });
    setBusy(false);
    if (error) {
      console.warn("Profile creation failed", { code: error.code });
      setError("Your profile could not be created. Please try again.");
    } else onClose();
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button className="icon-btn close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="brand-mark">
          <Building2 />
        </div>
        <span className="eyebrow">Welcome to ReelEstate</span>
        <h2 id="auth-title">
          {mode === "profile"
            ? "Tell us about you"
            : "Your next move starts here."}
        </h2>
        {mode === "phone" && (
          <form onSubmit={sendOtp}>
            <label>
              Mobile number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                required
                aria-describedby="phone-help"
              />
            </label>
            <small id="phone-help">
              Indian 10-digit numbers automatically receive the +91 country
              code.
            </small>
            <button
              className="primary full"
              disabled={busy || phoneDigits.length < 10}
            >
              {busy ? <Loader2 className="spin" /> : <Send size={18} />} Send
              OTP
            </button>
          </form>
        )}
        {mode === "otp" && (
          <form onSubmit={verify}>
            <button
              type="button"
              className="back-link"
              onClick={() => setMode("phone")}
            >
              <ArrowLeft size={15} /> Change number
            </button>
            <label>
              6-digit verification code
              <input
                className="otp"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            <small>Sent to {phone}</small>
            <button
              className="primary full"
              disabled={busy || otp.length !== 6}
            >
              {busy ? <Loader2 className="spin" /> : <Check size={18} />} Verify
              & continue
            </button>
            <button
              type="button"
              className="back-link resend-otp"
              disabled={busy || resendIn > 0}
              onClick={resendOtp}
            >
              {resendIn >= 60
                ? `Retry in ${Math.ceil(resendIn / 60)} min`
                : resendIn > 0
                  ? `Resend OTP in ${resendIn}s`
                  : "Resend OTP"}
            </button>
          </form>
        )}
        {mode === "profile" && (
          <form onSubmit={finish}>
            <div className="form-grid two">
              <label>
                First name
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  required
                />
              </label>
              <label>
                Last name
                <input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Instagram ID (optional)
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourhandle"
                autoComplete="off"
                maxLength={31}
                pattern="@?[A-Za-z0-9._]{1,30}"
              />
            </label>
            <small>
              Your email is used for account communication and does not need
              verification.
            </small>
            <button className="primary full" disabled={busy}>
              {busy ? <Loader2 className="spin" /> : <Check size={18} />}{" "}
              Complete registration
            </button>
          </form>
        )}
        {error && (
          <div className="form-error">
            <CircleAlert size={16} />
            {error}
          </div>
        )}
        <p className="legal">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
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
}: {
  listing: Listing;
  onRequireLogin: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completionSent = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>();
  const [videoBusy, setVideoBusy] = useState(false);
  const toggle = async () => {
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
        <video
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
        />
        <button
          className="tile-play"
          onClick={toggle}
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
        <a
          className="tile-details"
          href={`/property/${listing.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View full details
        </a>
        <div className="tile-actions">
          {listing.contact_phone ? (
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
  const [items, setItems] = useState<Listing[]>([]);
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
      if (error)
        setLoadError("Properties could not be loaded. Please try again.");
      else {
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
            ? withPosters
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
  return (
    <section className="marketplace">
      <div className="market-hero">
        <div>
          <span className="eyebrow">Reviewed video properties</span>
          <h1>
            Find a home you can
            <br />
            <em>see yourself in.</em>
          </h1>
          <p>
            Browse short, verified walkthroughs from owners and agents across
            India.
          </p>
        </div>
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
      <div className="results-head">
        <div>
          <span className="eyebrow">Properties for you</span>
          <h2>
            {items.length} video{" "}
            {items.length === 1 ? "property" : "properties"} loaded
          </h2>
        </div>
        <span className="newest-label">Newest first</span>
      </div>
      {loading ? (
        <div className="market-loading">
          <Loader2 className="spin" /> Loading properties…
        </div>
      ) : loadError && !items.length ? (
        <div className="empty-panel">
          <CircleAlert />
          <h2>Unable to load properties</h2>
          <p>{loadError}</p>
          <button className="primary" onClick={() => void fetchPage(true)}>
            Try again
          </button>
        </div>
      ) : items.length ? (
        <>
          <div className="property-grid">
            {items.map((x) => (
              <PropertyTile
                key={x.id}
                listing={x}
                onRequireLogin={onRequireLogin}
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
      <div className="market-note">
        <ShieldCheck />
        <div>
          <b>Every live listing is reviewed.</b>
          <span>
            Videos and property details are checked before appearing in search.
          </span>
        </div>
        <HeartHandshake />
        <div>
          <b>Connect directly.</b>
          <span>
            No long lead forms—call or message when a property feels right.
          </span>
        </div>
      </div>
    </section>
  );
}

function PostForm({
  user,
  onDone,
  initial,
}: {
  user: Session["user"];
  onDone: () => void;
  initial?: Listing;
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
    initial?.purpose || "sale",
  );
  const [propertyType, setPropertyType] = useState(
    initial?.property_type || "Apartment",
  );
  const initialCity = initial?.city === "Bangalore" ? "Bangalore" : "Raipur";
  const initialLocality =
    initial && CITY_LOCALITIES[initialCity].includes(initial.locality as never)
      ? initial.locality
      : initial
        ? "__custom__"
        : CITY_LOCALITIES.Raipur[0];
  const [propertyCity, setPropertyCity] = useState<SupportedCity>(initialCity);
  const [propertyLocality, setPropertyLocality] =
    useState<string>(initialLocality);
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
            <b>Every post is reviewed</b>
            <small>Nothing goes live without approval.</small>
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
          <div className="form-grid two">
            <label>
              Listing title
              <input
                name="title"
                defaultValue={initial?.title}
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
                defaultValue={initial ? initial.price_minor / 100 : undefined}
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
                  defaultValue={initial?.locality}
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
              defaultValue={initial?.description}
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

function Dashboard({
  items,
  enquiries,
  onPost,
  onEdit,
  onRefresh,
}: {
  items: Listing[];
  enquiries: PropertyEnquiry[];
  onPost: () => void;
  onEdit: (listing: Listing) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="workspace">
      <header className="section-head compact">
        <div>
          <span className="eyebrow">Your portfolio</span>
          <h1>My property posts</h1>
          <p>Track every draft, review and live listing in one place.</p>
        </div>
        <button className="primary" onClick={onPost}>
          <Plus /> New listing
        </button>
      </header>
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
            Post a short property video and we’ll review it before it reaches
            buyers and tenants.
          </p>
          <button className="primary" onClick={onPost}>
            Create listing
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
  const [menu, setMenu] = useState(false);
  const [mine, setMine] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<PropertyEnquiry[]>([]);
  const [queue, setQueue] = useState<Listing[]>([]);
  const [analyticsItems, setAnalyticsItems] = useState<Listing[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
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
    { id: "post" as View, label: "Post", icon: Plus },
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
          {authReady && !session && (
            <a
              className="interest-compact"
              href="https://forms.gle/F5cyGACRooUkjys89"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Plus /> List your property free
            </a>
          )}
          {session ? (
            <>
              <button className="user-chip" onClick={() => setMenu(!menu)}>
                <span>{profile?.first_name?.[0] || <UserRound />}</span>
                <b>{profile?.first_name || "My account"}</b>
                <ChevronDown />
              </button>
              {menu && (
                <div className="account-menu">
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
          key={editing?.id || "new"}
          user={session.user}
          initial={editing || undefined}
          onDone={() => {
            load();
            setEditing(null);
            setView("dashboard");
          }}
        />
      ) : view === "dashboard" && session ? (
        <Dashboard
          items={mine}
          enquiries={enquiries}
          onPost={() => {
            setEditing(null);
            guarded("post");
          }}
          onEdit={(listing) => void editRejected(listing)}
          onRefresh={load}
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
    </main>
  );
}
