import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sessionStore } from "../lib/session-store";
import { authMiddleware } from "../middleware/auth";

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
}
