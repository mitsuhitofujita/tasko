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
			const auditLog: Partial<AuditLog> = {
				event,
				ipHash: this.hashIp(options.ipAddress),
				timestamp: new Date(),
			};

			// Only add fields that are not undefined
			if (options.userId !== undefined) {
				auditLog.userId = options.userId;
			}
			if (options.sessionId !== undefined) {
				auditLog.sessionId = options.sessionId;
			}
			if (options.userAgent !== undefined) {
				auditLog.userAgent = options.userAgent;
			}
			if (options.metadata !== undefined) {
				auditLog.metadata = options.metadata;
			}

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
