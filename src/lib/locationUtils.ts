// src/lib/locationUtils.ts

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ModenaBase {
  id: string;
  name: string;
  coords: Coordinate;
}

// Coordenadas aproximadas de las bases operativas
export const MODENA_BASES: ModenaBase[] = [
  { id: "baires", name: "Helipuerto Baires Núñez", coords: { lat: -34.5422, lng: -58.4239 } },
  { id: "dontorcuato", name: "Helipuerto Modena Don Torcuato", coords: { lat: -34.4828, lng: -58.6183 } },
  { id: "rosario", name: "Helipuerto UTV Rosario", coords: { lat: -32.9066, lng: -60.7811 } },
  { id: "neuquen", name: "Helipuerto Neuquén", coords: { lat: -38.9516, lng: -68.0591 } },
  { id: "sierragrande", name: "Helipuerto Sierra Grande", coords: { lat: -41.6060, lng: -65.3557 } },
  { id: "cabovirgenes", name: "Base BRM Cabo Vírgenes", coords: { lat: -52.3333, lng: -68.3500 } }
];

// Fórmula de Haversine para calcular distancia en km entre dos puntos
export function haversineDistance(coords1: Coordinate, coords2: Coordinate): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLng = (coords2.lng - coords1.lng) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Encuentra la base más cercana a unas coordenadas dadas
export function getClosestBase(userLocation: Coordinate): ModenaBase {
  let closestBase = MODENA_BASES[0];
  let minDistance = Infinity;

  for (const base of MODENA_BASES) {
    const distance = haversineDistance(userLocation, base.coords);
    if (distance < minDistance) {
      minDistance = distance;
      closestBase = base;
    }
  }

  return closestBase;
}
