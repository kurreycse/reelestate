export type ListingStatus = "draft" | "uploading" | "pending_review" | "approved" | "rejected" | "published" | "archived";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164?: string;
  role: "poster" | "moderator" | "admin";
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  property_type: string;
  purpose: "sale" | "rent";
  price_minor: number;
  currency: string;
  city: string;
  locality: string;
  description: string;
  contact_preference: "call" | "whatsapp" | "both";
  contact_phone: string;
  status: ListingStatus;
  video_path: string;
  poster_path?: string;
  rejection_category?: string;
  rejection_note?: string;
  published_at?: string;
  created_at: string;
  owner?: Pick<Profile, "first_name" | "last_name">;
  video_url?: string;
  poster_url?: string;
  furnishing_status?: "unfurnished" | "semi_furnished" | "fully_furnished";
  ownership_type?: "freehold" | "leasehold" | "power_of_attorney" | "cooperative_society";
  possession_status?: "ready_to_move" | "under_construction";
  available_from?: string;
  security_deposit_minor?: number;
  maintenance_minor?: number;
  tenant_preference?: "any" | "family" | "bachelor" | "company";
}
