// src/pages/TasksPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useTasks } from '../context/TasksContext';
import type { Paged, Task, TaskFilters, TaskStatus } from '../types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO, isBefore } from 'date-fns';


const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['Pending', 'In Progress', 'Done']),
  assignedTo: z.string().email('Must be a valid email').optional(),
});

type TaskForm = z.infer<typeof TaskSchema>;

function StatusBadge({ s }: { s: TaskStatus }) {
  const map = {
    Pending: 'secondary',
    'In Progress': 'warning',
    Done: 'success',
  } as const;
  return <span className={`badge text-bg-${map[s]}`}>{s}</span>;
}

export default function TasksPage() {
  const { page, loading, error, filters, setFilters, refresh, create, update, remove } = useTasks();
  const undef = <T,>(v: T | null | undefined): T | undefined => v ?? undefined;
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'table' | 'board'>('board'); // default: board

  useEffect(() => { refresh(); }, [filters, refresh]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>({
    resolver: zodResolver(TaskSchema),
    defaultValues: { status: 'Pending' }
  });

  const onCreate = async (data: TaskForm) => {
    await create({ ...data, createdBy: 'me' });
    setShowForm(false);
    reset({ status: 'Pending' });
  };

  const onUpdate = async (data: TaskForm) => {
    if (!editing) return;
    await update(editing.id, data);
    setEditing(null);
    setShowForm(false);
    reset({ status: 'Pending' });
  };

  const submit = editing ? onUpdate : onCreate;

  const overdue = (t: Task) =>
    t.dueDate ? isBefore(parseISO(t.dueDate), new Date()) && t.status !== 'Done' : false;

  const total = page?.total ?? 0;
  const pageCount = Math.ceil(total / (filters.pageSize ?? 10));

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOverColumn = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropToColumn = async (e: React.DragEvent, status: TaskStatus) => {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/taskId');
  if (!taskId || !page) return;
  const t = page.items.find(x => x.id === taskId);
  if (!t || t.status === status) return; 
  await update(taskId, { status });

};

  const TaskCard = ({ t }: { t: Task }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, t.id)}
      className={`card shadow-sm mb-2 ${overdue(t) ? 'border-warning' : ''}`}
      style={{ cursor: 'grab' }}
    >
      <div className="card-body p-2">
        <div className="d-flex align-items-start gap-2">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold">{t.title}</span>
              <StatusBadge s={t.status} />
            </div>
            {t.description && (
              <div className="small text-secondary text-truncate-2">{t.description}</div>
            )}
            <div className="small text-secondary mt-1">
              Due: {t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : '—'}
              {t.assignedTo ? ` • ${t.assignedTo}` : ''}
            </div>
          </div>
        </div>
        <div className="mt-2 d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setEditing(t);
              setShowForm(true);
              reset({
                  title: t.title,
                  description: undef(t.description),
                  dueDate: undef(t.dueDate?.slice(0,10)),
                  status: t.status,
                  assignedTo: undef(t.assignedTo),
                });
            }}
          >
            Edit
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t.id)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="d-grid gap-3">
      {/* Filters / Toolbar */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div className="me-auto d-flex align-items-center gap-2">
              <h5 className="card-title mb-0">Tasks</h5>
              <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
                <button
                  className={`btn btn-outline-secondary ${view === 'table' ? 'active' : ''}`}
                  onClick={() => setView('table')}
                >Table</button>
                <button
                  className={`btn btn-outline-secondary ${view === 'board' ? 'active' : ''}`}
                  onClick={() => setView('board')}
                >Board</button>
              </div>
            </div>

            {/* Toggle filtros en móvil */}
            <button
              className="btn btn-outline-secondary btn-sm d-md-none ms-auto"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#filtersCollapse"
            >
              Filters
            </button>

            <button
              className="btn btn-primary ms-md-2 w-100 w-md-auto"
              onClick={() => { setEditing(null); setShowForm(true); reset({ status: 'Pending' }); }}
            >
              + New Task
            </button>
          </div>

          {/* Filtros colapsables en móvil, visibles en md+ */}
          <div id="filtersCollapse" className="collapse d-md-block mt-3">
            <div className="d-flex flex-wrap gap-2">
              <input
                className="form-control w-100 w-md-auto"
                placeholder="Search title or description…"
                value={filters.q ?? ''}
                onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
              />
              <select
                className="form-select w-100 w-md-auto"
                value={filters.status ?? 'All'}
                onChange={(e) => setFilters({ status: e.target.value as any, page: 1 })}
              >
                <option value="All">All</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
              <select
                className="form-select w-100 w-md-auto"
                value={filters.sort ?? '-createdAt'}
                onChange={(e) => setFilters({ sort: e.target.value as any })}
              >
                <option value="-createdAt">Newest</option>
                <option value="createdAt">Oldest</option>
                <option value="dueDate">Due ↑</option>
                <option value="-dueDate">Due ↓</option>
                <option value="title">Title A–Z</option>
                <option value="-title">Title Z–A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div className="alert alert-info mb-0">Loading…</div>}
      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {/* BOARD (Kanban) */}
      {!loading && page && view === 'board' && (
        <div className="kanban grid gap-3">
          {(['Pending', 'In Progress', 'Done'] as TaskStatus[]).map(col => {
            const items = page.items.filter(t => t.status === col);
            return (
              <div
                key={col}
                className="kanban-col card"
                onDragOver={onDragOverColumn}
                onDrop={(e) => onDropToColumn(e, col)}
              >
                <div className="card-header d-flex align-items-center justify-content-between">
                  <span className="fw-semibold">{col}</span>
                  <span className="badge text-bg-secondary">{items.length}</span>
                </div>
                <div className="card-body p-2">
                  {items.length === 0 ? (
                    <div className="text-center text-secondary small py-3">Drop here</div>
                  ) : (
                    items.map(t => <TaskCard key={t.id} t={t} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE (desktop) */}
      {!loading && page && view === 'table' && (
        <div className="card">
          <div className="card-body table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="d-none d-lg-table-cell">Description</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="d-none d-xl-table-cell">Assigned</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {page.items.map(t => (
                  <tr key={t.id} className={overdue(t) ? 'table-warning' : ''}>
                    <td className="fw-semibold">{t.title}</td>
                    <td className="d-none d-lg-table-cell text-truncate" style={{ maxWidth: 420 }}>
                      {t.description}
                    </td>
                    <td>{t.dueDate ? format(parseISO(t.dueDate), 'yyyy-MM-dd') : '—'}</td>
                    <td><StatusBadge s={t.status} /></td>
                    <td className="d-none d-xl-table-cell">{t.assignedTo || '—'}</td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setEditing(t);
                            setShowForm(true);
                            reset({
                                    title: t.title,
                                    description: undef(t.description),
                                    dueDate: undef(t.dueDate?.slice(0,10)),
                                    status: t.status,
                                    assignedTo: undef(t.assignedTo),
                                  });
                          }}
                        >
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => remove(t.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {page.items.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-secondary">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && page && pageCount > 1 && (
        <nav className="ms-md-auto">
          <ul className="pagination pagination-sm mb-0 flex-wrap">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
              <li className={`page-item ${n === (filters.page ?? 1) ? 'active' : ''}`} key={n}>
                <button className="page-link" onClick={() => setFilters({ page: n })}>{n}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="modal d-block" tabIndex={-1} role="dialog" onClick={() => setShowForm(false)}>
          <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <form onSubmit={handleSubmit(submit)}>
                <div className="modal-header">
                  <h5 className="modal-title">{editing ? 'Edit Task' : 'New Task'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowForm(false)}></button>
                </div>
                <div className="modal-body d-grid gap-3">
                  <div>
                    <label className="form-label">Title</label>
                    <input className={`form-control ${errors.title ? 'is-invalid' : ''}`} {...(register('title'))} />
                    {errors.title && <div className="invalid-feedback">{errors.title.message}</div>}
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={3} {...register('description')} />
                  </div>
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label">Due Date</label>
                      <input type="date" className="form-control" {...register('dueDate')} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" {...register('status')}>
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">Assigned To (email)</label>
                      <input className={`form-control ${errors.assignedTo ? 'is-invalid' : ''}`} {...register('assignedTo')} />
                      {errors.assignedTo && <div className="invalid-feedback">{errors.assignedTo.message}</div>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editing ? 'Save' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
