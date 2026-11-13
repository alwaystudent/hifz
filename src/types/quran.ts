export type StageType = 'stage1' | 'stage2' | 'stage3' | 'peer';
export type StageMode = 'listen' | 'test';
export type RiwayahId = 'hafs' | 'warsh' | 'qalun';

export interface RiwayahMeta {
  id: RiwayahId;
  name: string;
  shortName: string;
  description: string;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface AyahItem {
  number: number; // overall global ayah number
  numberInSurah: number;
  text: string;
  words?: string[];
}

export interface Reciter {
  id: string;
  name: string;
  edition: string;
  riwayah: RiwayahId;
  subfolder: string;
  description: string;
  mp3QuranReadId?: number;
  mp3QuranFolderUrl?: string;
}

export interface AyahTiming {
  ayah: number;
  start_time: number; // milliseconds
  end_time: number;   // milliseconds
}

export interface PeerParticipant {
  peerId: string;
  name: string;
  isMuted: boolean;
  joinedAt: number;
}

export interface RoomPassageState {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  riwayah: RiwayahId;
}

export interface QueueItem {
  id: string;
  type: 'single_ayah' | 'cumulative_link' | 'final_review';
  ayahNumberInSurah: number;
  ayahGlobalNumber?: number;
  currentCycle: number;
  totalCycles: number;
  stepDescription: string;
  targetRange: [number, number]; // [startAyah, endAyah] for this step
  allAyahsInGroup: number[]; // the list of ayahs that belong to this group/cycle
  positionInGroup: number; // 0-based index of this ayah within its cycle
}

export interface TajweedRuleInfo {
  ruleName: string;
  category: 'ghunnah' | 'qalqalah' | 'idgham' | 'ikhfa' | 'iqlab' | 'madd' | 'general';
  description: string;
  tip: string;
}

export interface WordToken {
  id: string;
  text: string;
  cleanText: string;
  ayahNumber: number;
  wordIndex: number;
  isHidden: boolean;
  isMatched: boolean;
  isActive: boolean;
  isHinted: boolean;
  hasError?: boolean;
  tajweedRule?: TajweedRuleInfo | null;
}

export type AyahFontSize = 'small' | 'medium' | 'large';

export interface RepetitionSettings {
  singleAyahRepeats: number;     // e.g. 3
  linkRepeats: number;           // e.g. 3
  finalReviewRepeats: number;    // e.g. 3
  autoAdvance: boolean;
  playbackSpeed: number;         // 0.8, 1.0, 1.25
  pauseBetweenAyahsSec: number;  // seconds of silence between repeats (great for learner repeating aloud)
  ayahFontSize?: AyahFontSize;
}

export interface MemorizationStats {
  completedPassages: number;
  totalRepetitions: number;
  stage2RepsCount: number;
  stage3WordsRevealed: number;
  accuracyScore: number;
}

export type EvaluationRating = 'mutqan' | 'mutaraddid' | 'mutafallit';

export interface StageProgressState {
  stage1: boolean;
  stage2: boolean;
  stage3: boolean;
}

export interface SessionReport {
  id: string;
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  date: string; // ISO date string
  rating: EvaluationRating;
  errorsCount: number;
  totalWords: number;
  accuracyPercent: number;
  nextReviewDate: string; // ISO date string
  reviewIntervalDays: number;
  status: 'pending' | 'due' | 'reviewed';
}
