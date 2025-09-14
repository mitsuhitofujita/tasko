import { useState } from "react";

interface AddTaskFormProps {
	onAddTask: (title: string) => Promise<void>;
}

export const AddTaskForm = ({ onAddTask }: AddTaskFormProps) => {
	const [newTaskTitle, setNewTaskTitle] = useState("");

	const handleSubmit = async () => {
		if (!newTaskTitle.trim()) return;

		await onAddTask(newTaskTitle.trim());
		setNewTaskTitle("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSubmit();
		}
	};

	return (
		<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
			<div className="flex gap-3">
				<input
					type="text"
					value={newTaskTitle}
					onChange={(e) => setNewTaskTitle(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Add a new task..."
					className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
				/>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!newTaskTitle.trim()}
					className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
				>
					➕ Add
				</button>
			</div>
		</div>
	);
};
