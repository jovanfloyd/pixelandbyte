/**
 * Rubik's Cube interactive data types
 */

export type FaceName = 'front' | 'back' | 'up' | 'down' | 'right' | 'left';

export interface StickerConfig {
  id: string; // e.g. "front-0-0"
  face: FaceName;
  row: number; // 0, 1, 2
  col: number; // 0, 1, 2
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl: string;
  colorFilter?: string; // Optional hex color override (defaults to face color)
  filterOpacity?: number; // 0.0 to 1.0 (defaults to 0.40)
}

export interface FaceMeta {
  name: FaceName;
  label: string;
  color: string; // hex
  normal: [number, number, number];
  description: string;
}

export interface CubeConfig {
  version: number;
  faceColors: Record<FaceName, string>;
  filterOpacity: number;
  stickers: Record<string, StickerConfig>;
  adminPasswordHash?: string;
}

export type MoveType = 
  | 'U' | "U'" | 'D' | "D'"
  | 'L' | "L'" | 'R' | "R'"
  | 'F' | "F'" | 'B' | "B'"
  | 'M' | "M'" | 'E' | "E'" | 'S' | "S'";

export interface MoveStep {
  axis: 'x' | 'y' | 'z';
  layer: number; // -1, 0, 1
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  name: MoveType;
}

export type ThemeMode = 'dark' | 'light';
