import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db, type Task } from "../config/firestore";
import { requireAuth, verifyCsrf } from "../middleware/auth";

interface CreateTaskBody {
	title: string;
	description?: string;
}

interface UpdateTaskBody {
	title?: string;
	description?: string;
	completed?: boolean;
	priority?: boolean;
	archived?: boolean;
	order?: number;
}

export async function taskRoutes(fastify: FastifyInstance) {
	// Get all tasks for authenticated user
	fastify.get(
		"/api/tasks",
		{ preHandler: requireAuth },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const userId = request.user?.userId;
				if (!userId) {
					return reply.code(401).send({ error: "Unauthorized" });
				}

				const tasksCollection = db
					.collection("users")
					.doc(userId)
					.collection("tasks");

				const snapshot = await tasksCollection.get();

				const tasks: Task[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					// Filter out archived tasks
					if (data.archived !== true) {
						tasks.push({
							taskId: doc.id,
							userId,
							title: data.title,
							description: data.description,
							completed: data.completed || false,
							priority: data.priority || false,
							archived: data.archived || false,
							order: data.order || 0,
							createdAt: data.createdAt?.toDate() || new Date(),
							updatedAt: data.updatedAt?.toDate() || new Date(),
						});
					}
				});
				
				// Sort by order in ascending order
				tasks.sort((a, b) => a.order - b.order);

				reply.send(tasks);
			} catch (error) {
				console.error("Error fetching tasks:", error);
				reply.code(500).send({ error: "Failed to fetch tasks" });
			}
		},
	);

	// Create a new task
	fastify.post<{ Body: CreateTaskBody }>(
		"/api/tasks",
		{ preHandler: [requireAuth, verifyCsrf] },
		async (
			request: FastifyRequest<{ Body: CreateTaskBody }>,
			reply: FastifyReply,
		) => {
			try {
				const userId = request.user?.userId;
				if (!userId) {
					return reply.code(401).send({ error: "Unauthorized" });
				}
				const { title, description } = request.body;

				if (!title || title.trim().length === 0) {
					return reply.code(400).send({ error: "Title is required" });
				}

				const tasksCollection = db
					.collection("users")
					.doc(userId)
					.collection("tasks");

				// Get all tasks to find the highest order value
				const existingTasksSnapshot = await tasksCollection.get();

				let highestOrder = 0;
				existingTasksSnapshot.forEach((doc) => {
					const data = doc.data();
					// Only consider non-archived tasks
					if (data.archived !== true) {
						const taskOrder = data.order || 0;
						if (taskOrder > highestOrder) {
							highestOrder = taskOrder;
						}
					}
				});

				const newOrder = highestOrder + 1000; // Add gap for new task at top

				const now = new Date();
				const taskData = {
					title: title.trim(),
					description: description?.trim() || "",
					completed: false,
					priority: false,
					archived: false,
					order: newOrder,
					createdAt: now,
					updatedAt: now,
				};

				const docRef = await tasksCollection.add(taskData);

				const task: Task = {
					taskId: docRef.id,
					userId,
					...taskData,
				};

				reply.code(201).send(task);
			} catch (error) {
				console.error("Error creating task:", error);
				reply.code(500).send({ error: "Failed to create task" });
			}
		},
	);

	// Update a task
	fastify.put<{ Params: { id: string }; Body: UpdateTaskBody }>(
		"/api/tasks/:id",
		{ preHandler: [requireAuth, verifyCsrf] },
		async (
			request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskBody }>,
			reply: FastifyReply,
		) => {
			try {
				const userId = request.user?.userId;
				if (!userId) {
					return reply.code(401).send({ error: "Unauthorized" });
				}
				const { id } = request.params;
				const updates = request.body;

				const taskDoc = db
					.collection("users")
					.doc(userId)
					.collection("tasks")
					.doc(id);

				const doc = await taskDoc.get();
				if (!doc.exists) {
					return reply.code(404).send({ error: "Task not found" });
				}

				const updateData: Record<string, unknown> = {
					updatedAt: new Date(),
				};

				// Only update provided fields
				if (updates.title !== undefined) {
					if (updates.title.trim().length === 0) {
						return reply.code(400).send({ error: "Title cannot be empty" });
					}
					updateData.title = updates.title.trim();
				}

				if (updates.description !== undefined) {
					updateData.description = updates.description.trim();
				}

				if (updates.completed !== undefined) {
					updateData.completed = updates.completed;
				}

				if (updates.priority !== undefined) {
					updateData.priority = updates.priority;
				}

				if (updates.archived !== undefined) {
					updateData.archived = updates.archived;
				}

				if (updates.order !== undefined) {
					updateData.order = updates.order;
				}

				await taskDoc.update(updateData);

				// Return updated task
				const updatedDoc = await taskDoc.get();
				const data = updatedDoc.data();
				if (!data) {
					return reply
						.code(500)
						.send({ error: "Failed to retrieve updated task" });
				}

				const task: Task = {
					taskId: id,
					userId,
					title: data.title,
					description: data.description,
					completed: data.completed || false,
					priority: data.priority || false,
					archived: data.archived || false,
					order: data.order || 0,
					createdAt: data.createdAt?.toDate() || new Date(),
					updatedAt: data.updatedAt?.toDate() || new Date(),
				};

				reply.send(task);
			} catch (error) {
				console.error("Error updating task:", error);
				reply.code(500).send({ error: "Failed to update task" });
			}
		},
	);

	// Delete a task
	fastify.delete<{ Params: { id: string } }>(
		"/api/tasks/:id",
		{ preHandler: [requireAuth, verifyCsrf] },
		async (
			request: FastifyRequest<{ Params: { id: string } }>,
			reply: FastifyReply,
		) => {
			try {
				const userId = request.user?.userId;
				if (!userId) {
					return reply.code(401).send({ error: "Unauthorized" });
				}
				const { id } = request.params;

				const taskDoc = db
					.collection("users")
					.doc(userId)
					.collection("tasks")
					.doc(id);

				const doc = await taskDoc.get();
				if (!doc.exists) {
					return reply.code(404).send({ error: "Task not found" });
				}

				// Soft delete by archiving
				await taskDoc.update({
					archived: true,
					updatedAt: new Date(),
				});

				reply.send({ success: true });
			} catch (error) {
				console.error("Error deleting task:", error);
				reply.code(500).send({ error: "Failed to delete task" });
			}
		},
	);
}
