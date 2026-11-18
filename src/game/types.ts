export type AppScreen =
  | 'title'
  | 'login'
  | 'profile'
  | 'hq'
  | 'phase1'
  | 'phase2'
  | 'phase3'
  | 'phase4'
  | 'phase5';

export type LocationId = 'kantin' | 'kelas' | 'perpustakaan' | 'taman';

export interface ClueItem {
  id: string;
  label: string;
  issueSummary: string;
  profesorReaction: string;
}

export interface LocationDefinition {
  id: LocationId;
  name: string;
  shortName: string;
  zoneLabel: string;
  briefing: string;
  hints: [string, string, string];
  clues: ClueItem[];
}

export interface LocationInvestigation {
  discoveredClueIds: string[];
  hintLevelUsed: 0 | 1 | 2 | 3;
  notes: string;
  initialProposal: string;
  completed: boolean;
  completedAt?: string;
}

export interface OpinionEntry {
  locationId: LocationId;
  opinionText: string;
  reasonText: string;
}

export interface LogicChallenge {
  id: string;
  contextTitle: string;
  opinion: string;
  options: {
    id: 'A' | 'B';
    text: string;
    isRelevant: boolean;
    explanation: string;
  }[];
}

export type FacilityAssetId =
  | 'kantin'
  | 'bilik_darjah'
  | 'perpustakaan'
  | 'taman_herba'
  | 'taman_permainan'
  | 'padang'
  | 'tong_sampah'
  | 'cuci_tangan'
  | 'bangku'
  | 'pokok'
  | 'bunga'
  | 'laluan';

export type DesignActionType =
  | 'kekalkan'
  | 'ubah_suai'
  | 'gantikan'
  | 'tambah_baharu'
  | 'susun_semula';

export interface FacilityAsset {
  id: FacilityAssetId;
  name: string;
  category: 'bangunan' | 'alam' | 'kemudahan';
  description: string;
}

export interface PlacedFacility {
  uid: string;
  assetId: FacilityAssetId;
  row: number;
  col: number;
  actionType?: DesignActionType;
  linkedLocationId?: LocationId;
  justification?: string;
  isOriginal?: boolean;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
}

export interface AgentProfile {
  name: string;
  className: string;
  codenameBadge: string;
  agentId?: string;
  verifiedAt?: string;
}

export interface AuthUser {
  username: string;
  role: string;
  referenceNo: string;
  accessStatus: string;
  organization: string;
  profile: AgentProfile | null;
}

export interface GameState {
  version: number;
  profile: AgentProfile | null;
  xp: number;
  awardedMilestones: string[];
  investigations: Record<LocationId, LocationInvestigation>;
  selectedEvidenceIds: LocationId[];
  opinions: Record<LocationId, OpinionEntry>;
  logicChallengeAnswers: Record<string, 'A' | 'B'>;
  builderPlan: PlacedFacility[];
  builderSaved: boolean;
  finalReportText: string;
  finalReportSaved: boolean;
  soundEnabled: boolean;
  lastUpdated: string;
}
