import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyReply } from "fastify";
import fastify from "fastify";

const server = fastify();

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
