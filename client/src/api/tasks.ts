import http from './http';
import type { Paged, Task, TaskFilters } from '../types';

export async function listTasks(filters: TaskFilters): Promise<Paged<Task>> {
  const { data } = await http.get('/api/tasks', { params: filters });
  return data;
}

export async function createTask(payload: Omit<Task, 'id'|'createdAt'|'updatedAt'>): Promise<Task> {
  const { data } = await http.post('/api/tasks', payload);
  return data;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data } = await http.put(`/api/tasks/${id}`, patch);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  await http.delete(`/api/tasks/${id}`);
}
