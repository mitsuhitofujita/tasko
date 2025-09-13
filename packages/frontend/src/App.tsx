import { useCallback, useEffect, useState } from "react";
import "./App.css";

interface User {
	userId: string;
	name: string;
	email: string;
	picture: string;
}

interface UserData {
	user: User;
	csrfToken: string;
}

function App() {
	const [user, setUser] = useState<User | null>(null);
	const [csrfToken, setCsrfToken] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");

	const checkAuth = useCallback(async () => {
		try {
			const response = await fetch("/api/user", {
				credentials: "include",
			});

			if (response.ok) {
				const data: UserData = await response.json();
				setUser(data.user);
				setCsrfToken(data.csrfToken);
			}
		} catch (err) {
			console.error("Auth check failed:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		checkAuth();

		const urlParams = new URLSearchParams(window.location.search);
		const errorParam = urlParams.get("error");
		if (errorParam) {
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
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, [checkAuth]);

	const handleLogout = async () => {
		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "include",
				headers: {
					"X-CSRF-Token": csrfToken,
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				setUser(null);
				setCsrfToken("");
				window.location.href = "/";
			}
		} catch (err) {
			console.error("Logout failed:", err);
			setError("Logout failed");
		}
	};

	if (loading) {
		return (
			<div style={{ textAlign: "center", padding: "2rem" }}>
				<p>Loading...</p>
			</div>
		);
	}

	const isDashboard = window.location.pathname === "/dashboard";

	if (isDashboard) {
		if (!user) {
			window.location.href = "/";
			return null;
		}

		return (
			<div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
				<h1>Dashboard</h1>
				<div
					style={{
						border: "1px solid #ddd",
						borderRadius: "8px",
						padding: "1.5rem",
						backgroundColor: "#f9f9f9",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "1rem",
							marginBottom: "1rem",
						}}
					>
						<img
							src={user.picture}
							alt="Profile"
							style={{ width: "64px", height: "64px", borderRadius: "50%" }}
						/>
						<div>
							<h2 style={{ margin: 0 }}>{user.name}</h2>
							<p style={{ margin: "0.25rem 0", color: "#666" }}>{user.email}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleLogout}
						style={{
							backgroundColor: "#dc3545",
							color: "white",
							border: "none",
							padding: "0.5rem 1rem",
							borderRadius: "4px",
							cursor: "pointer",
						}}
					>
						Logout
					</button>
				</div>
			</div>
		);
	}

	return (
		<div style={{ textAlign: "center", padding: "2rem" }}>
			<h1>Tasko</h1>

			{error && (
				<div
					style={{
						color: "#dc3545",
						padding: "1rem",
						marginBottom: "1rem",
						backgroundColor: "#f8d7da",
						border: "1px solid #f5c6cb",
						borderRadius: "4px",
					}}
				>
					{error}
				</div>
			)}

			{user ? (
				<div>
					<p>Welcome back, {user.name}!</p>
					<a
						href="/dashboard"
						style={{
							display: "inline-block",
							backgroundColor: "#007bff",
							color: "white",
							padding: "0.75rem 1.5rem",
							textDecoration: "none",
							borderRadius: "4px",
							marginTop: "1rem",
						}}
					>
						Go to Dashboard
					</a>
				</div>
			) : (
				<div>
					<p>A simple task management application</p>
					<a
						href="/api/auth/google/login"
						style={{
							display: "inline-block",
							backgroundColor: "#db4437",
							color: "white",
							padding: "0.75rem 1.5rem",
							textDecoration: "none",
							borderRadius: "4px",
							marginTop: "1rem",
						}}
					>
						Sign in with Google
					</a>
				</div>
			)}
		</div>
	);
}

export default App;
