import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI,
);

interface PKCEData {
	codeVerifier: string;
	codeChallenge: string;
}

interface AuthState {
	state: string;
	nonce: string;
	pkce: PKCEData;
}

export class GoogleAuthService {
	private stateStore = new Map<string, AuthState>();

	generatePKCE(): PKCEData {
		const codeVerifier = randomBytes(32).toString("base64url");
		const codeChallenge = createHash("sha256")
			.update(codeVerifier)
			.digest("base64url");

		return { codeVerifier, codeChallenge };
	}

	generateAuthUrl(): { url: string; state: string } {
		const state = randomBytes(32).toString("hex");
		const nonce = randomBytes(32).toString("hex");
		const pkce = this.generatePKCE();

		this.stateStore.set(state, { state, nonce, pkce });

		setTimeout(
			() => {
				this.stateStore.delete(state);
			},
			10 * 60 * 1000,
		); // 10 minutes

		const url = client.generateAuthUrl({
			access_type: "offline",
			scope: ["openid", "email", "profile"],
			state,
			nonce,
			code_challenge: pkce.codeChallenge,
			code_challenge_method: "S256",
		} as any);

		return { url, state };
	}

	async verifyCallback(
		code: string,
		state: string,
	): Promise<{
		sub: string;
		email: string;
		name: string;
		picture: string;
		emailVerified: boolean;
	}> {
		const authState = this.stateStore.get(state);
		if (!authState) {
			throw new Error("Invalid state parameter");
		}

		this.stateStore.delete(state);

		try {
			const { tokens } = await client.getToken({
				code,
				codeVerifier: authState.pkce.codeVerifier,
			});

			if (!tokens.id_token) {
				throw new Error("No ID token received");
			}

			const ticket = await client.verifyIdToken({
				idToken: tokens.id_token,
				audience: process.env.GOOGLE_CLIENT_ID,
			});

			const payload = ticket.getPayload();
			if (!payload) {
				throw new Error("Invalid ID token payload");
			}

			if (payload.nonce !== authState.nonce) {
				throw new Error("Invalid nonce");
			}

			return {
				sub: payload.sub,
				email: payload.email || "",
				name: payload.name || "",
				picture: payload.picture || "",
				emailVerified: payload.email_verified || false,
			};
		} catch (error) {
			console.error("Google auth verification error:", error);
			throw new Error("Authentication failed");
		}
	}
}

export const googleAuth = new GoogleAuthService();
