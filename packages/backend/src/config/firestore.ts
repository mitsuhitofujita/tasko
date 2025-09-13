import { Firestore } from "@google-cloud/firestore";

export const db = new Firestore({
	projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

export interface User {
	userId: string;
	name: string;
	email: string;
	emailVerified: boolean;
	picture: string;
	createdAt: Date;
	updatedAt: Date;
	lastLoginAt: Date;
}

export interface Session {
	userId: string;
	createdAt: Date;
	expiresAt: Date;
	lastSeenAt: Date;
	csrfSecret: string;
	ipHash: string;
	uaHash?: string;
}

export interface AuditLog {
	event: "login" | "logout" | "error";
	userId?: string;
	sessionId?: string;
	ipHash: string;
	userAgent?: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
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
	createdAt: Date;
	updatedAt: Date;
}
