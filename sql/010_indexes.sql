CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_duedate     ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at  ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignedto  ON tasks(assigned_to_sub);

CREATE INDEX IF NOT EXISTS idx_taskevents_taskid_created ON task_events(task_id, created_at DESC);
