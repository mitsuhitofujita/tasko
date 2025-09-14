import { useCallback, useState } from "react";
import { APIError, taskAPI } from "../services/api";
import type { Task } from "../types";

export const useTasks = (csrfToken: string) => {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [showArchived, setShowArchived] = useState(false);

	const fetchTasks = useCallback(async (includeArchived = false) => {
		try {
			setLoading(true);
			const tasksData = await taskAPI.fetchTasks(includeArchived);
			setTasks(tasksData);
			setError("");
		} catch (err) {
			console.error("Error fetching tasks:", err);
			setError(err instanceof APIError ? err.message : "Failed to fetch tasks");
		} finally {
			setLoading(false);
		}
	}, []);

	const toggleArchiveView = useCallback(async () => {
		const newShowArchived = !showArchived;
		setShowArchived(newShowArchived);
		await fetchTasks(newShowArchived);
	}, [showArchived, fetchTasks]);

	const addTask = async (title: string) => {
		if (!title.trim()) return;

		try {
			const newTask = await taskAPI.createTask(title, csrfToken);
			setTasks([newTask, ...tasks]);
			setError("");
		} catch (err) {
			console.error("Error adding task:", err);
			setError(err instanceof APIError ? err.message : "Failed to add task");
		}
	};

	const updateTask = async (taskId: string, updates: Partial<Task>) => {
		try {
			const updatedTask = await taskAPI.updateTask(taskId, updates, csrfToken);

			// If archiving/unarchiving, remove from current view
			if ("archived" in updates) {
				setTasks(tasks.filter((task) => task.taskId !== taskId));
			} else {
				setTasks(
					tasks.map((task) => (task.taskId === taskId ? updatedTask : task)),
				);
			}
			setError("");
		} catch (err) {
			console.error("Error updating task:", err);
			setError(err instanceof APIError ? err.message : "Failed to update task");
		}
	};

	const deleteTask = async (taskId: string) => {
		try {
			await taskAPI.deleteTask(taskId, csrfToken);
			setTasks(tasks.filter((task) => task.taskId !== taskId));
			setError("");
		} catch (err) {
			console.error("Error deleting task:", err);
			setError(err instanceof APIError ? err.message : "Failed to delete task");
		}
	};

	const updateTaskOrder = async (taskId: string, newOrder: number) => {
		try {
			await taskAPI.updateTaskOrder(taskId, newOrder, csrfToken);
		} catch (error) {
			console.error("Failed to update task order:", error);
			throw error;
		}
	};

	const clearError = () => setError("");

	return {
		tasks,
		loading,
		error,
		showArchived,
		fetchTasks,
		addTask,
		updateTask,
		deleteTask,
		updateTaskOrder,
		toggleArchiveView,
		clearError,
		setTasks, // for optimistic updates
	};
};
