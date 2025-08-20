import { baseApi } from "./api-base";

export interface CreateEnrollmentDto {
  course_id: number;
}

export interface EnrollmentStatus {
  ACTIVE: "ACTIVE";
  COMPLETED: "COMPLETED";
  DROPPED: "DROPPED";
  PENDING: "PENDING";
}

export const enrollmentService = {
  // Enroll in course (Student)
  async enrollInCourse(courseId: number) {
    return baseApi.post("/enrollments", { course_id: courseId });
  },

  // Get student's enrollments
  async getMyEnrollments() {
    return baseApi.get("/enrollments/my-enrollments");
  },

  // Check enrollment status for specific course
  async checkEnrollmentStatus(courseId: number) {
    return baseApi.get(`/enrollments/check/${courseId}`);
  },

  // Get course enrollments (Teacher/Admin)
  async getCourseEnrollments(courseId: number) {
    return baseApi.get(`/enrollments/course/${courseId}`);
  },

  // Get enrollment statistics for course (Teacher/Admin)
  async getCourseEnrollmentStats(courseId: number) {
    return baseApi.get(`/enrollments/course/${courseId}/stats`);
  },

  // Update enrollment status (Teacher/Admin)
  async updateEnrollmentStatus(enrollmentId: number, status: string) {
    return baseApi.patch(`/enrollments/${enrollmentId}/status`, { status });
  },

  // Drop course (Student)
  async dropCourse(courseId: number) {
    return baseApi.delete(`/enrollments/course/${courseId}`);
  },

  // Legacy methods for backward compatibility
  async getEnrollmentProgress(enrollmentId: number) {
    return baseApi.get(`/enrollments/${enrollmentId}/progress`);
  },

  async updateProgress(enrollmentId: number, lessonId: number) {
    return baseApi.patch(`/enrollments/${enrollmentId}/progress`, { lessonId });
  },
};
