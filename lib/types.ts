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
  bedrooms?: number;
  bathrooms?: number;
  carpet_area_sqft?: number;
  builtup_area_sqft?: number;
  property_age_years?: number;
  floor_number?: number;
  total_floors?: number;
  parking_spaces?: number;
  facing?: "north" | "north_east" | "east" | "south_east" | "south" | "south_west" | "west" | "north_west";
  project_name?: string;
  posted_by?: "owner" | "agent" | "builder";
  amenities?: string[];
  view_count?: number;
  completion_count?: number;
  share_count?: number;
  call_count?: number;
  whatsapp_count?: number;
}

export interface PropertyEnquiry {
  id: string;
  listing_id: string;
  owner_id: string;
  name: string;
  phone_e164: string;
  email?: string;
  message: string;
  preferred_visit_date?: string;
  status: "new" | "contacted" | "closed" | "spam";
  created_at: string;
  listing?: Pick<Listing, "title" | "locality" | "city">;
}
