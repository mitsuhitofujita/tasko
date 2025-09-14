import { Dashboard } from "./components/Dashboard";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { useAuth } from "./hooks/useAuth";

function App() {
	const { user, csrfToken, loading, error, logout, clearError } = useAuth();

	if (loading) {
		return <LoadingSpinner />;
	}

	const isDashboard = window.location.pathname === "/dashboard";

	if (isDashboard) {
		if (!user) {
			window.location.href = "/";
			return null;
		}

		return <Dashboard user={user} csrfToken={csrfToken} onLogout={logout} />;
	}

	return (
		<div className="text-center p-8">
			<h1 className="text-4xl font-bold mb-8">Tasko</h1>

			{error && (
				<div className="text-red-700 p-4 mb-4 bg-red-100 border border-red-300 rounded">
					{error}
					<button
						type="button"
						onClick={clearError}
						className="float-right text-red-700 hover:text-red-900"
					>
						×
					</button>
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
