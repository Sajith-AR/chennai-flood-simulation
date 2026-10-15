/**
 * Chennai Sentinel — Geospatial API & Map Tile Configuration Manager
 * Supports: Mapbox, MapTiler, Stadia Maps, OpenWeatherMap, Google Maps, OpenRouteService
 * Gracefully falls back to high-resolution CartoDB & Esri basemaps if no API key is provided.
 */

export interface MapApiKeys {
  mapboxToken: string;
  maptilerKey: string;
  stadiaKey: string;
  openweatherKey: string;
  googleMapsKey: string;
  orsKey: string;
}

export interface BasemapTileSpec {
  id: string;
  provider: 'mapbox' | 'maptiler' | 'stadia' | 'cartodb' | 'esri' | 'osm';
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
  maxNativeZoom?: number;
  requiresKey: boolean;
  isConnected: boolean;
}

const STORAGE_KEY = 'chennai_sentinel_map_api_keys';

export function getInitialMapApiKeys(): MapApiKeys {
  if (typeof window === 'undefined') {
    return {
      mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
      maptilerKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '',
      stadiaKey: process.env.NEXT_PUBLIC_STADIA_API_KEY || '',
      openweatherKey: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '',
      googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      orsKey: process.env.NEXT_PUBLIC_ORS_API_KEY || '',
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      mapboxToken: parsed.mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
      maptilerKey: parsed.maptilerKey || process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '',
      stadiaKey: parsed.stadiaKey || process.env.NEXT_PUBLIC_STADIA_API_KEY || '',
      openweatherKey: parsed.openweatherKey || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '',
      googleMapsKey: parsed.googleMapsKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      orsKey: parsed.orsKey || process.env.NEXT_PUBLIC_ORS_API_KEY || '',
    };
  } catch {
    return {
      mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
      maptilerKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '',
      stadiaKey: process.env.NEXT_PUBLIC_STADIA_API_KEY || '',
      openweatherKey: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '',
      googleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      orsKey: process.env.NEXT_PUBLIC_ORS_API_KEY || '',
    };
  }
}

export function saveMapApiKeys(keys: MapApiKeys): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      // Dispatch custom event so components update live
      window.dispatchEvent(new CustomEvent('sentinel-map-keys-updated', { detail: keys }));
    } catch (e) {
      console.warn('Failed to save map keys to localStorage', e);
    }
  }
}

export function getResolvedBasemapSpec(
  type: 'dark' | 'satellite' | 'streets',
  keys?: MapApiKeys
): BasemapTileSpec {
  const activeKeys = keys || getInitialMapApiKeys();

  // 1. Mapbox Priority (if valid Mapbox Token provided)
  if (activeKeys.mapboxToken && activeKeys.mapboxToken.trim().length > 10) {
    const token = activeKeys.mapboxToken.trim();
    if (type === 'dark') {
      return {
        id: 'mapbox-dark',
        provider: 'mapbox',
        name: 'Mapbox Dark v11 (Ultra-Res)',
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${token}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        maxZoom: 22,
        maxNativeZoom: 19,
        requiresKey: true,
        isConnected: true,
      };
    }
    if (type === 'satellite') {
      return {
        id: 'mapbox-satellite',
        provider: 'mapbox',
        name: 'Mapbox Satellite Streets v12',
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; Maxar',
        maxZoom: 22,
        maxNativeZoom: 19,
        requiresKey: true,
        isConnected: true,
      };
    }
    if (type === 'streets') {
      return {
        id: 'mapbox-streets',
        provider: 'mapbox',
        name: 'Mapbox Streets v12',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${token}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        maxZoom: 22,
        maxNativeZoom: 19,
        requiresKey: true,
        isConnected: true,
      };
    }
  }

  // 2. MapTiler Priority (if valid MapTiler Key provided)
  if (activeKeys.maptilerKey && activeKeys.maptilerKey.trim().length > 8) {
    const key = activeKeys.maptilerKey.trim();
    if (type === 'dark') {
      return {
        id: 'maptiler-dark',
        provider: 'maptiler',
        name: 'MapTiler Dataviz Dark',
        url: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${key}`,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap',
        maxZoom: 20,
        maxNativeZoom: 19,
        requiresKey: true,
        isConnected: true,
      };
    }
    if (type === 'satellite') {
      return {
        id: 'maptiler-satellite',
        provider: 'maptiler',
        name: 'MapTiler Satellite Hybrid',
        url: `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${key}`,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; Maxar',
        maxZoom: 20,
        maxNativeZoom: 18,
        requiresKey: true,
        isConnected: true,
      };
    }
    if (type === 'streets') {
      return {
        id: 'maptiler-streets',
        provider: 'maptiler',
        name: 'MapTiler Streets v2',
        url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap',
        maxZoom: 20,
        maxNativeZoom: 19,
        requiresKey: true,
        isConnected: true,
      };
    }
  }

  // 3. Stadia Maps (if valid Stadia Key provided)
  if (activeKeys.stadiaKey && activeKeys.stadiaKey.trim().length > 8 && type === 'dark') {
    const key = activeKeys.stadiaKey.trim();
    return {
      id: 'stadia-dark',
      provider: 'stadia',
      name: 'Stadia Alidade Smooth Dark',
      url: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${key}`,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
      maxZoom: 20,
      maxNativeZoom: 19,
      requiresKey: true,
      isConnected: true,
    };
  }

  // 4. Default High-Resolution Unauthenticated Standby Basemaps (Guaranteed zero-failure)
  if (type === 'satellite') {
    return {
      id: 'esri-satellite',
      provider: 'esri',
      name: 'Esri World Ortho Imagery (Standby)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
      subdomains: '',
      maxZoom: 20,
      maxNativeZoom: 18,
      requiresKey: false,
      isConnected: true,
    };
  }

  if (type === 'streets') {
    return {
      id: 'cartodb-voyager',
      provider: 'cartodb',
      name: 'CartoDB Voyager Vector (Standby)',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
      maxNativeZoom: 19,
      requiresKey: false,
      isConnected: true,
    };
  }

  // Default: CartoDB Dark Matter
  return {
    id: 'cartodb-dark',
    provider: 'cartodb',
    name: 'CartoDB Dark Matter (Sentinel High-Res Standby)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    maxNativeZoom: 19,
    requiresKey: false,
    isConnected: true,
  };
}

export function getOpenWeatherOverlayUrl(keys?: MapApiKeys): string | null {
  const activeKeys = keys || getInitialMapApiKeys();
  if (activeKeys.openweatherKey && activeKeys.openweatherKey.trim().length > 10) {
    return `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${activeKeys.openweatherKey.trim()}`;
  }
  return null;
}
