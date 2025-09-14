import path from "node:path";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import type { FastifyReply } from "fastify";
import fastify from "fastify";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";
import { testAuthRoutes } from "./routes/test-auth";

const server = fastify();

// Register plugins
server.register(fastifyCookie);
server.register(fastifyCors, {
	origin: process.env.NODE_ENV !== "production",
	credentials: true,
});

// Register auth routes
server.register(authRoutes);

// Register task routes
server.register(taskRoutes);

// Register test auth routes (only in test environment)
server.register(testAuthRoutes);

// Apply auth middleware globally for protected routes
server.addHook("preHandler", authMiddleware);

// Serve API
server.get("/ping", async (_request, _reply) => {
	return "pong\n";
});

// Serve frontend static files (SPA) from packages/frontend/dist
const distPath = path.join(__dirname, "..", "..", "frontend", "dist");

server.register(fastifyStatic, {
	root: distPath,
	prefix: "/",
});

// SPA fallback: serve index.html for unknown routes
server.setNotFoundHandler(
	(_request, reply: FastifyReply & { sendFile?: (file: string) => void }) => {
		// reply.sendFile comes from fastify-static plugin; call it if available
		if (reply.sendFile) {
			reply.sendFile("index.html");
		} else {
			reply.type("text/html").send("index.html");
		}
	},
);

server.listen({ port: 3000 }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});
