import type { Listing } from "./types";

export type DummyListing = Listing & { dummy: true; poster_index: number };

const locations = {
  Bilaspur: ["Koni", "Mangla", "Mopka", "Nehru Nagar", "Rajkishore Nagar", "Sarkanda", "Torwa", "Vyapar Vihar"],
  Raipur: ["Avanti Vihar", "Kamal Vihar", "Khamardih", "Mowa", "Naya Raipur", "Shankar Nagar", "Tatibandh", "Telibandha"],
  Bangalore: ["Electronic City", "HSR Layout", "Indiranagar", "Koramangala", "Marathahalli", "Sarjapur Road", "Whitefield", "Yelahanka"],
} as const;

const propertyTypes = ["Apartment", "Villa", "Independent house", "Plot", "Commercial"] as const;
const titleStarts = ["Sunlit", "Park-facing", "Ready-to-move", "Spacious", "Corner", "Quiet", "Premium", "Well-connected", "Newly finished", "Garden-view"];
const projectNames = ["Aaranya Greens", "Palm County", "Urban Nest", "Lakeview Enclave", "Orchid Heights", "Anandam World City", "Sapphire Residency", "The Courtyard"];
const amenities = [["Covered parking", "Power backup", "Security"], ["Lift", "Gym", "Clubhouse"], ["Garden", "Children's play area", "CCTV"], ["Visitor parking", "Water supply", "Gated community"]];

export const isDummyListing = (listing: Listing): listing is DummyListing =>
  listing.id.startsWith("dummy-");

export const DUMMY_LISTINGS: DummyListing[] = Array.from({ length: 50 }, (_, index) => {
  const city = (Object.keys(locations) as (keyof typeof locations)[])[index % 3];
  const locality = locations[city][Math.floor(index / 3) % locations[city].length];
  const propertyType = propertyTypes[index % propertyTypes.length];
  const purpose = index % 4 === 1 ? "rent" : "sale";
  const bedrooms = propertyType === "Plot" || propertyType === "Commercial" ? undefined : 1 + (index % 4);
  const area = propertyType === "Plot" ? 900 + (index % 8) * 300 : propertyType === "Commercial" ? 450 + (index % 7) * 250 : 650 + (index % 9) * 175;
  const priceRupees = purpose === "rent"
    ? 12000 + (index % 9) * 6500 + (city === "Bangalore" ? 14000 : 0)
    : 2400000 + (index % 11) * 950000 + (city === "Bangalore" ? 4200000 : city === "Raipur" ? 1600000 : 0);
  const noun = propertyType === "Plot" ? "residential plot" : propertyType === "Commercial" ? "commercial space" : `${bedrooms} BHK ${propertyType.toLowerCase()}`;
  return {
    id: `dummy-${String(index + 1).padStart(2, "0")}`,
    dummy: true,
    poster_index: index % 20,
    owner_id: "dummy-owner",
    title: `${titleStarts[index % titleStarts.length]} ${noun} in ${locality}`,
    property_type: propertyType,
    purpose,
    price_minor: priceRupees * 100,
    currency: "INR",
    city,
    locality,
    description: `${propertyType === "Plot" ? "Clearly marked, road-facing plot" : "Thoughtfully planned property with excellent natural light"} in a well-connected part of ${locality}. Close to everyday shopping, schools and major roads; ideal for ${purpose === "rent" ? "comfortable city living" : "end use or long-term investment"}.`,
    contact_preference: "both",
    contact_phone: "",
    status: "published",
    video_path: "",
    created_at: new Date(Date.UTC(2026, 7, 28 - (index % 20))).toISOString(),
    published_at: new Date(Date.UTC(2026, 7, 28 - (index % 20))).toISOString(),
    furnishing_status: propertyType === "Plot" ? undefined : (["unfurnished", "semi_furnished", "fully_furnished"] as const)[index % 3],
    possession_status: index % 6 === 0 ? "under_construction" : "ready_to_move",
    bedrooms,
    bathrooms: bedrooms ? Math.max(1, bedrooms - (index % 2)) : undefined,
    carpet_area_sqft: area,
    builtup_area_sqft: propertyType === "Plot" ? undefined : Math.round(area * 1.18),
    floor_number: propertyType === "Apartment" ? 1 + (index % 12) : undefined,
    total_floors: propertyType === "Apartment" ? 12 + (index % 8) : undefined,
    parking_spaces: propertyType === "Plot" ? undefined : 1 + (index % 2),
    project_name: projectNames[index % projectNames.length],
    posted_by: (["owner", "agent", "builder"] as const)[index % 3],
    amenities: amenities[index % amenities.length],
    view_count: 184 + ((index * 137) % 4700),
  };
});
