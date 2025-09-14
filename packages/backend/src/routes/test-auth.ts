import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sessionStore } from "../lib/session-store";
import { authMiddleware } from "../middleware/auth";
import { db } from "../config/firestore";

export async function testAuthRoutes(fastify: FastifyInstance) {
	if (process.env.NODE_ENV !== "test") {
		return;
	}

	fastify.addHook("preHandler", authMiddleware);

	fastify.post(
		"/api/test-auth/login",
		async (
			request: FastifyRequest<{
				Body: {
					userId?: string;
					name?: string;
					email?: string;
					picture?: string;
				};
			}>,
			reply: FastifyReply,
		) => {
			try {
				const {
					userId = "test-user",
					name = "Test User",
					email = "test@example.com",
					picture = "https://via.placeholder.com/100",
				} = request.body || {};

				const user = await sessionStore.createOrUpdateUser({
					userId,
					name,
					email,
					emailVerified: true,
					picture,
				});

				const clientIp =
					request.ip || request.socket.remoteAddress || "127.0.0.1";
				const userAgent = request.headers["user-agent"] || "playwright";

				const sessionId = await sessionStore.createSession(
					user.userId,
					clientIp,
					userAgent,
				);

				reply.setCookie("sid", sessionId, {
					httpOnly: true,
					secure: false,
					sameSite: "lax",
					path: "/",
					maxAge: 30 * 24 * 60 * 60, // 30 days
				});

				reply.send({ success: true, user, sessionId });
			} catch (error) {
				console.error("Test auth login error:", error);
				reply.code(500).send({ error: "Test authentication failed" });
			}
		},
	);

	fastify.post(
		"/api/test-auth/logout",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const sessionId = request.cookies.sid;
				if (sessionId) {
					await sessionStore.deleteSession(sessionId);
				}

				reply.clearCookie("sid", {
					path: "/",
				});

				reply.send({ success: true });
			} catch (error) {
				console.error("Test auth logout error:", error);
				reply.code(500).send({ error: "Test logout failed" });
			}
		},
	);

	// Clear only tasks for a specific user (preserving sessions)
	fastify.delete(
		"/api/test-auth/clear-tasks/:userId",
		async (
			request: FastifyRequest<{
				Params: {
					userId: string;
				};
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = request.params;

				// Clear user's tasks only
				const tasksQuery = db.collection("tasks").where("userId", "==", userId);
				const tasksSnapshot = await tasksQuery.get();
				
				const batch = db.batch();
				tasksSnapshot.docs.forEach((doc) => {
					batch.delete(doc.ref);
				});
				await batch.commit();

				reply.send({ 
					success: true, 
					deletedTasks: tasksSnapshot.docs.length,
					message: `Cleared ${tasksSnapshot.docs.length} tasks for user ${userId}`
				});
			} catch (error) {
				console.error("Test task cleanup error:", error);
				reply.code(500).send({ error: "Test task cleanup failed" });
			}
		},
	);

	// Clear all data for a specific user (tasks, sessions, etc.)
	fastify.delete(
		"/api/test-auth/clear-data/:userId",
		async (
			request: FastifyRequest<{
				Params: {
					userId: string;
				};
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = request.params;

				// Clear user's tasks
				const tasksQuery = db.collection("tasks").where("userId", "==", userId);
				const tasksSnapshot = await tasksQuery.get();
				
				const batch = db.batch();
				tasksSnapshot.docs.forEach((doc) => {
					batch.delete(doc.ref);
				});
				await batch.commit();

				// Clear user's sessions
				await sessionStore.deleteUserSessions(userId);

				reply.send({ 
					success: true, 
					deletedTasks: tasksSnapshot.docs.length,
					message: `Cleared data for user ${userId}`
				});
			} catch (error) {
				console.error("Test data cleanup error:", error);
				reply.code(500).send({ error: "Test data cleanup failed" });
			}
		},
	);

	// Clear all test data (use with caution)
	fastify.delete(
		"/api/test-auth/clear-all-data",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				// Clear all tasks
				const tasksSnapshot = await db.collection("tasks").get();
				const tasksBatch = db.batch();
				tasksSnapshot.docs.forEach((doc) => {
					tasksBatch.delete(doc.ref);
				});
				await tasksBatch.commit();

				// Clear all users
				const usersSnapshot = await db.collection("users").get();
				const usersBatch = db.batch();
				usersSnapshot.docs.forEach((doc) => {
					usersBatch.delete(doc.ref);
				});
				await usersBatch.commit();

				// Clear all sessions
				const sessionsSnapshot = await db.collection("sessions").get();
				const sessionsBatch = db.batch();
				sessionsSnapshot.docs.forEach((doc) => {
					sessionsBatch.delete(doc.ref);
				});
				await sessionsBatch.commit();

				reply.send({ 
					success: true, 
					deletedTasks: tasksSnapshot.docs.length,
					deletedUsers: usersSnapshot.docs.length,
					deletedSessions: sessionsSnapshot.docs.length,
					message: "Cleared all test data"
				});
			} catch (error) {
				console.error("Test data cleanup error:", error);
				reply.code(500).send({ error: "Complete test data cleanup failed" });
			}
		},
	);
}
