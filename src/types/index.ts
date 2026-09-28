export type UrgencyLevel = "low" | "medium" | "high" | "crisis";

export type Category =
  | "mental_health"
  | "academic_stress"
  | "financial"
  | "housing"
  | "crisis"
  | "physical_health"
  | "social_isolation"
  | "general";

export interface MatchedKeyword {
  word: string;
  weight: number;
  category: Category;
}

export interface ScoringResult {
  score: number;
  urgencyLevel: UrgencyLevel;
  primaryCategory: Category;
  matchedKeywords: MatchedKeyword[];
  isCrisis: boolean;
}

export interface Department {
  id: string;
  name: string;
  shortName: string;
  description: string;
  contact: string;
  typicalWait: string;
  color: string;
}

export interface RoutingResult {
  department: Department;
  urgencyLevel: UrgencyLevel;
  category: Category;
  explanation: string;
  score: number;
  matchedKeywords: MatchedKeyword[];
  isCrisis: boolean;
}

export interface IntakeFormData {
  mainText: string;
  contextText: string;
}

export interface TextSegment {
  id: string;
  text: string;
  included: boolean;
  isSensitive: boolean;
}

export interface CaseRecord {
  id: string;
  createdAt: string;
  intakeData: IntakeFormData;
  scoringResult: ScoringResult;
  routingResult: RoutingResult;
  segments: TextSegment[];
  submitted: boolean;
}
