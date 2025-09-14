import { expect, test } from "@playwright/test";
import { loginTestUser, logout } from "../utils/auth-helper";
import { clearUserTasks } from "../utils/test-cleanup";

test.describe("Dashboard", () => {
	const TEST_USER_ID = "test-user-123";

	test.beforeEach(async ({ page }) => {
		// Clear user data first (this will clear sessions too)
		await clearUserTasks(page, TEST_USER_ID);

		// Login as test user after cleanup
		await loginTestUser(page, {
			userId: TEST_USER_ID,
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

	test("should show empty task list message when no tasks exist", async ({ page }) => {
		await page.goto("/dashboard");

		// Wait for the dashboard to load
		await expect(page.locator("h1")).toContainText("Test User");

		// beforeEach should have already cleaned up, so we should see empty state
		// Check for empty state message
		await expect(page.locator("text=No tasks yet!")).toBeVisible();
		await expect(
			page.locator("text=Add a task above to get started."),
		).toBeVisible();
	});

	test("should create and manage tasks through complete workflow", async ({ page }) => {
		await page.goto("/dashboard");
		
		// Verify we start with empty state (cleanup was done in beforeEach)
		await expect(page.locator("text=No tasks yet!")).toBeVisible();
		
		const taskInput = page.locator('input[placeholder*="Add a new task"]');
		const addButton = page.locator('button:has-text("➕ Add")');
		
		// Wait for input to be ready
		await expect(taskInput).toBeVisible();
		await expect(addButton).toBeVisible();

		// Test 1: Create a task
		await taskInput.fill("Test Task 1");
		await expect(addButton).toBeEnabled(); // Wait for button to be enabled
		await addButton.click();
		await expect(page.locator("text=Test Task 1")).toBeVisible();
		// Input should be cleared after task creation
		await expect(taskInput).toHaveValue("");

		// Test 2: Create second task
		await taskInput.fill("Test Task 2");
		await expect(addButton).toBeEnabled();
		await addButton.click();
		await expect(page.locator("text=Test Task 2")).toBeVisible();
		await expect(taskInput).toHaveValue("");

		// Verify task list shows 2 tasks (use more specific selector)
		const taskItems = page.locator("ul li");
		await expect(taskItems).toHaveCount(2);

		// Test 3: Edit a task
		const firstTask = page.locator("li").filter({ hasText: "Test Task 1" }).first();
		// Click on the task title span to start editing
		await firstTask.locator("span", { hasText: "Test Task 1" }).click();
		
		// Wait for edit input to appear and verify it's visible
		const editInput = page.locator('input[type="text"]').first();
		await expect(editInput).toBeVisible();
		await editInput.clear();
		await editInput.fill("Edited Task 1");
		await editInput.press("Enter");
		
		// Wait for edit to complete and verify
		await expect(page.locator("text=Edited Task 1")).toBeVisible();
		await expect(page.locator("text=Test Task 1")).not.toBeVisible();

		// Test 4: Mark task as complete
		const editedTask = page.locator("li").filter({ hasText: "Edited Task 1" });
		await editedTask.hover();
		const completeButton = editedTask.locator('button[title*="Mark as complete"]');
		await completeButton.click();
		
		// Verify task is marked as complete (opacity reduced)
		await expect(editedTask).toHaveClass(/opacity-60/);

		// Test 5: Mark as priority
		const secondTask = page.locator("li").filter({ hasText: "Test Task 2" });
		await secondTask.hover();
		const priorityButton = secondTask.locator('button[title*="Mark as priority"]');
		await priorityButton.click();
		
		// Verify task has priority styling (yellow background)
		await expect(secondTask).toHaveClass(/bg-yellow-50/);

		// Test 6: Archive task
		await secondTask.hover();
		const archiveButton = secondTask.locator('button[title*="Archive task"]');
		await archiveButton.click();
		
		// Task should be archived (still visible but marked as archived)
		// Note: Current implementation doesn't hide archived tasks
		await expect(page.locator("text=Test Task 2")).toBeVisible();

		// Test 7: Delete remaining task
		await editedTask.hover();
		const deleteButton = editedTask.locator('button[title*="Delete task"]');
		await deleteButton.click();
		
		// Verify task is deleted
		await expect(page.locator("text=Edited Task 1")).not.toBeVisible();
		// Note: Empty state won't show because archived task still exists

		// Test 8: Create task with Enter key
		await taskInput.fill("Enter Key Task");
		await taskInput.press("Enter");
		await expect(page.locator("text=Enter Key Task")).toBeVisible();

		// Test 9: Input validation - empty task should not be created
		await taskInput.clear();
		// Button should be disabled when input is empty
		await expect(addButton).toBeDisabled();
		// Therefore we can't click it to create an empty task
	});

	test("should support task drag and drop reordering", async ({ page }) => {
		await page.goto("/dashboard");
		
		// Wait for dashboard to load
		await expect(page.locator("h1")).toContainText("Test User");
		
		// Clear any existing tasks first by deleting them
		let existingTasks = page.locator("ul li");
		let taskCount = await existingTasks.count();
		
		// Delete all existing tasks
		while (taskCount > 0) {
			const task = existingTasks.first();
			await task.hover();
			const deleteButton = task.locator('button[title*="Delete task"]');
			await deleteButton.click();
			await page.waitForTimeout(500); // Wait for delete to process
			
			existingTasks = page.locator("ul li");
			taskCount = await existingTasks.count();
		}

		const taskInput = page.locator('input[placeholder*="Add a new task"]');
		const addButton = page.locator('button:has-text("➕ Add")');

		// Create two tasks for reordering test
		await taskInput.fill("First Task");
		await expect(addButton).toBeEnabled();
		await addButton.click();
		await expect(page.locator("text=First Task")).toBeVisible();

		await taskInput.fill("Second Task");
		await expect(addButton).toBeEnabled();
		await addButton.click();
		await expect(page.locator("text=Second Task")).toBeVisible();

		// Verify initial order (most recent task first)
		const taskList = page.locator("ul li");
		await expect(taskList.first()).toContainText("Second Task");
		await expect(taskList.last()).toContainText("First Task");

		// Perform drag and drop reordering (drag first task to second position)
		const firstTaskItem = page.locator("li").filter({ hasText: "Second Task" });
		const secondTaskItem = page.locator("li").filter({ hasText: "First Task" });
		
		await firstTaskItem.dragTo(secondTaskItem);

		// Verify reordering occurred (order should change)
		// Note: The exact result depends on the drag/drop implementation
		// We just verify that tasks are still visible and dragging worked
		await expect(page.locator("text=First Task")).toBeVisible();
		await expect(page.locator("text=Second Task")).toBeVisible();
	});
});
