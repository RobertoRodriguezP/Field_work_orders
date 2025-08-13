CREATE TABLE IF NOT EXISTS tasks (
  id               SERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done')),
  created_by_sub   TEXT NOT NULL,
  assigned_to_sub  TEXT NULL,
  due_date   TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

-- labels / task_labels (ya estaban OK salvo "Id" → "id" por consistencia)
CREATE TABLE IF NOT EXISTS labels (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS task_labels (
  task_id  INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id INT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_events (
  id         BIGSERIAL PRIMARY KEY,
  task_id    INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  payload    JSONB,
  actor_sub  TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users_shadow (
  sub         TEXT PRIMARY KEY,
  username    TEXT,
  email       TEXT,
  first_name  TEXT,
  last_name   TEXT,
  picture     TEXT,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
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
