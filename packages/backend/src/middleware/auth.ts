import type { FastifyReply, FastifyRequest } from "fastify";
import type { Session, User } from "../config/firestore";
import { sessionStore } from "../lib/session-store";

declare module "fastify" {
	interface FastifyRequest {
		user?: User;
		session?: Session;
		csrfToken?: string;
	}
}

export async function authMiddleware(
	request: FastifyRequest,
	_reply: FastifyReply,
): Promise<void> {
	const sessionId = request.cookies.sid;
	if (!sessionId) {
		return;
	}

	try {
		const result = await sessionStore.getSession(sessionId);
		if (result) {
			request.user = result.user;
			request.session = result.session;
			request.csrfToken = result.session.csrfSecret;
		}
	} catch (error) {
		console.error("Auth middleware error:", error);
	}
}

export async function requireAuth(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (!request.user) {
		reply.code(401).send({ error: "Unauthorized" });
		return;
	}
}

export async function verifyCsrf(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (request.method !== "POST") {
		return;
	}

	const csrfToken = request.headers["x-csrf-token"];
	if (!csrfToken || !request.csrfToken || csrfToken !== request.csrfToken) {
		reply.code(403).send({ error: "Invalid CSRF token" });
		return;
	}
}
