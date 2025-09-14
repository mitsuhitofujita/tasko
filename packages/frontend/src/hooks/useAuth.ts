import { useCallback, useEffect, useState } from "react";
import { APIError, authAPI } from "../services/api";
import type { User, UserData } from "../types";

export const useAuth = () => {
	const [user, setUser] = useState<User | null>(null);
	const [csrfToken, setCsrfToken] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");

	const checkAuth = useCallback(async () => {
		try {
			setLoading(true);
			const data: UserData = await authAPI.fetchUser();
			setUser(data.user);
			setCsrfToken(data.csrfToken);
			setError("");
		} catch (err) {
			console.error("Auth check failed:", err);
			// Auth failure is not necessarily an error - user might just not be logged in
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = async () => {
		try {
			await authAPI.logout(csrfToken);
			setUser(null);
			setCsrfToken("");
			setError("");
			window.location.href = "/";
		} catch (err) {
			console.error("Logout failed:", err);
			setError(err instanceof APIError ? err.message : "Logout failed");
		}
	};

	const handleAuthError = useCallback((errorParam: string) => {
		switch (errorParam) {
			case "oauth_denied":
				setError("Google sign-in was cancelled");
				break;
			case "invalid_request":
				setError("Invalid authentication request");
				break;
			case "auth_failed":
				setError("Authentication failed");
				break;
			default:
				setError("An error occurred during sign-in");
		}
		// Clean up URL
		window.history.replaceState({}, "", window.location.pathname);
	}, []);

	const clearError = () => setError("");

	useEffect(() => {
		checkAuth();

		// Check for auth errors in URL params
		const urlParams = new URLSearchParams(window.location.search);
		const errorParam = urlParams.get("error");
		if (errorParam) {
			handleAuthError(errorParam);
		}
	}, [checkAuth, handleAuthError]);

	return {
		user,
		csrfToken,
		loading,
		error,
		logout,
		clearError,
	};
};
