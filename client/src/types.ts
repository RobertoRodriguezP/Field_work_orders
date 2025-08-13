export type TaskStatus = 'Pending' | 'In Progress' | 'Done';

export interface Task {
  id: string;                 
  title: string;
  description?: string | null;
  dueDate?: string | null;    
  status: TaskStatus;
  createdBy?: string | null;  
  assignedTo?: string | null; 
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
  q?: string;           
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
