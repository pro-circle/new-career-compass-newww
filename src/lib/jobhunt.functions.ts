import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DraftedApplication, HuntPassResult, HuntSettings, HuntState } from "./jobhunt.types";

export const getJobHunt = createServerFn({ method: "GET" }).handler(
  async (): Promise<HuntState> => {
    const { getState } = await import("./jobhunt.server");
    return getState();
  },
);

export const updateJobHunt = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        enabled: z.boolean().optional(),
        mode: z.enum(["review", "auto"]).optional(),
        minScore: z.number().min(40).max(99).optional(),
        dailyLimit: z.number().min(1).max(25).optional(),
        titles: z.array(z.string()).max(20).optional(),
        locations: z.array(z.string()).max(20).optional(),
        remoteOnly: z.boolean().optional(),
        useResume: z.boolean().optional(),
        usePortfolio: z.boolean().optional(),
        useGithub: z.boolean().optional(),
        githubUrl: z.string().max(300).optional(),
        portfolioUrl: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<HuntSettings> => {
    const { saveSettings } = await import("./jobhunt.server");
    return saveSettings(data);
  });

export const runJobHunt = createServerFn({ method: "POST" }).handler(
  async (): Promise<HuntPassResult> => {
    const { runPass } = await import("./jobhunt.server");
    return runPass();
  },
);

export const decideJobHuntProposal = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        decision: z.enum(["approve", "deny"]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { decideProposal } = await import("./jobhunt.server");
    return decideProposal(data.id, data.decision);
  });

export const draftJobApplication = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        url: z.string().max(2000).optional(),
        jobTitle: z.string().max(200).optional(),
        company: z.string().max(200).optional(),
        questions: z.array(z.string().max(500)).max(12).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<DraftedApplication> => {
    const { draftApplication } = await import("./jobhunt.server");
    return draftApplication(data);
  });
