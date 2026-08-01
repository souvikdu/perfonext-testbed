export interface TrailSegment {
  id: string;
  lengthKm: number;
  gainM: number;
  surface: string;
  grade: number;
  exposure: number;
  notes: string;
}

export interface TrailReview {
  rating: number;
  words: number;
  body: string;
}

export interface Trail {
  id: number;
  slug: string;
  name: string;
  region: string;
  difficulty: string;
  lengthKm: number;
  elevationGainM: number;
  lat: number;
  lon: number;
  permitRequired: boolean;
  dogsAllowed: boolean;
  features: string[];
  segments: TrailSegment[];
  reviews: TrailReview[];
  description: string;
}

export declare const REGIONS: string[];
export declare const DIFFICULTIES: string[];
export declare const FEATURES: string[];

export declare function generateTrails(count?: number, seed?: number): Trail[];
export declare function generateTrailPage(count?: number, seed?: number): Trail[];
export declare function findTrailBySlug(slug: string, count?: number, seed?: number): Trail | null;
