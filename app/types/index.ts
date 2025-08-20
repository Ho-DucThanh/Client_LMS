// Base User interface
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

// Auth related interfaces
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

// Course related interfaces
export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  price: number;
  original_price?: number;
  duration_hours: number;
  total_enrolled: number;
  rating: number;
  rating_count: number;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  instructor_id: number;
  category_id: number;
  created_at: string;
  updated_at: string;
  instructor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    description?: string;
  };
  tags?: {
    id: number;
    name: string;
  }[];
}

// Enrollment interfaces
export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  status: "ACTIVE" | "COMPLETED" | "DROPPED" | "PENDING";
  progress_percentage: number;
  enrolled_at: string;
  completed_at?: string;
  course?: Course;
}

// Category and Tag interfaces
export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Assignment {
  id: number;
  course_id: number;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  status: string;
  created_at: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: PaginationMeta;
}

// Forum interfaces
export interface ForumPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  course_id?: number;
  created_at: string;
  updated_at: string;
}

// Notification interfaces
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read_at?: string;
  created_at: string;
}
