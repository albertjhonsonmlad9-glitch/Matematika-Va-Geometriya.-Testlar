export type TopicGroup = 'Algebra va arifmetika' | 'Geometriya';

export type DevicePlatform = 'iOS' | 'Android' | 'Web';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface QuestionOption {
  t: string;
  c: boolean;
}

export interface GeneratedQuestion {
  q: string;
  o: QuestionOption[];
}

export interface MathTopic {
  id: string;
  en: string;
  sec: string;
  grp: TopicGroup;
  generate: () => GeneratedQuestion[];
}

export interface TestMistake {
  index: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

export interface TestRecord {
  id: string;
  topicId: string;
  topicTitle: string;
  topicSection: string;
  group: TopicGroup;
  studentName: string;
  score: number;
  total: number;
  percentage: number;
  durationSeconds: number;
  completedAt: string;
  updatedAt: number;
  devicePlatform: DevicePlatform;
  mistakes: TestMistake[];
}

export interface ActiveTestSession {
  id: string;
  topicId: string;
  topicTitle: string;
  topicSection: string;
  group: TopicGroup;
  studentFirstName: string;
  studentLastName: string;
  questions: GeneratedQuestion[];
  answers: number[];
  currentIndex: number;
  remainingSeconds: number;
  startedAt: number;
  updatedAt: number;
  devicePlatform: DevicePlatform;
}

export interface StudentProfile {
  firstName: string;
  lastName: string;
  preferredTheme: ThemePreference;
  updatedAt: number;
}

export interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  platform: DevicePlatform;
  lastSeenAt: string;
}

export interface CloudVaultData {
  profile: StudentProfile;
  history: TestRecord[];
  activeTest: ActiveTestSession | null;
}

export interface SyncResponsePayload {
  username: string;
  serverRevision: number;
  lastSyncedAt: string;
  integrityHash: string;
  data: CloudVaultData;
  devices: ConnectedDevice[];
}
