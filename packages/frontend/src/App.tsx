import { useCallback, useEffect, useState } from "react";

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
			<div className="text-center p-8">
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
			<div className="p-8 max-w-xl mx-auto">
				<h1 className="text-3xl font-bold mb-6">Dashboard</h1>
				<div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
					<div className="flex items-center gap-4 mb-4">
						<img
							src={user.picture}
							alt="Profile"
							className="w-16 h-16 rounded-full"
						/>
						<div>
							<h2 className="text-xl font-semibold m-0">{user.name}</h2>
							<p className="text-gray-600 m-0 mt-1">{user.email}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleLogout}
						className="bg-red-600 text-white border-none px-4 py-2 rounded cursor-pointer hover:bg-red-700 transition-colors"
					>
						Logout
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="text-center p-8">
			<h1 className="text-4xl font-bold mb-8">Tasko</h1>

			{error && (
				<div className="text-red-700 p-4 mb-4 bg-red-100 border border-red-300 rounded">
					{error}
				</div>
			)}

			{user ? (
				<div>
					<p className="mb-4">Welcome back, {user.name}!</p>
					<a
						href="/dashboard"
						className="inline-block bg-blue-600 text-white px-6 py-3 no-underline rounded mt-4 hover:bg-blue-700 transition-colors"
					>
						Go to Dashboard
					</a>
				</div>
			) : (
				<div>
					<p className="mb-6 text-gray-600">
						A simple task management application
					</p>
					<a
						href="/api/auth/google/login"
						className="inline-block bg-red-600 text-white px-6 py-3 no-underline rounded mt-4 hover:bg-red-700 transition-colors"
					>
						Sign in with Google
					</a>
				</div>
			)}
		</div>
	);
}

export default App;
