import { useEffect } from "react";
import { useTasks } from "../hooks/useTasks";
import type { User } from "../types";
import {
	AddTaskForm,
	ErrorMessage,
	Header,
	LoadingSpinner,
	TaskList,
} from "./";

interface DashboardProps {
	user: User;
	csrfToken: string;
	onLogout: () => void;
}

export const Dashboard = ({ user, csrfToken, onLogout }: DashboardProps) => {
	const {
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
		setTasks,
	} = useTasks(csrfToken);

	useEffect(() => {
		fetchTasks(false); // Initially load active tasks
	}, [fetchTasks]);

	if (loading) {
		return <LoadingSpinner />;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-4xl mx-auto p-6">
				<Header user={user} onLogout={onLogout} />

				{error && <ErrorMessage error={error} onClose={clearError} />}

				{!showArchived && <AddTaskForm onAddTask={addTask} />}

				{/* View Toggle */}
				<div className="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900">
							{showArchived ? "Archived Tasks" : "Active Tasks"}
						</h2>
						<button
							type="button"
							onClick={toggleArchiveView}
							className={`px-4 py-2 rounded-lg transition-colors ${
								showArchived
									? "bg-blue-600 text-white hover:bg-blue-700"
									: "bg-gray-600 text-white hover:bg-gray-700"
							}`}
						>
							{showArchived ? "📂 Show Active Tasks" : "🗄️ Show Archived Tasks"}
						</button>
					</div>
				</div>

				<TaskList
					tasks={tasks}
					onUpdateTask={updateTask}
					onDeleteTask={deleteTask}
					onUpdateTaskOrder={updateTaskOrder}
					onRefetchTasks={() => fetchTasks(showArchived)}
					setTasks={setTasks}
					showArchived={showArchived}
				/>
			</div>
		</div>
	);
};
