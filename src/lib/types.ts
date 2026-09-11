// Shared DTO types for data returned from server functions.

export type MatchTier = "elite" | "strong" | "fair";

export type Candidate = {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  years: number;
  matchScore: number;
  skills: string[];
  strengths: string[];
  gaps: string[];
  status: "New" | "Screening" | "Interviewing" | "Final Round" | "Offer" | "Rejected";
  appliedFor: string;
  aiInsight: string;
  portfolio: { label: string; url: string }[];
  initials: string;
  email: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time";
  postedAgo: string;
  status: "Open" | "Draft" | "Closed" | "Paused";
  applicants: number;
  new: number;
  matchAvg: number;
  salary: string;
  description: string;
  tags: string[];
};

export type Application = {
  id: string;
  jobTitle: string;
  company: string;
  logo: string;
  appliedOn: string;
  stage: "Applied" | "Screening" | "Interview" | "Offer" | "Rejected";
  progress: number;
  matchScore: number;
  nextStep?: string;
};

export type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  postedAgo: string;
  skills: string[];
  reason: string;
  logo: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  time: string;
  type: string;
};

export type SkillRadarPoint = { skill: string; you: number; target: number };

export type RoadmapItem = {
  week: string;
  title: string;
  detail: string;
  done: boolean;
};

export type AnalyticsMetric = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
};

export type FunnelPoint = { stage: string; count: number };
export type TrendPoint = { month: string; hires: number; applications: number };

export type CandidateProfile = {
  id: string;
  email: string;
  fullName: string;
  headline: string;
  location: string;
  yearsExp: number;
  targetRoles: string[];
  skills: string[];
  links: { label: string; url: string }[];
  resumeText: string;
  resumeJson: string | null;
  onboarded: boolean;
};
