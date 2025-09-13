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

interface Task {
	taskId: string;
	userId: string;
	title: string;
	description?: string;
	completed: boolean;
	priority: boolean;
	archived: boolean;
	order: number;
	createdAt: string;
	updatedAt: string;
}

function Dashboard({
	user,
	csrfToken,
	onLogout,
}: {
	user: User;
	csrfToken: string;
	onLogout: () => void;
}) {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState("");
	const [draggedTask, setDraggedTask] = useState<Task | null>(null);

	const fetchTasks = useCallback(async () => {
		try {
			const response = await fetch("/api/tasks", {
				credentials: "include",
			});

			if (response.ok) {
				const tasksData: Task[] = await response.json();
				setTasks(tasksData);
			} else {
				setError("Failed to fetch tasks");
			}
		} catch (err) {
			console.error("Error fetching tasks:", err);
			setError("Failed to fetch tasks");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	const addTask = async () => {
		if (!newTaskTitle.trim()) return;

		try {
			const response = await fetch("/api/tasks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				credentials: "include",
				body: JSON.stringify({ title: newTaskTitle.trim() }),
			});

			if (response.ok) {
				const newTask: Task = await response.json();
				setTasks([newTask, ...tasks]);
				setNewTaskTitle("");
			} else {
				setError("Failed to add task");
			}
		} catch (err) {
			console.error("Error adding task:", err);
			setError("Failed to add task");
		}
	};

	const updateTask = async (taskId: string, updates: Partial<Task>) => {
		try {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				credentials: "include",
				body: JSON.stringify(updates),
			});

			if (response.ok) {
				const updatedTask: Task = await response.json();
				setTasks(
					tasks.map((task) => (task.taskId === taskId ? updatedTask : task)),
				);
			} else {
				setError("Failed to update task");
			}
		} catch (err) {
			console.error("Error updating task:", err);
			setError("Failed to update task");
		}
	};

	const updateTaskOrder = async (taskId: string, newOrder: number) => {
		try {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": csrfToken,
				},
				credentials: "include",
				body: JSON.stringify({ order: newOrder }),
			});

			if (!response.ok) {
				throw new Error(`Failed to update task order: ${response.status}`);
			}
		} catch (error) {
			console.error("Failed to update task order:", error);
			throw error;
		}
	};

	const deleteTask = async (taskId: string) => {
		try {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: "DELETE",
				headers: {
					"X-CSRF-Token": csrfToken,
				},
				credentials: "include",
			});

			if (response.ok) {
				setTasks(tasks.filter((task) => task.taskId !== taskId));
			} else {
				setError("Failed to delete task");
			}
		} catch (err) {
			console.error("Error deleting task:", err);
			setError("Failed to delete task");
		}
	};

	const startEditing = (task: Task) => {
		setEditingTaskId(task.taskId);
		setEditingTitle(task.title);
	};

	const saveEdit = async () => {
		if (!editingTaskId || !editingTitle.trim()) return;

		await updateTask(editingTaskId, { title: editingTitle.trim() });
		setEditingTaskId(null);
		setEditingTitle("");
	};

	const cancelEdit = () => {
		setEditingTaskId(null);
		setEditingTitle("");
	};

	const handleDragStart = (task: Task) => {
		setDraggedTask(task);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = async (targetTask: Task) => {
		if (!draggedTask || draggedTask.taskId === targetTask.taskId) return;

		const draggedIndex = tasks.findIndex(
			(t) => t.taskId === draggedTask.taskId,
		);
		const targetIndex = tasks.findIndex((t) => t.taskId === targetTask.taskId);

		if (draggedIndex === -1 || targetIndex === -1) return;

		// Calculate new order value (smaller values = higher position)
		let newOrder: number;
		
		// Get the target position after the drag operation
		const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
		
		if (draggedIndex < targetIndex) {
			// Moving down: place after target task
			if (targetIndex === tasks.length - 1) {
				// Moving to bottom
				newOrder = targetTask.order + 500;
			} else {
				// Place between target and next task
				const nextTask = sortedTasks[targetIndex + 1];
				newOrder = (targetTask.order + nextTask.order) / 2;
			}
		} else {
			// Moving up: place before target task
			if (targetIndex === 0) {
				// Moving to top
				newOrder = targetTask.order - 500;
			} else {
				// Place between previous and target task
				const prevTask = sortedTasks[targetIndex - 1];
				newOrder = (prevTask.order + targetTask.order) / 2;
			}
		}

		// Optimistically update UI
		const newTasks = [...tasks];
		const [draggedTaskItem] = newTasks.splice(draggedIndex, 1);
		newTasks.splice(targetIndex, 0, { ...draggedTaskItem, order: newOrder });
		setTasks(newTasks);

		// Update on server
		try {
			await updateTaskOrder(draggedTask.taskId, newOrder);
			console.log(`Task ${draggedTask.title} moved to order ${newOrder}`);
		} catch (error) {
			console.error("Failed to update task order:", error);
			// Revert optimistic update on failure
			await fetchTasks();
		}
		setDraggedTask(null);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<p className="text-lg text-gray-600">Loading...</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-4xl mx-auto p-6">
				{/* Header */}
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<img
								src={user.picture}
								alt="Profile"
								className="w-12 h-12 rounded-full"
							/>
							<div>
								<h1 className="text-2xl font-bold text-gray-900">
									{user.name}
								</h1>
								<p className="text-gray-600 text-sm">{user.email}</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onLogout}
							className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
						>
							Logout
						</button>
					</div>
				</div>

				{/* Error message */}
				{error && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
						{error}
						<button
							type="button"
							onClick={() => setError("")}
							className="float-right text-red-700 hover:text-red-900"
						>
							×
						</button>
					</div>
				)}

				{/* Add Task */}
				<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
					<div className="flex gap-3">
						<input
							type="text"
							value={newTaskTitle}
							onChange={(e) => setNewTaskTitle(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && addTask()}
							placeholder="Add a new task..."
							className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
						/>
						<button
							type="button"
							onClick={addTask}
							disabled={!newTaskTitle.trim()}
							className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
						>
							➕ Add
						</button>
					</div>
				</div>

				{/* Task List */}
				<div className="bg-white rounded-lg shadow-sm">
					{tasks.length === 0 ? (
						<div className="p-12 text-center text-gray-500">
							<p className="text-lg">No tasks yet!</p>
							<p className="text-sm">Add a task above to get started.</p>
						</div>
					) : (
						<ul className="divide-y divide-gray-200">
							{tasks.map((task, _index) => (
								<li
									key={task.taskId}
									draggable
									onDragStart={() => handleDragStart(task)}
									onDragOver={handleDragOver}
									onDrop={() => handleDrop(task)}
									className={`p-4 hover:bg-gray-50 transition-colors cursor-move group ${
										task.completed ? "opacity-60" : ""
									} ${task.priority ? "bg-yellow-50 border-l-4 border-yellow-400" : ""}`}
								>
									<div className="flex items-center gap-3">
										{/* Drag handle */}
										<div className="text-gray-400 hover:text-gray-600 cursor-grab">
											⋮⋮
										</div>

										{/* Task content */}
										<div className="flex-1">
											{editingTaskId === task.taskId ? (
												<div className="flex gap-2">
													<input
														type="text"
														value={editingTitle}
														onChange={(e) => setEditingTitle(e.target.value)}
														onKeyDown={(e) => e.key === "Enter" && saveEdit()}
														onBlur={saveEdit}
														className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
													/>
													<button
														type="button"
														onClick={cancelEdit}
														className="text-gray-500 hover:text-gray-700"
													>
														✕
													</button>
												</div>
											) : (
												<button
													type="button"
													onClick={() => startEditing(task)}
													className={`cursor-text text-left w-full ${task.completed ? "line-through" : ""}`}
												>
													<span className="text-gray-900">{task.title}</span>
													{task.description && (
														<p className="text-sm text-gray-600 mt-1">
															{task.description}
														</p>
													)}
												</button>
											)}
										</div>

										{/* Action buttons (shown on hover) */}
										<div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
											<button
												type="button"
												onClick={() =>
													updateTask(task.taskId, {
														completed: !task.completed,
													})
												}
												className={`p-2 rounded ${
													task.completed
														? "text-green-600 hover:bg-green-100"
														: "text-gray-400 hover:bg-green-100 hover:text-green-600"
												} transition-colors`}
												title={
													task.completed
														? "Mark as incomplete"
														: "Mark as complete"
												}
											>
												✓
											</button>
											<button
												type="button"
												onClick={() =>
													updateTask(task.taskId, { priority: !task.priority })
												}
												className={`p-2 rounded ${
													task.priority
														? "text-yellow-600 hover:bg-yellow-100"
														: "text-gray-400 hover:bg-yellow-100 hover:text-yellow-600"
												} transition-colors`}
												title={
													task.priority ? "Remove priority" : "Mark as priority"
												}
											>
												✨
											</button>
											<button
												type="button"
												onClick={() =>
													updateTask(task.taskId, { archived: true })
												}
												className="p-2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
												title="Archive task"
											>
												📦
											</button>
											<button
												type="button"
												onClick={() => deleteTask(task.taskId)}
												className="p-2 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
												title="Delete task"
											>
												🗑️
											</button>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
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
				body: JSON.stringify({}),
			});

			if (response.ok) {
				setUser(null);
				setCsrfToken("");
				window.location.href = "/";
			} else {
				const errorText = await response.text();
				console.error("Logout failed with status:", response.status, errorText);
				setError(`Logout failed: ${response.status}`);
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
			<Dashboard user={user} csrfToken={csrfToken} onLogout={handleLogout} />
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
