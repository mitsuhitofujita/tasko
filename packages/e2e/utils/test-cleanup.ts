import type { Page } from "@playwright/test";

export async function clearFirestoreData(): Promise<void> {
	try {
		const response = await fetch("http://localhost:8080/emulator/v1/projects/tasko-test/databases/(default)/documents", {
			method: "DELETE",
		});
		
		if (!response.ok) {
			console.warn("Failed to clear Firestore data via REST API");
		}
	} catch (error) {
		console.warn("Error clearing Firestore data:", error);
		// Continue anyway as this is not critical
	}
}

export async function clearUserTasks(page: Page, userId?: string): Promise<void> {
	try {
		// Use the existing clear-data API endpoint (clears all user data including tasks)
		const testUserId = userId || "test-user-123";
		const response = await page.request.delete(`/api/test-auth/clear-data/${testUserId}`);
		
		if (!response.ok()) {
			console.warn(`Failed to clear user data via API: ${response.status()}`);
		}
	} catch (error) {
		console.warn("Error clearing user data via API:", error);
	}
}

export async function cleanupTasksViaUI(page: Page): Promise<void> {
	try {
		await page.goto("/dashboard");
		
		// Wait for page to load
		const headerLocator = page.locator("h1");
		await headerLocator.waitFor({ timeout: 10000 });
		
		// Delete all tasks via UI
		let attempts = 0;
		const maxAttempts = 20; // Prevent infinite loop
		
		while (attempts < maxAttempts) {
			const existingTasks = page.locator("li").filter({ hasText: /./ });
			const taskCount = await existingTasks.count();
			
			if (taskCount === 0) {
				break;
			}
			
			const task = existingTasks.first();
			
			try {
				await task.hover({ timeout: 2000 });
				const deleteButton = task.locator('button[title*="Delete task"]');
				const deleteButtonCount = await deleteButton.count();
				
				if (deleteButtonCount > 0) {
					await deleteButton.click({ timeout: 2000 });
					// Wait a bit for the delete to process
					await page.waitForTimeout(500);
				} else {
					// If no delete button found, break to prevent infinite loop
					break;
				}
			} catch (error) {
				console.warn("Error deleting task via UI:", error);
				break;
			}
			
			attempts++;
		}
		
		if (attempts >= maxAttempts) {
			console.warn("Reached maximum cleanup attempts, some tasks may remain");
		}
	} catch (error) {
		console.warn("Error during UI cleanup:", error);
	}
}