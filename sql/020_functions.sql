CREATE OR REPLACE FUNCTION list_tasks(
  _status TEXT DEFAULT NULL,
  _assigned_to_sub TEXT DEFAULT NULL,
  _created_by_sub TEXT DEFAULT NULL,
  _label_ids INT[] DEFAULT NULL,
  _q TEXT DEFAULT NULL,
  _page INT DEFAULT 1,
  _page_size INT DEFAULT 20,
  OUT total_count BIGINT
)
RETURNS TABLE (
  id INT,
  title TEXT,
  description TEXT,
  due_date TIMESTAMP,
  status TEXT,
  created_by_sub TEXT,
  assigned_to_sub TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
DECLARE
  _offset INT := GREATEST((_page - 1) * _page_size, 0);
BEGIN
  SELECT COUNT(*) INTO total_count
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
    AND (_assigned_to_sub IS NULL OR t.assigned_to_sub = _assigned_to_sub)
    AND (_created_by_sub IS NULL OR t.created_by_sub = _created_by_sub)
    AND (_q IS NULL OR (t.title ILIKE '%' || _q || '%' OR t.description ILIKE '%' || _q || '%'));

  RETURN QUERY
  SELECT t.id, t.title, t.description, t.due_date, t.status,
         t.created_by_sub, t.assigned_to_sub, t.created_at, t.updated_at
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
    AND (_assigned_to_sub IS NULL OR t.assigned_to_sub = _assigned_to_sub)
    AND (_created_by_sub IS NULL OR t.created_by_sub = _created_by_sub)
    AND (_q IS NULL OR (t.title ILIKE '%' || _q || '%' OR t.description ILIKE '%' || _q || '%'))
  ORDER BY t.id DESC
  OFFSET _offset
  LIMIT _page_size;
END; $$ LANGUAGE plpgsql STABLE;
