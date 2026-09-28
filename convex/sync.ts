import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { recordKind } from "./schema";

const PULL_LIMIT = 100;

export const pull = query({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db
      .query("records")
      .withIndex("by_user_synced", (q) =>
        q.eq("userId", userId).gt("syncedAt", since),
      )
      .take(PULL_LIMIT);
    return {
      records: rows.map((r) => ({
        kind: r.kind,
        id: r.clientId,
        data: r.data,
        updatedAt: r.updatedAt,
        deleted: r.deleted,
        syncedAt: r.syncedAt,
      })),
      hasMore: rows.length === PULL_LIMIT,
    };
  },
});

export const push = mutation({
  args: {
    records: v.array(
      v.object({
        kind: recordKind,
        id: v.string(),
        data: v.string(),
        updatedAt: v.number(),
        deleted: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, { records }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const latest = await ctx.db
      .query("records")
      .withIndex("by_user_synced", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
    let ts = Math.max(Date.now(), (latest?.syncedAt ?? 0) + 1);

    const accepted: string[] = [];
    // Records where the server already had a newer version; the client
    // should adopt these instead of its own copy.
    const newer: {
      kind: "notepad" | "page";
      id: string;
      data: string;
      updatedAt: number;
      deleted: boolean;
      syncedAt: number;
    }[] = [];

    for (const r of records) {
      const existing = await ctx.db
        .query("records")
        .withIndex("by_user_client", (q) =>
          q.eq("userId", userId).eq("clientId", r.id),
        )
        .unique();
      if (existing && existing.updatedAt > r.updatedAt) {
        newer.push({
          kind: existing.kind,
          id: existing.clientId,
          data: existing.data,
          updatedAt: existing.updatedAt,
          deleted: existing.deleted,
          syncedAt: existing.syncedAt,
        });
        continue;
      }
      const fields = {
        kind: r.kind,
        data: r.data,
        updatedAt: r.updatedAt,
        deleted: r.deleted,
        syncedAt: ts++,
      };
      if (existing) await ctx.db.patch(existing._id, fields);
      else await ctx.db.insert("records", { userId, clientId: r.id, ...fields });
      accepted.push(r.id);
    }
    return { accepted, newer };
  },
});
