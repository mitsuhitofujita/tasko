export interface User {
	userId: string;
	name: string;
	email: string;
	picture: string;
}

export interface UserData {
	user: User;
	csrfToken: string;
}

export interface Task {
	taskId: string;
	userId: string;
	title: string;
	description?: string;
	completed: boolean;
	priority: boolean;
	archived: boolean;
	order: number;
	createdAt: string;
	updatedAt: string;
}
