-- ===== Tipos y utilidades =====
-- (Opcional) extensión para búsquedas de texto
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Status de tareas controlado con CHECK
-- (alternativa a ENUM para flexibilidad)
CREATE TABLE IF NOT EXISTS tasks (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  duedate       TIMESTAMP NULL,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done')),
  createdby_sub TEXT NOT NULL,     -- sub del usuario en Keycloak
  assignedto_sub TEXT NULL,        -- sub del asignado (Keycloak)
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Disparador simple para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Etiquetas (labels) opcionales para filtrado
CREATE TABLE IF NOT EXISTS labels (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id  INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- Historial de eventos de la tarea (para auditoría y notificaciones)
CREATE TABLE IF NOT EXISTS task_events (
  id        BIGSERIAL PRIMARY KEY,
  task_id   INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event     TEXT NOT NULL, -- 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'COMMENT'...
  payload   JSONB,         -- datos adicionales (antes/después, campos cambiados, etc.)
  actor_sub TEXT NOT NULL, -- quién ejecutó la acción (sub Keycloak)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (Opcional) Sombra de usuarios para cachear metadatos (no auth)
-- Se llena on-demand desde claims de Keycloak
CREATE TABLE IF NOT EXISTS users_shadow (
  sub        TEXT PRIMARY KEY,   -- sub (Keycloak subject)
  username   TEXT,               -- preferred_username
  email      TEXT,
  first_name TEXT,
  last_name  TEXT,
  picture    TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION touch_usershadow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usershadow_updated ON users_shadow;
CREATE TRIGGER trg_usershadow_updated
BEFORE UPDATE ON users_shadow
FOR EACH ROW EXECUTE FUNCTION touch_usershadow_updated_at();
