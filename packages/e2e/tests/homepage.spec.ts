import { expect, test } from "@playwright/test";

test("homepage should display correctly", async ({ page }) => {
	await page.goto("/");

	// ページタイトルを確認
	await expect(page).toHaveTitle(/Vite \+ React \+ TS/);

	// ページが正常にロードされていることを確認
	await expect(page.locator("body")).toBeVisible();

	// 基本的なコンテンツが表示されていることを確認
	await expect(page.locator("h1, h2, h3").first()).toBeVisible();
});
