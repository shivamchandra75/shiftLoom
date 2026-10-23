import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera, Map, ViewAnnotation, type CameraRef } from "@maplibre/maplibre-react-native";

// OpenFreeMap: free OpenStreetMap vector tiles, no API key or account
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Coords = { latitude: number; longitude: number };

interface OsmMapProps {
  initial: Coords & { zoom: number };
  pin: Coords | null;
  height: number;
  interactive?: boolean;
  onPress?: (coords: Coords) => void;
  cameraRef?: React.Ref<CameraRef>;
}

export function OsmMap({ initial, pin, height, interactive = true, onPress, cameraRef }: OsmMapProps) {
  return (
    <Map
      style={{ height, width: "100%" }}
      mapStyle={MAP_STYLE}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      onPress={
        onPress &&
        ((e) => {
          const [longitude, latitude] = e.nativeEvent.lngLat;
          onPress({ latitude, longitude });
        })
      }
    >
      <Camera ref={cameraRef} initialViewState={{ center: [initial.longitude, initial.latitude], zoom: initial.zoom }} />
      {pin && (
        <ViewAnnotation lngLat={[pin.longitude, pin.latitude]} anchor="bottom">
          <MaterialCommunityIcons name="map-marker" size={36} color="#B3261E" />
        </ViewAnnotation>
      )}
    </Map>
  );
}
