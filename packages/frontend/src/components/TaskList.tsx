import { useState } from "react";
import type { Task } from "../types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
	tasks: Task[];
	onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (taskId: string) => Promise<void>;
	onUpdateTaskOrder: (taskId: string, newOrder: number) => Promise<void>;
	onRefetchTasks: () => Promise<void>;
	setTasks: (tasks: Task[]) => void;
	showArchived: boolean;
}

export const TaskList = ({
	tasks,
	onUpdateTask,
	onDeleteTask,
	onUpdateTaskOrder,
	onRefetchTasks,
	setTasks,
	showArchived,
}: TaskListProps) => {
	const [draggedTask, setDraggedTask] = useState<Task | null>(null);

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
			await onUpdateTaskOrder(draggedTask.taskId, newOrder);
			console.log(`Task ${draggedTask.title} moved to order ${newOrder}`);
		} catch (error) {
			console.error("Failed to update task order:", error);
			// Revert optimistic update on failure
			await onRefetchTasks();
		}
		setDraggedTask(null);
	};

	if (tasks.length === 0) {
		return (
			<div className="bg-white rounded-lg shadow-sm">
				<div className="p-12 text-center text-gray-500">
					<p className="text-lg">
						{showArchived ? "No archived tasks!" : "No tasks yet!"}
					</p>
					<p className="text-sm">
						{showArchived
							? "Tasks you archive will appear here."
							: "Add a task above to get started."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-sm">
			<ul className="divide-y divide-gray-200">
				{tasks.map((task) => (
					<TaskItem
						key={task.taskId}
						task={task}
						onUpdate={onUpdateTask}
						onDelete={onDeleteTask}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						showArchived={showArchived}
					/>
				))}
			</ul>
		</div>
	);
};
