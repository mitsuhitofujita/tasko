## Task Operations UI (Dashboard)

This document describes the Task Operations UI to be implemented under the `/dashboard` route. It translates the original Japanese specification and adds clarifications and implementation notes based on the project's tech stack, data model, and CSS framework choices.

Features

- Provide a Task Operations UI at the route `/dashboard` (authentication required).
- Add Task: a "Add Task" control (suggested: plus emoji or an icon) inserts a new task at the top of the task list.
- Inline edit: clicking a task's text opens an inline text input so the user can edit the task in place.
- Reorder: drag the left edge (or a drag-handle) to reorder tasks via drag-and-drop.
- Hover actions: on mouse-over show action buttons on the right edge: Complete (check emoji), Activate (sparkles emoji), Archive (box emoji), Delete (trash emoji).

Implementation notes and clarifications

- Route and auth
  - `/dashboard` should be protected; only signed-in users can access. Use Google Identity Services (GSI) on the client and send the ID token to the backend for verification before granting API access as described in the tech stack.

- Data model and ordering
  - Use the Firestore model: `users/{uid}/tasks/{taskId}` and maintain an `order` numeric field as described in the data model.
  - When inserting at the top, compute the new `order` by taking the current first task's `order` and subtracting a gap (or use the average between a virtual head and the first item). The repository recommends spaced values (1000,2000,3000...) and averaging on insert to avoid frequent reindexing.
  - On drag-and-drop, update only the affected tasks' `order` values. Batch writes or transactions are recommended for multi-document updates to keep consistency and reduce Firestore costs.

- UX interactions
  - Add Task behavior: a single click on the plus control should optimistically show the new item at the top and focus its inline editor; persist to the backend and rollback on failure.
  - Inline editing: when a task title is clicked, replace the title with a text input. Save on blur or Enter. Use optimistic UI updates and handle validation errors returned from the API.
  - Drag handle: show a clear drag handle on the left side of each task (e.g., a vertical grip icon). Make the whole row draggable but prefer a dedicated handle for better accessibility.
  - Hover actions: on pointer hover show secondary buttons on the right. Keep primary action (toggle complete) discoverable and keyboard-accessible.

- Actions semantics
  - Complete (check): toggles `completed` boolean. Complete tasks may be visually distinguished (strike-through, dimmed color). Consider keeping completed tasks in the same list or providing a filter.
  - Activate (sparkles): mark a task as prioritized or active. Map to a `priority` or `active` boolean field in the model; adjust ordering if needed.
  - Archive (box): set `archived` = true instead of hard delete; archived tasks are hidden from the default list but can be restored from an archive view.
  - Delete (trash): either implement soft delete (`deletedAt` timestamp or `archived`) or a permanent delete depending on policy; the models document recommends soft-delete using an `archived` flag for safety.

- Accessibility
  - Ensure keyboard support: inline editing should be focusable, actions reachable by keyboard.
  - Provide ARIA attributes for drag handles and action buttons.

- Styling
  - The project uses UnoCSS (or Tailwind as an alternative). Implement utility-class based styling and keep the design responsive.
  - Use clear spacing and affordances for the drag handle, inline editor state, and hover actions so users can easily discover controls.

- Performance and cost considerations
  - Debounce frequent updates (e.g., during fast dragging) and batch order updates into Firestore batched writes (up to 500 writes per batch) to reduce read/write costs.
  - Minimize real-time listeners; use an initial fetch + delta updates approach or a single listener for the list, as detailed in the Firestore model document.

- Concurrency
  - Use `updatedAt` timestamps and client-side optimistic updates with rollback to detect and resolve conflicts. For multi-item reorder operations, prefer server-side transactions if ordering consistency is critical.

Suggested API interactions (Fastify endpoints)

- GET `/api/tasks` — fetch the user's tasks (order ASC)
- POST `/api/tasks` — create a new task (body: title, description?, order)
- PUT `/api/tasks/:id` — update task fields (title, completed, order, archived, etc.)
- DELETE `/api/tasks/:id` — delete task (if you support hard delete)

Acceptance criteria (examples)

1. Adding a task inserts it at the top and persists the task; reloading the page shows the new task in the same position.
2. Clicking a task title opens an inline editor; changes persist on Enter or blur.
3. Drag-and-drop updates ordering and persists; after reload the ordering is preserved.
4. Hovering over a task reveals complete/activate/archive/delete actions on the right; each action is keyboard accessible.

Developer notes

- Use the project's stack: React (Vite + TypeScript) on the client, Fastify + TypeScript on the server, and Firestore as the data store.
- Follow implementation rules: commit messages, linting (`pnpm check`) and avoid creating new branches unless instructed.
