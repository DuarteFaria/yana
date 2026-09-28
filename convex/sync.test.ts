/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const record = { kind: "page" as const, id: "page", data: '{"doc":"first"}', updatedAt: 100, deleted: false };

async function setup() {
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) => ctx.db.insert("users", { email: "owner@example.test" }));
  return { t, owner: t.withIdentity({ subject: `${id}|session` }) };
}

test("equal-time conflicting edits converge on a newer server winner", async () => {
  const { owner } = await setup();
  await owner.mutation(api.sync.push, { records: [record] });
  const before = await owner.query(api.sync.pull, { since: 0 });
  const losing = { ...record, data: '{"doc":"second"}' };
  const result = await owner.mutation(api.sync.push, { records: [losing] });
  expect(result.accepted).toEqual([]);
  expect(result.newer).toHaveLength(1);
  expect(result.newer[0]).toMatchObject({ ...record, updatedAt: 101 });
  const after = await owner.query(api.sync.pull, { since: before!.records[0].syncedAt });
  expect(after!.records).toEqual(result.newer);

});

test("an identical retry is acknowledged without rewriting its revision", async () => {
  const { owner } = await setup();
  await owner.mutation(api.sync.push, { records: [record] });
  const before = await owner.query(api.sync.pull, { since: 0 });
  expect(await owner.mutation(api.sync.push, { records: [record] })).toEqual({ accepted: [record.id], newer: [] });
  expect(await owner.query(api.sync.pull, { since: 0 })).toEqual(before);
});

test("deletion ties converge and genuinely newer edits still win", async () => {
  const { owner } = await setup();
  await owner.mutation(api.sync.push, { records: [{ ...record, deleted: true }] });
  const tied = await owner.mutation(api.sync.push, { records: [record] });
  expect(tied.newer[0]).toMatchObject({ deleted: true, updatedAt: 101 });
  const next = { ...record, updatedAt: 102 };
  expect((await owner.mutation(api.sync.push, { records: [next] })).accepted).toEqual([record.id]);
  const old = await owner.mutation(api.sync.push, { records: [record] });
  expect(old.newer[0]).toMatchObject(next);
});

test("push requires authentication and records remain scoped to the owner", async () => {
  const { t, owner } = await setup();
  await expect(t.mutation(api.sync.push, { records: [record] })).rejects.toThrow("Not signed in");
  await owner.mutation(api.sync.push, { records: [record] });
  const id = await t.run((ctx) => ctx.db.insert("users", { email: "other@example.test" }));
  const other = t.withIdentity({ subject: `${id}|other-session` });
  expect((await other.query(api.sync.pull, { since: 0 }))!.records).toEqual([]);
  await other.mutation(api.sync.push, { records: [{ ...record, data: "other" }] });
  expect((await owner.query(api.sync.pull, { since: 0 }))!.records[0]).toMatchObject(record);
});
