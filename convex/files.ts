import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

export const register = mutation({
  args: { id: v.string(), storageId: v.id("_storage"), mime: v.string() },
  handler: async (ctx, { id, storageId, mime }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("files")
      .withIndex("by_user_client", (q) =>
        q.eq("userId", userId).eq("clientId", id),
      )
      .unique();
    if (existing) {
      // Same file uploaded twice (e.g. two devices raced); keep the first.
      await ctx.storage.delete(storageId);
      return;
    }
    await ctx.db.insert("files", { userId, clientId: id, storageId, mime });
  },
});

export const url = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const file = await ctx.db
      .query("files")
      .withIndex("by_user_client", (q) =>
        q.eq("userId", userId).eq("clientId", id),
      )
      .unique();
    if (!file) return null;
    return await ctx.storage.getUrl(file.storageId);
  },
});
