/** Client-safe training types and constants (mirrors training.server.ts). */
export type WaypointId =
  | "analysis"
  | "resume"
  | "cover"
  | "portfolio"
  | "interview"
  | "coding"
  | "ready";

export type WaypointState = { status: "todo" | "active" | "done" | "skipped"; score?: number };

export const WAYPOINTS: { id: WaypointId; label: string; blurb: string }[] = [
  {
    id: "analysis",
    label: "Job analysed",
    blurb: "Posting parsed and scored against your profile",
  },
  { id: "resume", label: "Resume tailored", blurb: "Rewritten for this posting with an ATS score" },
  { id: "cover", label: "Cover letter", blurb: "Drafted from the same job context" },
  { id: "portfolio", label: "Portfolio", blurb: "Template filled with your own work" },
  { id: "interview", label: "Voice interview", blurb: "Role-specific questions, spoken answers" },
  { id: "coding", label: "Coding challenge", blurb: "Timed problem verified against tests" },
  { id: "ready", label: "Ready to apply", blurb: "Everything prepared for this role" },
];
