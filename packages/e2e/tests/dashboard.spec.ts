import { expect, test } from "@playwright/test";
import { loginTestUser, logout } from "../utils/auth-helper";

test.describe("Dashboard", () => {
	test.beforeEach(async ({ page }) => {
		await loginTestUser(page, {
			userId: "test-user-123",
			name: "Test User",
			email: "test@example.com",
		});
	});

	test.afterEach(async ({ page }) => {
		await logout(page);
	});

	test("should display dashboard for authenticated user", async ({ page }) => {
		await page.goto("/dashboard");

		// Wait for the dashboard to load
		await expect(page.locator("h1")).toContainText("Test User");
		await expect(page.locator("text=test@example.com")).toBeVisible();

		// Check that the user profile picture is displayed
		await expect(page.locator('img[alt="Profile"]')).toBeVisible();

		// Check that the logout button is present
		await expect(page.locator('button:has-text("Logout")')).toBeVisible();

		// Check that the task input is present
		await expect(
			page.locator('input[placeholder*="Add a new task"]'),
		).toBeVisible();
	});

	test("should show empty task list message initially", async ({ page }) => {
		await page.goto("/dashboard");

		// Wait for the dashboard to load
		await expect(page.locator("h1")).toContainText("Test User");

		// Check for empty state message
		await expect(page.locator("text=No tasks yet!")).toBeVisible();
		await expect(
			page.locator("text=Add a task above to get started."),
		).toBeVisible();
	});
});
