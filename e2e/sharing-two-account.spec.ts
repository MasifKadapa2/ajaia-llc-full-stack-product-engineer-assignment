import { test, expect, type Page } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const recipientEmail = process.env.E2E_RECIPIENT_EMAIL;
const recipientPassword = process.env.E2E_RECIPIENT_PASSWORD;
const strangerEmail = process.env.E2E_STRANGER_EMAIL;
const strangerPassword = process.env.E2E_STRANGER_PASSWORD;

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasAccounts =
  ownerEmail &&
  ownerPassword &&
  recipientEmail &&
  recipientPassword &&
  strangerEmail &&
  strangerPassword &&
  supabaseUrl &&
  anonKey;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/documents/, { timeout: 20_000 });
}

async function getAccessToken(email: string, password: string) {
  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  const json = await res.json();
  return json.access_token as string;
}

test.describe("Two-account sharing", () => {
  test.skip(!hasAccounts, "Set E2E_OWNER_*, E2E_RECIPIENT_*, E2E_STRANGER_* and Supabase URL/key");

  test("owner shares, editor edits, viewer read-only, revoke blocks access", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    page.on("dialog", (dialog) => dialog.accept());
    const docTitle = `Share flow ${Date.now()}`;

    await signIn(page, ownerEmail!, ownerPassword!);
    await page.getByRole("button", { name: "New Document" }).click();
    await expect(page).toHaveURL(/\/documents\/.+/, { timeout: 20_000 });
    const documentUrl = page.url();
    const docId = documentUrl.split("/").pop()!;

    const titleInput = page.getByLabel("Document title");
    await titleInput.fill(docTitle);
    await titleInput.blur();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 25_000,
    });
    await page.getByTestId("share-document-trigger").click();
    await expect(page.getByTestId("share-document-dialog")).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("#share-email").fill(recipientEmail!);
    await page.locator("#share-permission").selectOption("editor");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("Collaborators")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("share-document-dialog")).toHaveCount(0);

    const recipientContext = await browser.newContext();
    const recipientPage = await recipientContext.newPage();
    await signIn(recipientPage, recipientEmail!, recipientPassword!);
    await recipientPage.goto("/documents/shared");
    await expect(recipientPage.getByRole("link", { name: new RegExp(docTitle) })).toBeVisible({
      timeout: 15_000,
    });
    await recipientPage.getByRole("link", { name: new RegExp(docTitle) }).click();

    const editor = recipientPage.locator(".ProseMirror");
    await editor.click();
    await editor.pressSequentially("Recipient edit", { delay: 10 });
    await recipientPage.waitForTimeout(1200);
    await expect(recipientPage.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 25_000,
    });

    await expect(page.getByTestId("share-document-trigger")).toBeVisible();
    await expect(recipientPage.getByLabel("Document title")).toHaveAttribute(
      "readonly",
    );

    await recipientPage.reload();
    await expect(editor).toContainText("Recipient edit");

    await page.bringToFront();
    if (!page.url().includes(docId)) {
      await page.goto(documentUrl);
    }
    await page.getByTestId("share-document-trigger").click();
    await expect(page.getByTestId("share-document-dialog")).toBeVisible();
    const roleSelect = page.locator('select[aria-label^="Role for"]').first();
    await roleSelect.selectOption("viewer");
    await expect(roleSelect).toHaveValue("viewer");
    await page.waitForTimeout(1500);
    await recipientPage.reload();
    await expect(recipientPage.getByText(/Read-only/i)).toBeVisible();
    await editor.click({ force: true });
    await editor.pressSequentially("blocked", { delay: 10 });
    await recipientPage.waitForTimeout(1200);
    const viewerToken = await getAccessToken(recipientEmail!, recipientPassword!);
    const patch = await fetch(`${supabaseUrl}/rest/v1/documents?id=eq.${docId}`, {
      method: "PATCH",
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${viewerToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        content: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    });
    expect(patch.status).toBeLessThan(300);
    expect(await patch.json()).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("share-document-dialog")).toHaveCount(0);
    await page.getByTestId("share-document-trigger").click();
    await expect(page.getByTestId("share-document-dialog")).toBeVisible();
    await page.getByRole("button", { name: /Revoke/i }).first().click();

    await recipientPage.goto(documentUrl);
    await expect(recipientPage.getByText(/not found|Page not found/i)).toBeVisible({
      timeout: 10_000,
    });

    const strangerContext = await browser.newContext();
    const strangerPage = await strangerContext.newPage();
    await signIn(strangerPage, strangerEmail!, strangerPassword!);
    await strangerPage.goto(documentUrl);
    await expect(strangerPage.getByText(/not found|Page not found/i)).toBeVisible();

    await recipientContext.close();
    await strangerContext.close();
  });
});
