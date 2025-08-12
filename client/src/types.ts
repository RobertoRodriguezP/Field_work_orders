export type TaskStatus = 'Pending' | 'In Progress' | 'Done';

export interface Task {
  id: string;                 // normalizamos a string, aunque el backend use int
  title: string;
  description?: string | null;
  dueDate?: string | null;    // ISO date o 'YYYY-MM-DD'
  status: TaskStatus;
  createdBy?: string | null;  // opcional (mapeamos createdBySub)
  assignedTo?: string | null; // opcional (mapeamos assignedToSub)
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaskFilters {
  q?: string;           // hoy el backend no filtra q/sort; los conservamos por UI
  status?: TaskStatus | 'All';
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface Me {
  sub?: string;
  preferred_username?: string;
  email?: string;
  roles: string[];
  message?: string;
}
