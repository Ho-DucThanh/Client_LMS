import { baseApi } from "./api-base";

export interface CreateProgressDto {
  enrollment_id: number;
  module_id: number;
  completion_percentage?: number;
  is_completed?: boolean;
  time_spent_minutes?: number;
}
export interface UpdateProgressDto extends Partial<CreateProgressDto> {}

export interface CreateLessonProgressDto {
  enrollment_id: number;
  lesson_id: number;
  progress_percent?: number;
  is_completed?: boolean;
  time_spent_minutes?: number;
}
export interface UpdateLessonProgressDto
  extends Partial<CreateLessonProgressDto> {}

export const progressService = {
  // Module-level progress
  async createProgress(data: CreateProgressDto) {
    return baseApi.post(`/progress`, data);
  },
  async getProgress(params?: { enrollment_id?: number; module_id?: number }) {
    const qp = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v != null)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
        ).toString()}`
      : "";
    return baseApi.get(`/progress${qp}`);
  },
  async getProgressById(id: number) {
    return baseApi.get(`/progress/${id}`);
  },
  async updateProgress(id: number, data: UpdateProgressDto) {
    return baseApi.patch(`/progress/${id}`, data);
  },
  async deleteProgress(id: number) {
    return baseApi.delete(`/progress/${id}`);
  },

  // Lesson-level progress
  async createLessonProgress(data: CreateLessonProgressDto) {
    return baseApi.post(`/lesson-progress`, data);
  },
  async getLessonProgress(params?: {
    enrollment_id?: number;
    lesson_id?: number;
  }) {
    const qp = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([_, v]) => v != null)
            .reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
        ).toString()}`
      : "";
    return baseApi.get(`/lesson-progress${qp}`);
  },
  async getLessonProgressById(id: number) {
    return baseApi.get(`/lesson-progress/${id}`);
  },
  async updateLessonProgress(id: number, data: UpdateLessonProgressDto) {
    return baseApi.patch(`/lesson-progress/${id}`, data);
  },
  async deleteLessonProgress(id: number) {
    return baseApi.delete(`/lesson-progress/${id}`);
  },
};
