import { createHash } from "node:crypto";
import { type AuditLog, db } from "../config/firestore";

class AuditLogger {
	async log(
		event: AuditLog["event"],
		options: {
			userId?: string;
			sessionId?: string;
			ipAddress: string;
			userAgent?: string;
			metadata?: Record<string, unknown>;
		},
	): Promise<void> {
		try {
			const auditLog: AuditLog = {
				event,
				userId: options.userId,
				sessionId: options.sessionId,
				ipHash: this.hashIp(options.ipAddress),
				userAgent: options.userAgent,
				timestamp: new Date(),
				metadata: options.metadata,
			};

			await db.collection("audit_logs").add(auditLog);
		} catch (error) {
			console.error("Failed to write audit log:", error);
		}
	}

	private hashIp(ip: string): string {
		return createHash("sha256").update(ip).digest("hex");
	}
}

export const auditLogger = new AuditLogger();
