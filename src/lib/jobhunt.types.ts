// Client-safe types for the candidate Job Hunt agent.

export type HuntMode = "review" | "auto";

export type HuntSettings = {
  enabled: boolean;
  /** "review" = agent asks before applying, "auto" = agent applies itself. */
  mode: HuntMode;
  minScore: number;
  dailyLimit: number;
  /** Role titles / keywords the agent should hunt for. */
  titles: string[];
  /** Preferred locations (empty = anywhere). */
  locations: string[];
  remoteOnly: boolean;
  useResume: boolean;
  usePortfolio: boolean;
  useGithub: boolean;
  githubUrl: string;
  portfolioUrl: string;
};

export const DEFAULT_HUNT_SETTINGS: HuntSettings = {
  enabled: false,
  mode: "review",
  minScore: 75,
  dailyLimit: 5,
  titles: [],
  locations: [],
  remoteOnly: false,
  useResume: true,
  usePortfolio: true,
  useGithub: true,
  githubUrl: "",
  portfolioUrl: "",
};

export type HuntProposal = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  matchScore: number;
  reason: string;
  status: "pending" | "applied" | "denied";
  createdAt: string;
};

export type HuntLogEntry = {
  id: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  status: "applied" | "denied" | "skipped";
  reason: string;
  createdAt: string;
};

export type HuntState = {
  settings: HuntSettings;
  proposals: HuntProposal[];
  log: HuntLogEntry[];
  /** False when no Supabase service key is configured. */
  backendReady: boolean;
};

export type HuntPassResult = {
  applied: HuntLogEntry[];
  proposed: HuntProposal[];
  scanned: number;
  message: string;
};

export type DraftedAnswer = { question: string; answer: string };

export type DraftedApplication = {
  jobTitle: string;
  company: string;
  sourceUrl: string;
  coverNote: string;
  answers: DraftedAnswer[];
  /** True when the agent could not reach an AI provider. */
  degraded: boolean;
};
