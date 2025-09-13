import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { auditLogger } from "../lib/audit-log";
import { googleAuth } from "../lib/google-auth";
import { sessionStore } from "../lib/session-store";
import { authMiddleware, requireAuth, verifyCsrf } from "../middleware/auth";

export async function authRoutes(fastify: FastifyInstance) {
	fastify.addHook("preHandler", authMiddleware);

	fastify.get(
		"/api/auth/google/login",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { url } = googleAuth.generateAuthUrl();
				reply.redirect(url);
			} catch (error) {
				console.error("Login initiation error:", error);
				const clientIp =
					request.ip || request.socket.remoteAddress || "unknown";
				await auditLogger.log("error", {
					ipAddress: clientIp,
					userAgent: request.headers["user-agent"],
					metadata: { error: "login_initiation_failed" },
				});
				reply.code(500).send({ error: "Failed to initiate login" });
			}
		},
	);

	fastify.get(
		"/api/auth/google/callback",
		async (
			request: FastifyRequest<{
				Querystring: { code?: string; state?: string; error?: string };
			}>,
			reply: FastifyReply,
		) => {
			const clientIp = request.ip || request.socket.remoteAddress || "unknown";
			const userAgent = request.headers["user-agent"];

			try {
				if (request.query.error) {
					await auditLogger.log("error", {
						ipAddress: clientIp,
						userAgent,
						metadata: { error: "oauth_error", details: request.query.error },
					});
					return reply.redirect("/?error=oauth_denied");
				}

				const { code, state } = request.query;
				if (!code || !state) {
					await auditLogger.log("error", {
						ipAddress: clientIp,
						userAgent,
						metadata: { error: "missing_oauth_params" },
					});
					return reply.redirect("/?error=invalid_request");
				}

				const userInfo = await googleAuth.verifyCallback(code, state);

				const user = await sessionStore.createOrUpdateUser({
					userId: userInfo.sub,
					name: userInfo.name,
					email: userInfo.email,
					emailVerified: userInfo.emailVerified,
					picture: userInfo.picture,
				});

				const sessionId = await sessionStore.createSession(
					user.userId,
					clientIp,
					userAgent,
				);

				reply.setCookie("sid", sessionId, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "lax",
					path: "/",
					maxAge: 30 * 24 * 60 * 60, // 30 days
				});

				await auditLogger.log("login", {
					userId: user.userId,
					sessionId,
					ipAddress: clientIp,
					userAgent,
				});

				reply.redirect("/dashboard");
			} catch (error) {
				console.error("Callback error:", error);
				await auditLogger.log("error", {
					ipAddress: clientIp,
					userAgent,
					metadata: {
						error: "callback_failed",
						details: error instanceof Error ? error.message : "unknown",
					},
				});
				reply.redirect("/?error=auth_failed");
			}
		},
	);

	fastify.post(
		"/api/auth/logout",
		{
			preHandler: [requireAuth, verifyCsrf],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const sessionId = request.cookies.sid;
			const clientIp = request.ip || request.socket.remoteAddress || "unknown";
			const userAgent = request.headers["user-agent"];

			try {
				if (sessionId) {
					await sessionStore.deleteSession(sessionId);
				}

				reply.clearCookie("sid", {
					path: "/",
				});

				await auditLogger.log("logout", {
					userId: request.user?.userId,
					sessionId,
					ipAddress: clientIp,
					userAgent,
				});

				reply.send({ success: true });
			} catch (error) {
				console.error("Logout error:", error);
				await auditLogger.log("error", {
					userId: request.user?.userId,
					sessionId,
					ipAddress: clientIp,
					userAgent,
					metadata: { error: "logout_failed" },
				});
				reply.code(500).send({ error: "Logout failed" });
			}
		},
	);

	fastify.get(
		"/api/user",
		{ preHandler: requireAuth },
		async (request: FastifyRequest, reply: FastifyReply) => {
			reply.send({
				user: request.user,
				csrfToken: request.csrfToken,
			});
		},
	);
}
