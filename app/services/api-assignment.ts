import { baseApi } from "./api-base";

export const assignmentService = {
  // Assignment API methods
  async getAssignments(
    courseId?: number,
    opts?: { page?: number; limit?: number; sortBy?: string; order?: string }
  ) {
    const q: string[] = [];
    if (courseId) q.push(`courseId=${courseId}`);
    if (opts?.page) q.push(`page=${opts.page}`);
    if (opts?.limit) q.push(`limit=${opts.limit}`);
    if (opts?.sortBy) q.push(`sortBy=${opts.sortBy}`);
    if (opts?.order) q.push(`order=${opts.order}`);
    const queryParams = q.length ? `?${q.join("&")}` : "";
    return baseApi.get(`/assignments${queryParams}`);
  },

  async getByLesson(lessonId: number) {
    return baseApi.get(`/assignments/lesson/${lessonId}`);
  },

  async getAssignment(assignmentId: number) {
    return baseApi.get(`/assignments/${assignmentId}`);
  },

  async createAssignment(assignmentData: any) {
    return baseApi.post("/assignments", assignmentData);
  },

  async updateAssignment(assignmentId: number, assignmentData: any) {
    return baseApi.patch(`/assignments/${assignmentId}`, assignmentData);
  },

  async updateStatus(assignmentId: number, is_active: boolean) {
    return baseApi.patch(`/assignments/${assignmentId}/status`, { is_active });
  },

  async deleteAssignment(assignmentId: number) {
    return baseApi.delete(`/assignments/${assignmentId}`);
  },

  async submitAssignment(assignmentId: number, submissionData: any) {
    return baseApi.post(`/assignments/${assignmentId}/submit`, submissionData);
  },

  async gradeSubmission(submissionId: number, gradeData: any) {
    return baseApi.patch(
      `/assignments/submissions/${submissionId}/grade`,
      gradeData
    );
  },

  async getMySubmissions() {
    return baseApi.get("/assignments/my-submissions");
  },

  async getSubmissionsByStudent(studentId: number) {
    return baseApi.get(`/submissions?student_id=${studentId}`);
  },

  async getSubmissionsByAssignment(assignmentId: number) {
    return baseApi.get(`/assignments/${assignmentId}/submissions`);
  },
};
