// Shared dataset shape used across dashboards. All values come from Supabase
// at runtime; EMPTY_DATASET is only the initial/loading state.
import type {
  Application,
  AnalyticsMetric,
  Candidate,
  FunnelPoint,
  Job,
  JobMatch,
  NotificationItem,
  RoadmapItem,
  SkillRadarPoint,
  TrendPoint,
} from "./types";

export type InterviewSlot = {
  id: string;
  candidate: string;
  role: string;
  time: string;
  type: string;
  date: string;
  round: string;
};

export type InboxNotification = {
  id: string;
  type: "match" | "message" | "interview" | "offer" | "insight";
  title: string;
  desc: string;
  when: string;
  unread: boolean;
};

export type TalentPool = { id: string; label: string; count: number };

export type OfferRecord = {
  candidate: string;
  role: string;
  salary: string;
  equity: string;
  status: string;
  date: string;
};

export type PortfolioProject = {
  title: string;
  role: string;
  year: string;
  tags: string[];
  desc: string;
  gradient: string;
};

export type LearningResource = {
  title: string;
  provider: string;
  hours: number;
  skill: string;
  url: string;
};

export type TeamMember = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

export type ResumeInsight = { title: string; body: string; done: boolean };

export type Invoice = { id: string; date: string; amt: string };

export type Dataset = {
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  jobMatches: JobMatch[];
  notifications: NotificationItem[];
  skillRadar: SkillRadarPoint[];
  roadmap: RoadmapItem[];
  analyticsMetrics: AnalyticsMetric[];
  funnel: FunnelPoint[];
  trend: TrendPoint[];
  interviews: InterviewSlot[];
  interviewQuestions: Record<string, string[]>;
  inbox: InboxNotification[];
  talentPools: TalentPool[];
  offers: OfferRecord[];
  portfolioProjects: PortfolioProject[];
  learningResources: LearningResource[];
  teamMembers: TeamMember[];
  invoices: Invoice[];
  resumeScore: number;
  resumeInsights: ResumeInsight[];
  coverLetterDraft: string;
};

export const EMPTY_DATASET: Dataset = {
  jobs: [],
  candidates: [],
  applications: [],
  jobMatches: [],
  notifications: [],
  skillRadar: [],
  roadmap: [],
  analyticsMetrics: [],
  funnel: [],
  trend: [],
  interviews: [],
  interviewQuestions: { behavioral: [], technical: [], system: [] },
  inbox: [],
  talentPools: [],
  offers: [],
  portfolioProjects: [],
  learningResources: [],
  teamMembers: [],
  invoices: [],
  resumeScore: 0,
  resumeInsights: [],
  coverLetterDraft: "",
};
