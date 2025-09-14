import { useState } from "react";
import type { Task } from "../types";

interface TaskItemProps {
	task: Task;
	onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
	onDelete: (taskId: string) => Promise<void>;
	onDragStart: (task: Task) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (task: Task) => void;
	showArchived: boolean;
}

export const TaskItem = ({
	task,
	onUpdate,
	onDelete,
	onDragStart,
	onDragOver,
	onDrop,
	showArchived,
}: TaskItemProps) => {
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState("");

	const startEditing = () => {
		setEditingTaskId(task.taskId);
		setEditingTitle(task.title);
	};

	const saveEdit = async () => {
		if (!editingTitle.trim()) return;

		await onUpdate(task.taskId, { title: editingTitle.trim() });
		setEditingTaskId(null);
		setEditingTitle("");
	};

	const cancelEdit = () => {
		setEditingTaskId(null);
		setEditingTitle("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			saveEdit();
		}
	};

	return (
		<li
			draggable={!showArchived}
			onDragStart={!showArchived ? () => onDragStart(task) : undefined}
			onDragOver={!showArchived ? onDragOver : undefined}
			onDrop={!showArchived ? () => onDrop(task) : undefined}
			className={`p-4 hover:bg-gray-50 transition-colors group ${
				!showArchived ? "cursor-move" : ""
			} ${task.completed ? "opacity-60" : ""} ${
				task.priority ? "bg-yellow-50 border-l-4 border-yellow-400" : ""
			}`}
		>
			<div className="flex items-center gap-3">
				{/* Drag handle - only show for active tasks */}
				{!showArchived && (
					<div className="text-gray-400 hover:text-gray-600 cursor-grab">
						⋮⋮
					</div>
				)}

				{/* Task content */}
				<div className="flex-1">
					{editingTaskId === task.taskId ? (
						<div className="flex gap-2">
							<input
								type="text"
								value={editingTitle}
								onChange={(e) => setEditingTitle(e.target.value)}
								onKeyDown={handleKeyDown}
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
							onClick={startEditing}
							className={`cursor-text text-left w-full ${task.completed ? "line-through" : ""}`}
						>
							<span className="text-gray-900">{task.title}</span>
							{task.description && (
								<p className="text-sm text-gray-600 mt-1">{task.description}</p>
							)}
						</button>
					)}
				</div>

				{/* Action buttons (shown on hover) */}
				<div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
					{showArchived ? (
						/* Archived task actions */
						<>
							<button
								type="button"
								onClick={() => onUpdate(task.taskId, { archived: false })}
								className="p-2 rounded text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
								title="Restore task"
							>
								♻️
							</button>
							<button
								type="button"
								onClick={() => onDelete(task.taskId)}
								className="p-2 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
								title="Delete permanently"
							>
								🗑️
							</button>
						</>
					) : (
						/* Active task actions */
						<>
							<button
								type="button"
								onClick={() =>
									onUpdate(task.taskId, {
										completed: !task.completed,
									})
								}
								className={`p-2 rounded ${
									task.completed
										? "text-green-600 hover:bg-green-100"
										: "text-gray-400 hover:bg-green-100 hover:text-green-600"
								} transition-colors`}
								title={
									task.completed ? "Mark as incomplete" : "Mark as complete"
								}
							>
								✓
							</button>
							<button
								type="button"
								onClick={() =>
									onUpdate(task.taskId, { priority: !task.priority })
								}
								className={`p-2 rounded ${
									task.priority
										? "text-yellow-600 hover:bg-yellow-100"
										: "text-gray-400 hover:bg-yellow-100 hover:text-yellow-600"
								} transition-colors`}
								title={task.priority ? "Remove priority" : "Mark as priority"}
							>
								✨
							</button>
							<button
								type="button"
								onClick={() => onUpdate(task.taskId, { archived: true })}
								className="p-2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
								title="Archive task"
							>
								📦
							</button>
							<button
								type="button"
								onClick={() => onDelete(task.taskId)}
								className="p-2 rounded text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
								title="Delete task"
							>
								🗑️
							</button>
						</>
					)}
				</div>
			</div>
		</li>
	);
};
