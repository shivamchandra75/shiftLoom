import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { CameraRef } from "@maplibre/maplibre-react-native";
import { OsmMap } from "@/components/OsmMap";
import { Text } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { isInIndia, parseCoords } from "@/src/lib/validateJobForm";

type Coords = { latitude: number; longitude: number };

// Centre of India; zoomed out until a location is chosen
const INDIA_VIEW = { latitude: 20.5937, longitude: 78.9629, zoom: 3.5 };
const PIN_ZOOM = 15;

export const formatCoords = (c: Coords) => `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`;

// Location picker (Figma 254:2905): step 1 of Post a shift. Address search (above) fills the pin,
// coordinates can be pasted, and tapping the map moves the pin.
export function LocationPicker({ coords, error, onChange }: { coords: Coords | null; error?: string; onChange: (c: Coords) => void }) {
  const cameraRef = useRef<CameraRef>(null);
  const [pasteError, setPasteError] = useState("");
  const problem = error || pasteError;
  const lat = coords?.latitude;
  const lng = coords?.longitude;

  useEffect(() => {
    if (lat != null && lng != null) cameraRef.current?.easeTo({ center: [lng, lat], zoom: PIN_ZOOM, duration: 400 });
  }, [lat, lng]);

  const paste = async () => {
    try {
      // Loaded on demand: importing expo-clipboard throws in a build made before it was added, which would break this whole screen
      const Clipboard = await import("expo-clipboard");
      const c = parseCoords(await Clipboard.getStringAsync());
      if (!c) return setPasteError("The clipboard has no coordinates like 19.0760, 72.8777");
      if (!isInIndia(c)) return setPasteError("Coordinates must be in India");
      setPasteError("");
      onChange(c);
    } catch {
      setPasteError("Paste isn't available in this app build yet. Rebuild the app, or tap the map instead.");
    }
  };

  return (
    <View className="gap-2">
      <Text variant="title-small" color={problem ? "error" : "on-surface-variant"}>Pin on map</Text>
      <View className={`overflow-hidden rounded-lg bg-surface ${problem ? "border-2 border-error" : "border border-outline"}`}>
        <View>
          <OsmMap
            cameraRef={cameraRef}
            height={168}
            initial={coords ? { ...coords, zoom: PIN_ZOOM } : INDIA_VIEW}
            pin={coords}
            onPress={(c) => {
              setPasteError("");
              onChange(c);
            }}
          />
          {!coords && (
            <View pointerEvents="none" className="absolute inset-x-0 bottom-3 items-center">
              <View className="flex-row items-center gap-2 rounded-full bg-surface px-3 py-1.5">
                <Icon name="pin_drop" size={18} />
                <Text variant="body-medium" color="on-surface-variant">Tap the map to drop a pin</Text>
              </View>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2 py-1 pl-4 pr-1">
          <Text variant="body-medium" color="on-surface-variant" className="flex-1">{coords ? formatCoords(coords) : "No pin yet"}</Text>
          <Button variant="text" leadingIcon="content_paste" label="Paste" onPress={paste} accessibilityLabel="Paste coordinates from the clipboard" />
        </View>
      </View>
      {problem ? (
        <View className="flex-row items-center gap-1 px-1">
          <Icon name="error" size={16} color="error" />
          <Text variant="body-small" color="error" className="flex-1">{problem}</Text>
        </View>
      ) : (
        <Text variant="body-small" color="on-surface-variant" className="px-1">
          {coords ? "Tap the map to move the pin" : "Search the address above, paste coordinates or tap the map"}
        </Text>
      )}
    </View>
  );
}
