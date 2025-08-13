INSERT INTO labels(name) VALUES ('backend'), ('frontend'), ('infra'), ('bug')
ON CONFLICT DO NOTHING;

INSERT INTO users_shadow(sub, username, email, first_name, last_name)
VALUES
 ('11111111-1111-1111-1111-111111111111','admin1','admin1@example.com','Admin','One'),
 ('22222222-2222-2222-2222-222222222222','admin2','admin2@example.com','Admin','Two'),
 ('33333333-3333-3333-3333-333333333333','user1','user1@example.com','User','One'),
 ('44444444-4444-4444-4444-444444444444','user2','user2@example.com','User','Two')
ON CONFLICT (sub) DO NOTHING;

INSERT INTO tasks (title, description, due_date, status, created_by_sub, assigned_to_sub)
VALUES
 ('Crear API de Tasks', 'CRUD + Swagger + SignalR', NOW() + INTERVAL '2 day', 'In Progress',
   '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
 ('Diseñar UI', 'React + Vite + Tailwind', NOW() + INTERVAL '3 day', 'Pending',
   '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'),
 ('Pipeline CI', 'GitHub Actions build & test', NOW() + INTERVAL '1 day', 'Pending',
   '11111111-1111-1111-1111-111111111111', NULL);

SELECT add_label_to_task(id, 'backend') FROM tasks WHERE title ILIKE 'Crear API%';
SELECT add_label_to_task(id, 'frontend') FROM tasks WHERE title ILIKE 'Diseñar UI%';
SELECT add_label_to_task(id, 'infra')    FROM tasks WHERE title ILIKE 'Pipeline CI%';

INSERT INTO task_events (task_id, event, payload, actor_sub)
SELECT id, 'CREATED', jsonb_build_object('title', title), created_by_sub FROM tasks;
