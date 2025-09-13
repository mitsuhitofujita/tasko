import type { Page } from "@playwright/test";

export interface TestUser {
	userId?: string;
	name?: string;
	email?: string;
	picture?: string;
}

export interface User {
	userId: string;
	name: string;
	email: string;
	picture: string;
}

export async function loginTestUser(
	page: Page,
	userData?: TestUser,
): Promise<void> {
	const defaultUser = {
		userId: "test-user",
		name: "Test User",
		email: "test@example.com",
		picture: "https://via.placeholder.com/100",
	};

	const user = { ...defaultUser, ...userData };

	await page.request.post("/api/test-auth/login", {
		data: user,
	});
}

export async function expectAuthenticated(
	page: Page,
): Promise<{ user: User; csrfToken: string }> {
	const response = await page.request.get("/api/user");
	if (!response.ok()) {
		throw new Error(`User not authenticated: ${response.status()}`);
	}
	return response.json();
}

export async function logout(page: Page): Promise<void> {
	try {
		const userResponse = await page.request.get("/api/user");
		if (userResponse.ok()) {
			const { csrfToken } = await userResponse.json();
			await page.request.post("/api/auth/logout", {
				headers: { "X-CSRF-Token": csrfToken },
			});
		}
	} catch (_error) {
		// If regular logout fails, try test auth logout
		await page.request.post("/api/test-auth/logout");
	}
}
