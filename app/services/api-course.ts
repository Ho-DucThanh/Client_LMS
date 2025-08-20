import { baseApi } from "./api-base";

export interface CreateCourseDto {
  title: string;
  description: string;
  thumbnail_url?: string;
  price?: number;
  original_price?: number;
  duration_hours?: number;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category_id: number;
  tag_ids?: number[];
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  price?: number;
  original_price?: number;
  duration_hours?: number;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category_id?: number;
  tag_ids?: number[];
}

export interface CourseFilters {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  category_id?: number;
  tag_id?: number;
  search?: string;
  instructor_id?: number;
  approval_status?: "PENDING" | "APPROVED" | "REJECTED";
  sort_by?: "rating_count" | "rating" | "created_at" | "total_enrolled";
  sort_order?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

export const courseService = {
  // Get all courses with filters
  async getCourses(filters?: CourseFilters) {
    const queryParams = filters
      ? `?${new URLSearchParams(
          Object.entries(filters)
            .filter(([_, v]) => v != null)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
        ).toString()}`
      : "";
    return baseApi.get(`/courses${queryParams}`);
  },

  // Get published courses (public)
  async getPublishedCourses() {
    return baseApi.get("/courses/published");
  },

  // Get course by ID
  async getCourse(id: number) {
    return baseApi.get(`/courses/${id}`);
  },

  // Create new course (Teacher/Admin)
  async createCourse(courseData: CreateCourseDto) {
    return baseApi.post("/courses", courseData);
  },

  // Update course (Teacher/Admin)
  async updateCourse(id: number, courseData: UpdateCourseDto) {
    return baseApi.patch(`/courses/${id}`, courseData);
  },

  // Delete course (Teacher/Admin)
  async deleteCourse(id: number) {
    return baseApi.delete(`/courses/${id}`);
  },

  // Get instructor's own courses
  async getMyCourses() {
    return baseApi.get("/courses/my-courses");
  },

  // Publish course (Teacher/Admin)
  async publishCourse(id: number) {
    return baseApi.patch(`/courses/${id}/publish`, {});
  },

  // Approve course (Admin only)
  async approveCourse(id: number) {
    return baseApi.patch(`/courses/${id}/approve`, {});
  },

  // Reject course (Admin only)
  async rejectCourse(id: number) {
    return baseApi.patch(`/courses/${id}/reject`, {});
  },

  // Get student count for course
  async getStudentCount(courseId: number) {
    return baseApi.get(`/courses/${courseId}/student-count`);
  },

  // Get course statistics (students, average rating, rating count, etc.)
  async getCourseStats(courseId: number) {
    return baseApi.get(`/courses/${courseId}/statistics`);
  },

  // Get all course categories
  async getCategories() {
    return baseApi.get("/courses/categories");
  },

  // Get all course tags
  async getTags() {
    return baseApi.get("/courses/tags");
  },
};
