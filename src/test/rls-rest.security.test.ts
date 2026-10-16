/**
 * Live Supabase REST checks. Run with:
 * RUN_RLS_TESTS=1 SUPABASE_URL=... SUPABASE_ANON_KEY=... npm test -- src/test/rls-rest.security.test.ts
 */
import { describe, expect, it, beforeAll } from "vitest";

const run = process.env.RUN_RLS_TESTS === "1";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function signUp(email: string, password: string) {
  await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey!, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function getToken(email: string, password: string) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey!, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  const json = await res.json();
  return { token: json.access_token as string, userId: json.user.id as string };
}

describe.skipIf(!run || !supabaseUrl || !anonKey)("RLS REST security", () => {
  const password = "RlsTestPass123!";
  const ownerEmail = `rls-owner-${Date.now()}@papertrail.local`;
  const editorEmail = `rls-editor-${Date.now()}@papertrail.local`;
  const strangerEmail = `rls-stranger-${Date.now()}@papertrail.local`;

  let ownerToken: string;
  let editorToken: string;
  let strangerToken: string;
  let ownerId: string;
  let editorId: string;
  let docId: string;

  beforeAll(async () => {
    await signUp(ownerEmail, password);
    await signUp(editorEmail, password);
    await signUp(strangerEmail, password);
    const owner = await getToken(ownerEmail, password);
    const editor = await getToken(editorEmail, password);
    const stranger = await getToken(strangerEmail, password);
    ownerToken = owner.token;
    editorToken = editor.token;
    strangerToken = stranger.token;
    ownerId = owner.userId;
    editorId = editor.userId;

    const create = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: "POST",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        title: "RLS Doc",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        owner_id: ownerId,
      }),
    });
    const rows = await create.json();
    docId = rows[0].id;

    await fetch(`${supabaseUrl}/rest/v1/document_shares`, {
      method: "POST",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        document_id: docId,
        shared_with_user_id: editorId,
        permission: "editor",
      }),
    });
  }, 60_000);

  it("editor can update content but not title via REST", async () => {
    const contentPatch = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "editor body" }],
              },
            ],
          },
        }),
      },
    );
    expect(contentPatch.status).toBeLessThan(300);
    const contentRows = await contentPatch.json();
    expect(contentRows[0]?.content?.content?.[0]?.content?.[0]?.text).toBe(
      "editor body",
    );

    const titlePatch = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Hacked Title" }),
      },
    );
    expect(titlePatch.status).toBeGreaterThanOrEqual(400);

    const read = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=title`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    const doc = await read.json();
    expect(doc[0].title).toBe("RLS Doc");
  });

  it("stranger cannot read the document", async () => {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=id`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${strangerToken}`,
        },
      },
    );
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("editor cannot delete the document", async () => {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}`,
      {
        method: "DELETE",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${editorToken}`,
          Prefer: "return=representation",
        },
      },
    );
    expect(res.status).toBeLessThan(300);
    expect(await res.json()).toEqual([]);

    const stillThere = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}&select=id`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${ownerToken}`,
        },
      },
    );
    expect((await stillThere.json()).length).toBe(1);
  });

  it("owner can delete a document they own", async () => {
    const create = await fetch(`${supabaseUrl}/rest/v1/documents`, {
      method: "POST",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        title: "Delete me",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        owner_id: ownerId,
      }),
    });
    const rows = await create.json();
    const tempId = rows[0].id;

    const del = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${tempId}`,
      {
        method: "DELETE",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${ownerToken}`,
          Prefer: "return=representation",
        },
      },
    );
    expect(del.status).toBeLessThan(300);
    const deleted = await del.json();
    expect(deleted[0]?.id).toBe(tempId);
  });

  it("editor cannot change owner_id", async () => {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/documents?id=eq.${docId}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${editorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ owner_id: editorId }),
      },
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
