import { test, expect } from "@playwright/test";

/**
 * Requires real Supabase credentials and a confirmed test user:
 * E2E_USER_EMAIL, E2E_USER_PASSWORD
 */
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("Papertrail smoke", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test("sign in, create document, edit, and reopen", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/documents/);

    await page.getByRole("button", { name: "New Document" }).click();
    await expect(page).toHaveURL(/\/documents\/.+/, { timeout: 20000 });

    const title = page.getByLabel("Document title");
    await title.fill("Playwright draft");
    await title.blur();

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.pressSequentially("Hello from Playwright", { delay: 15 });
    await page.waitForTimeout(1200);

    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 25000,
    });

    const documentUrl = page.url();
    await page.goto("/documents");
    await page.goto(documentUrl);
    await expect(editor).toContainText("Hello from Playwright");
  });
});
