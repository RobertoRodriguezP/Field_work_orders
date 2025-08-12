-- Índices para filtros comunes
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_duedate     ON tasks(duedate);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at  ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignedto  ON tasks(assignedto_sub);

-- (Opcional) índice de texto si NO usas Meilisearch
-- CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm       ON tasks USING gin (title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm ON tasks USING gin (description gin_trgm_ops);

-- Para eventos
CREATE INDEX IF NOT EXISTS idx_taskevents_taskid_created ON task_events(task_id, created_at DESC);
