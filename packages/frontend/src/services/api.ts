import type { Task } from "../types";

export class APIError extends Error {
	public status?: number;

	constructor(message: string, status?: number) {
		super(message);
		this.name = "APIError";
		this.status = status;
	}
}

export const taskAPI = {
	async fetchTasks(includeArchived = false): Promise<Task[]> {
		const response = await fetch("/api/tasks", {
			credentials: "include",
		});

		if (!response.ok) {
			throw new APIError("Failed to fetch tasks", response.status);
		}

		const tasks: Task[] = await response.json();
		
		// Filter tasks based on archive status
		return includeArchived
			? tasks.filter((task) => task.archived)
			: tasks.filter((task) => !task.archived);
	},

	async createTask(title: string, csrfToken: string): Promise<Task> {
		const response = await fetch("/api/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": csrfToken,
			},
			credentials: "include",
			body: JSON.stringify({ title: title.trim() }),
		});

		if (!response.ok) {
			throw new APIError("Failed to add task", response.status);
		}

		return response.json();
	},

	async updateTask(
		taskId: string,
		updates: Partial<Task>,
		csrfToken: string,
	): Promise<Task> {
		const response = await fetch(`/api/tasks/${taskId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": csrfToken,
			},
			credentials: "include",
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			throw new APIError("Failed to update task", response.status);
		}

		return response.json();
	},

	async deleteTask(taskId: string, csrfToken: string): Promise<void> {
		const response = await fetch(`/api/tasks/${taskId}`, {
			method: "DELETE",
			headers: {
				"X-CSRF-Token": csrfToken,
			},
			credentials: "include",
		});

		if (!response.ok) {
			throw new APIError("Failed to delete task", response.status);
		}
	},

	async updateTaskOrder(
		taskId: string,
		newOrder: number,
		csrfToken: string,
	): Promise<void> {
		const response = await fetch(`/api/tasks/${taskId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-Token": csrfToken,
			},
			credentials: "include",
			body: JSON.stringify({ order: newOrder }),
		});

		if (!response.ok) {
			throw new APIError(
				`Failed to update task order: ${response.status}`,
				response.status,
			);
		}
	},
};

export const authAPI = {
	async fetchUser() {
		const response = await fetch("/api/user", {
			credentials: "include",
		});

		if (!response.ok) {
			throw new APIError("Failed to fetch user", response.status);
		}

		return response.json();
	},

	async logout(csrfToken: string): Promise<void> {
		const response = await fetch("/api/auth/logout", {
			method: "POST",
			credentials: "include",
			headers: {
				"X-CSRF-Token": csrfToken,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new APIError(
				`Logout failed: ${response.status} ${errorText}`,
				response.status,
			);
		}
	},
};
