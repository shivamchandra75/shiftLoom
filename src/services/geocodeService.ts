export interface PlaceResult {
  label: string;
  latitude: number;
  longitude: number;
}

// Photon (komoot): free OpenStreetMap geocoder, no API key, built for search-as-you-type.
// Fair use only: callers debounce and cache. https://photon.komoot.io
const INDIA_BBOX = "68,6,97.5,37.5";

export async function searchPlacesInIndia(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q: query, limit: "8", lang: "en", bbox: INDIA_BBOX });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error(res.status === 429 ? "Too many searches, wait a moment." : `Address search failed (${res.status}).`);

  const data: { features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[] } = await res.json();
  return data.features
    .filter((f) => f.properties.countrycode === "IN") // bbox also covers parts of neighbouring countries
    .slice(0, 5)
    .map(({ geometry, properties: p }) => ({
      label: [p.name, p.street && [p.housenumber, p.street].filter(Boolean).join(" "), p.locality ?? p.district, p.city, p.state, p.postcode]
        .filter((part, i, all) => part && all.indexOf(part) === i)
        .join(", "),
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
    }));
}
