import { readFile } from "node:fs/promises";
import { expect, type Download, type Locator, type Page, test } from "@playwright/test";

async function planBox(plan: Locator) {
  const box = await plan.boundingBox();
  if (!box) {
    throw new Error("The floor plan is not visible.");
  }
  return box;
}

async function clickPlan(page: Page, plan: Locator, xRatio: number, yRatio: number) {
  const box = await planBox(plan);
  await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
}

async function documentText(page: Page) {
  return page.getByTestId("venue-json").textContent();
}

async function readDownload(download: Download): Promise<string>;
async function readDownload(download: Download, encoding: "buffer"): Promise<Buffer>;
async function readDownload(download: Download, encoding?: "buffer") {
  const path = await download.path();
  if (!path) {
    throw new Error("The download was not saved.");
  }
  return encoding === "buffer" ? readFile(path) : readFile(path, "utf8");
}

test("creates a hall, edits it, exports it, and opens it again", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("open-editor").click();
  await page.getByTestId("new-project").click();
  await page.getByTestId("project-name").fill("Playwright hall");
  await page.getByTestId("project-template").selectOption("rectangular-hall");
  await page.getByTestId("create-project").click();

  await expect(page.getByRole("heading", { name: "Playwright hall" })).toBeVisible();
  const plan = page.getByTestId("floor-plan");
  await expect(plan).toBeVisible();
  await expect(page.getByTestId("wall-dimension").first()).toBeVisible();

  await page.getByTestId("tool-wall").click();
  await clickPlan(page, plan, 0.35, 0.4);
  await clickPlan(page, plan, 0.62, 0.58);
  await expect.poll(async () => (await documentText(page))?.match(/"thickness"/g)?.length).toBe(5);

  await page.getByTestId("tool-rect").click();
  await clickPlan(page, plan, 0.42, 0.62);
  await clickPlan(page, plan, 0.58, 0.78);
  await expect.poll(async () => documentText(page)).toContain('"name": "Room"');

  await page.getByTestId("tool-table").click();
  await clickPlan(page, plan, 0.5, 0.48);
  await expect.poll(async () => documentText(page)).toContain('"name": "Table"');

  const chair = page.getByTestId("asset-card").first();
  await expect(chair).toContainText("Side chair");
  const chairId = await chair.getAttribute("data-asset-id");
  await page.evaluate((assetId) => {
    const target = document.querySelector("[data-testid=floor-plan]");
    if (!(target instanceof SVGElement) || !assetId) {
      throw new Error("The floor plan is not ready for a drop.");
    }
    const transfer = new DataTransfer();
    transfer.setData("text/plain", assetId);
    const bounds = target.getBoundingClientRect();
    target.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: bounds.left + bounds.width * 0.3,
        clientY: bounds.top + bounds.height * 0.3,
        dataTransfer: transfer,
      }),
    );
  }, chairId);
  await expect.poll(async () => documentText(page)).toContain("Side chair");

  await page.getByTestId("tool-select").click();
  const beforeMove = await documentText(page);
  const box = await planBox(plan);
  const originX = box.x + box.width * 0.5;
  const originY = box.y + box.height * 0.48;
  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(originX + 48, originY, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => documentText(page)).not.toBe(beforeMove);
  await page.getByRole("textbox", { name: "Rotation °" }).fill("15");
  await page.getByRole("textbox", { name: "Rotation °" }).press("Tab");
  await page.getByRole("textbox", { name: "Width", exact: true }).fill("2");
  await page.getByRole("textbox", { name: "Width", exact: true }).press("Tab");
  await expect.poll(async () => documentText(page)).toContain('"width": 2,');

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => documentText(page)).not.toContain('"width": 2,');
  await page.getByRole("button", { name: "Redo" }).click();
  await expect.poll(async () => documentText(page)).toContain('"width": 2,');

  await page.getByTestId("view-both").click();
  await expect(plan).toBeVisible();
  await expect(page.getByTestId("venue-stage")).toBeVisible();
  await expect.poll(async () => documentText(page)).toContain('"name": "Table"');

  await page.getByTestId("view-3d").click();
  await page.getByTestId("camera-walk").click();
  await expect(page.getByTestId("walk-hint")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("walk-hint")).toBeHidden();

  const jsonDownload = page.waitForEvent("download");
  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-json").click();
  const json = await jsonDownload;
  expect(await json.suggestedFilename()).toMatch(/\.json$/);
  expect(await readDownload(json)).toContain("Playwright hall");

  const glbDownload = page.waitForEvent("download");
  await page.getByTestId("export-glb").click();
  const glb = await glbDownload;
  expect(await glb.suggestedFilename()).toMatch(/\.glb$/);
  expect((await readDownload(glb, "buffer")).subarray(0, 4).toString("utf8")).toBe("glTF");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Playwright hall" })).toBeVisible();
  await expect.poll(async () => documentText(page)).toContain('"width": 2,');
  await expect.poll(async () => documentText(page)).toContain("Side chair");
});
