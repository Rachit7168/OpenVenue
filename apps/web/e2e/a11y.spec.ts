import { expect, test } from "@playwright/test";

test("moves focus into the new-project dialog and back out", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("open-editor").click();
  await page.getByTestId("new-project").click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("project-name")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("new-project")).toBeFocused();
});
