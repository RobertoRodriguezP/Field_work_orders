-- Paginación + filtros de servidor (para tu endpoint GET /api/tasks)
-- Uso: SELECT * FROM list_tasks(_status := 'Pending', _q := 'motor', _page := 1, _page_size := 20);

CREATE OR REPLACE FUNCTION list_tasks(
  _status TEXT DEFAULT NULL,
  _assigned_to_sub TEXT DEFAULT NULL,
  _created_by_sub TEXT DEFAULT NULL,
  _label_ids INT[] DEFAULT NULL,
  _q TEXT DEFAULT NULL,           -- búsqueda básica en título/descripción
  _page INT DEFAULT 1,
  _page_size INT DEFAULT 20,
  OUT total_count BIGINT
)
RETURNS TABLE (
  id INT,
  title TEXT,
  description TEXT,
  duedate TIMESTAMP,
  status TEXT,
  createdby_sub TEXT,
  assignedto_sub TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
DECLARE
  _offset INT := GREATEST((_page - 1) * _page_size, 0);
BEGIN
  -- Conteo total con filtros
  SELECT COUNT(*)
  INTO total_count
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT TRUE AS has_all
    WHERE _label_ids IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM unnest(_label_ids) lid
         WHERE NOT EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id = lid)
       )
  ) lab ON TRUE
  WHERE (_status IS NULL OR t.status = _status)
    AND (_assigned_to_sub IS NULL OR t.assignedto_sub = _assigned_to_sub)
    AND (_created_by_sub IS NULL OR t.createdby_sub = _created_by_sub)
    AND (
      _q IS NULL OR
      (t.title ILIKE '%' || _q || '%' OR t.description ILIKE '%' || _q || '%')
    );

  -- Resultado paginado
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.duedate, t.status,
         t.createdby_sub, t.assignedto_sub, t.created_at, t.updated_at
  FROM tasks t
  LEFT JOIN LATERAL (
    SELECT TRUE AS has_all
    WHERE _label_ids IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM unnest(_label_ids) lid
         WHERE NOT EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label_id = lid)
       )
  ) lab ON TRUE
  WHERE (_status IS NULL OR t.status = _status)
    AND (_assigned_to_sub IS NULL OR t.assignedto_sub = _assigned_to_sub)
    AND (_created_by_sub IS NULL OR t.createdby_sub = _created_by_sub)
    AND (
      _q IS NULL OR
      (t.title ILIKE '%' || _q || '%' OR t.description ILIKE '%' || _q || '%')
    )
  ORDER BY t.id DESC
  OFFSET _offset
  LIMIT _page_size;
END; $$ LANGUAGE plpgsql STABLE;

-- Helper: adjuntar/quitar labels de manera idempotente
CREATE OR REPLACE FUNCTION add_label_to_task(_task_id INT, _label_name TEXT)
RETURNS VOID AS $$
DECLARE _label_id INT;
BEGIN
  INSERT INTO labels(name) VALUES(_label_name)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO _label_id FROM labels WHERE name = _label_name;

  INSERT INTO task_labels(task_id, label_id)
  VALUES(_task_id, _label_id)
  ON CONFLICT DO NOTHING;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_label_from_task(_task_id INT, _label_name TEXT)
RETURNS VOID AS $$
DECLARE _label_id INT;
BEGIN
  SELECT id INTO _label_id FROM labels WHERE name = _label_name;
  IF _label_id IS NULL THEN RETURN; END IF;

  DELETE FROM task_labels WHERE task_id = _task_id AND label_id = _label_id;
END; $$ LANGUAGE plpgsql;
