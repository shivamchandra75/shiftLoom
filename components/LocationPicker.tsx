import React, { useRef, useState } from "react";
import { View, Text } from "react-native";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { OsmMap } from "@/components/OsmMap";
import { OutlinedInput } from "@/components/ui/outlined-input";
import { SuggestionList } from "@/components/ui/suggestion-list";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { searchPlacesInIndia, PlaceResult } from "@/src/services/geocodeService";
import { isInIndia, parseCoords } from "@/src/lib/validateJobForm";

type Coords = { latitude: number; longitude: number };

interface LocationPickerProps {
  address: string;
  coords: Coords | null;
  addressError?: string;
  coordsError?: string;
  onChange: (patch: { locationAddress?: string; coords?: Coords }) => void;
}

// Centre of India; zoomed out until a location is chosen
const INDIA_VIEW = { latitude: 20.5937, longitude: 78.9629, zoom: 3.5 };
const PIN_ZOOM = 15;

const formatCoords = (c: Coords) => `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;

export function LocationPicker({ address, coords, addressError, coordsError, onChange }: LocationPickerProps) {
  const cameraRef = useRef<CameraRef>(null);
  // The address last chosen from suggestions; while the input still matches it, the list stays closed
  const [pickedAddress, setPickedAddress] = useState(address);
  const [coordsText, setCoordsText] = useState(coords ? formatCoords(coords) : "");
  const [pasteError, setPasteError] = useState("");

  const searching = address.trim() !== pickedAddress.trim();
  const places = useDebouncedSearch(address, searchPlacesInIndia, { minLength: 3, delay: 400, enabled: searching });

  const pin = (c: Coords) => {
    setCoordsText(formatCoords(c));
    setPasteError("");
    cameraRef.current?.easeTo({ center: [c.longitude, c.latitude], zoom: PIN_ZOOM, duration: 400 });
  };

  const selectPlace = (p: PlaceResult) => {
    const c = { latitude: p.latitude, longitude: p.longitude };
    setPickedAddress(p.label);
    onChange({ locationAddress: p.label, coords: c });
    pin(c);
  };

  const applyCoordsText = (text: string) => {
    const c = parseCoords(text);
    if (!c) return setPasteError("Use the format: 19.0760, 72.8777");
    if (!isInIndia(c)) return setPasteError("Coordinates must be in India");
    onChange({ coords: c });
    pin(c);
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <OutlinedInput
          label="Address"
          value={address}
          onChangeText={(locationAddress) => onChange({ locationAddress })}
          placeholder="Start typing, e.g. Bandra Kurla Complex"
          error={addressError}
        />
        {searching && address.trim().length >= 3 && (
          <SuggestionList
            items={places.results}
            loading={places.loading}
            error={places.error}
            icon="map-marker-outline"
            labelOf={(p) => p.label}
            onSelect={selectPlace}
            emptyText={places.loading ? undefined : "No places found in India. Keep typing, or pin it on the map below."}
            footer="Search © OpenStreetMap contributors"
          />
        )}
      </View>

      <OutlinedInput
        label="Or paste coordinates (latitude, longitude)"
        value={coordsText}
        onChangeText={(t) => {
          const pasted = t.length - coordsText.length > 3;
          setCoordsText(t);
          setPasteError("");
          if (pasted) applyCoordsText(t); // typed input is checked on submit instead
        }}
        placeholder="19.0760, 72.8777"
        returnKeyType="done"
        onSubmitEditing={() => coordsText.trim() && applyCoordsText(coordsText)}
        error={pasteError}
      />

      <View className="gap-1">
        <View className={`rounded-2xl overflow-hidden border ${coordsError ? "border-error" : "border-outline"}`}>
          <OsmMap
            cameraRef={cameraRef}
            height={220}
            initial={coords ? { ...coords, zoom: PIN_ZOOM } : INDIA_VIEW}
            pin={coords}
            onPress={(c) => {
              onChange({ coords: c });
              pin(c);
            }}
          />
        </View>
        <Text className={`text-body-small ml-1 ${coordsError ? "text-error" : "text-on-surface-variant"}`}>
          {coordsError ?? (coords ? `Pinned at ${formatCoords(coords)}` : "Pick an address above, paste coordinates, or tap the map")}
        </Text>
      </View>
    </View>
  );
}
