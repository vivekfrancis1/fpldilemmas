import { z } from "zod";

// FPL Login schema
export const fplLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type FplLoginData = z.infer<typeof fplLoginSchema>;

// FPL User session schema
export const fplUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  teamId: z.number(),
  teamName: z.string(),
  accessToken: z.string().optional(),
  sessionCookies: z.string().optional(),
});

export type FplUser = z.infer<typeof fplUserSchema>;

// FPL Team schema
export const fplTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  event: z.number(), // Current gameweek
  overallPoints: z.number(),
  overallRank: z.number(),
  gameweekPoints: z.number(),
  gameweekRank: z.number(),
  totalTransfers: z.number(),
  bank: z.number(), // Money in bank (tenths)
  teamValue: z.number(), // Total team value (tenths)
  freeTransfers: z.number(),
  picks: z.array(z.object({
    element: z.number(), // Player ID
    position: z.number(), // Position in team (1-15)
    multiplier: z.number(), // Captain = 2, Vice = 1, Benched = 0
    isCaptain: z.boolean(),
    isViceCaptain: z.boolean(),
  })),
});

export type FplTeam = z.infer<typeof fplTeamSchema>;

// Transfer schema
export const fplTransferSchema = z.object({
  playerIn: z.number(), // Player ID to transfer in
  playerOut: z.number(), // Player ID to transfer out
  wildcard: z.boolean().default(false),
  freeHit: z.boolean().default(false),
  benchBoost: z.boolean().default(false),
  tripleCaptain: z.boolean().default(false),
});

export type FplTransfer = z.infer<typeof fplTransferSchema>;

// Team selection/formation schema
export const fplTeamSelectionSchema = z.object({
  picks: z.array(z.object({
    element: z.number(),
    position: z.number(),
    multiplier: z.number(),
  })),
  chip: z.string().nullable(), // "wildcard", "freehit", "bboost", "3xc", null
});

export type FplTeamSelection = z.infer<typeof fplTeamSelectionSchema>;