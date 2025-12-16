export interface BoundingBox {
  x: number; // 0-1 relative coordinates
  y: number; // 0-1 relative coordinates
  width: number; // 0-1 relative coordinates
  height: number; // 0-1 relative coordinates
  label?: string;
}

export type PatientSex = 'Male' | 'Female';

export interface PatientInfo {
  name?: string;
  sex: PatientSex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  examDate: string;
}

export interface HeightRange {
  min: number;
  max: number;
}

export interface GrowthPoint {
  age: number;
  height: number;
}

export interface AnalysisResult {
  id: string;
  finding: string;
  probability: number;
  severity: 'Low' | 'Medium' | 'High';
  boundingBoxes: BoundingBox[];
  analysisDate: string;
  modality: string;
  patientId: string; // Mocked
  summary?: string;
  predictedAdultHeightCm?: number;
  predictedHeightRangeCm?: HeightRange;
  boneAgeEstimate?: { years: number; months: number };
  osteoAgeScore?: number;
  growthCurve?: GrowthPoint[];
  mocked?: boolean;
  mockReason?: string;
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  type: 'image';
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
}
