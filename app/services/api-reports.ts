import { baseApi } from "./api-base";

export const reportsService = {
  // Admin reports
  async getAdminOverview() {
    return baseApi.get("/reports/admin/overview");
  },
  async getAdminCourses(page = 1, limit = 20) {
    return baseApi.get(`/reports/admin/courses?page=${page}&limit=${limit}`);
  },
  async getAdminTrends(from: string, to: string, interval: "day" | "month") {
    const params = new URLSearchParams({ from, to, interval });
    return baseApi.get(`/reports/admin/trends?${params.toString()}`);
  },

  // Teacher reports
  async getTeacherOverview(teacherId?: number) {
    const q = teacherId ? `?teacherId=${teacherId}` : "";
    return baseApi.get(`/reports/teacher/overview${q}`);
  },
  async getTeacherCourses(teacherId?: number, page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (teacherId) params.set("teacherId", String(teacherId));
    params.set("page", String(page));
    params.set("limit", String(limit));
    return baseApi.get(`/reports/teacher/courses?${params.toString()}`);
  },
  async getTeacherTrends(
    teacherId: number | undefined,
    from: string,
    to: string,
    interval: "day" | "month"
  ) {
    const params = new URLSearchParams({ from, to, interval });
    if (teacherId) params.set("teacherId", String(teacherId));
    return baseApi.get(`/reports/teacher/trends?${params.toString()}`);
  },
};
