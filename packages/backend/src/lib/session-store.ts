import { createHash, randomBytes } from "node:crypto";
import { LRUCache } from "lru-cache";
import { db, type Session, type User } from "../config/firestore";

const CACHE_TTL = 60 * 1000; // 60 seconds
const LAST_SEEN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedSession extends Session {
	user: User;
	lastSeenUpdateTime: number;
}

class SessionStore {
	private cache = new LRUCache<string, CachedSession>({
		max: 1000,
		ttl: CACHE_TTL,
	});

	async createSession(
		userId: string,
		ipAddress: string,
		userAgent?: string,
	): Promise<string> {
		const sessionId = this.generateSessionId();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + SESSION_TTL);

		const session: Session = {
			userId,
			createdAt: now,
			expiresAt,
			lastSeenAt: now,
			csrfSecret: this.generateCsrfSecret(),
			ipHash: this.hashIp(ipAddress),
			uaHash: userAgent ? this.hashUserAgent(userAgent) : undefined,
		};

		const user = await this.getUser(userId);
		if (!user) {
			throw new Error("User not found");
		}

		await db.collection("sessions").doc(sessionId).set(session);

		this.cache.set(sessionId, {
			...session,
			user,
			lastSeenUpdateTime: now.getTime(),
		});

		return sessionId;
	}

	async getSession(
		sessionId: string,
	): Promise<{ session: Session; user: User } | null> {
		const cached = this.cache.get(sessionId);
		if (cached) {
			const now = Date.now();
			if (now - cached.lastSeenUpdateTime > LAST_SEEN_UPDATE_INTERVAL) {
				this.updateLastSeen(sessionId, new Date(now));
				cached.lastSeenUpdateTime = now;
			}
			return {
				session: {
					userId: cached.userId,
					createdAt: cached.createdAt,
					expiresAt: cached.expiresAt,
					lastSeenAt: cached.lastSeenAt,
					csrfSecret: cached.csrfSecret,
					ipHash: cached.ipHash,
					uaHash: cached.uaHash,
				},
				user: cached.user,
			};
		}

		const sessionDoc = await db.collection("sessions").doc(sessionId).get();
		if (!sessionDoc.exists) {
			return null;
		}

		const sessionData = sessionDoc.data();
		if (!sessionData) {
			return null;
		}

		// Convert Firestore timestamps to Date objects
		const session: Session = {
			userId: sessionData.userId,
			createdAt: sessionData.createdAt.toDate(),
			expiresAt: sessionData.expiresAt.toDate(),
			lastSeenAt: sessionData.lastSeenAt.toDate(),
			csrfSecret: sessionData.csrfSecret,
			ipHash: sessionData.ipHash,
			uaHash: sessionData.uaHash,
		};

		if (session.expiresAt.getTime() < Date.now()) {
			await this.deleteSession(sessionId);
			return null;
		}

		const user = await this.getUser(session.userId);
		if (!user) {
			await this.deleteSession(sessionId);
			return null;
		}

		const now = new Date();
		this.cache.set(sessionId, {
			...session,
			user,
			lastSeenUpdateTime: now.getTime(),
		});

		if (
			now.getTime() - session.lastSeenAt.getTime() >
			LAST_SEEN_UPDATE_INTERVAL
		) {
			this.updateLastSeen(sessionId, now);
		}

		return { session, user };
	}

	async deleteSession(sessionId: string): Promise<void> {
		this.cache.delete(sessionId);
		await db.collection("sessions").doc(sessionId).delete();
	}

	async createOrUpdateUser(
		userData: Omit<User, "createdAt" | "updatedAt" | "lastLoginAt">,
	): Promise<User> {
		const userRef = db.collection("users").doc(userData.userId);
		const userDoc = await userRef.get();
		const now = new Date();

		let user: User;
		if (userDoc.exists) {
			const existingUserData = userDoc.data();
			user = {
				...userData,
				createdAt: existingUserData?.createdAt?.toDate() || now,
				updatedAt: now,
				lastLoginAt: now,
			};
		} else {
			user = {
				...userData,
				createdAt: now,
				updatedAt: now,
				lastLoginAt: now,
			};
		}

		await userRef.set(user);
		return user;
	}

	private async getUser(userId: string): Promise<User | null> {
		const userDoc = await db.collection("users").doc(userId).get();
		if (!userDoc.exists) {
			return null;
		}

		const userData = userDoc.data();
		if (!userData) {
			return null;
		}

		// Convert Firestore timestamps to Date objects
		return {
			userId: userData.userId,
			name: userData.name,
			email: userData.email,
			emailVerified: userData.emailVerified,
			picture: userData.picture,
			createdAt: userData.createdAt.toDate(),
			updatedAt: userData.updatedAt.toDate(),
			lastLoginAt: userData.lastLoginAt.toDate(),
		};
	}

	private generateSessionId(): string {
		return randomBytes(32).toString("hex");
	}

	private generateCsrfSecret(): string {
		return randomBytes(32).toString("hex");
	}

	private hashIp(ip: string): string {
		return createHash("sha256").update(ip).digest("hex");
	}

	private hashUserAgent(userAgent: string): string {
		return createHash("sha256").update(userAgent).digest("hex");
	}

	private async updateLastSeen(
		sessionId: string,
		lastSeenAt: Date,
	): Promise<void> {
		try {
			await db.collection("sessions").doc(sessionId).update({ lastSeenAt });
		} catch (error) {
			console.error("Failed to update lastSeenAt:", error);
		}
	}
}

export const sessionStore = new SessionStore();
