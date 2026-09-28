import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Everything the app stores (notepads, pages) is a "record": an opaque JSON
// blob owned by the client. The server only orders changes and resolves
// conflicts (last write wins by the client's updatedAt).
export const recordKind = v.union(v.literal("notepad"), v.literal("page"));

export default defineSchema({
  ...authTables,
  records: defineTable({
    userId: v.id("users"),
    kind: recordKind,
    clientId: v.string(),
    data: v.string(),
    updatedAt: v.number(),
    deleted: v.boolean(),
    // Strictly increasing per user; clients pull everything after a cursor.
    syncedAt: v.number(),
  })
    .index("by_user_client", ["userId", "clientId"])
    .index("by_user_synced", ["userId", "syncedAt"]),
  files: defineTable({
    userId: v.id("users"),
    clientId: v.string(),
    storageId: v.id("_storage"),
    mime: v.string(),
  }).index("by_user_client", ["userId", "clientId"]),
});
