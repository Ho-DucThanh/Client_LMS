import { baseApi } from "./api-base";

export interface CreateLessonDto {
  module_id: number;
  title: string;
  description?: string;
  type?: "VIDEO" | "TEXT" | "QUIZ" | "FILE" | "EXTERNAL";
  content?: string;
  video_url?: string;
  file_url?: string;
  external_url?: string;
  order_index?: number;
  duration_minutes?: number;
  is_free?: boolean;
  is_active?: boolean;
}

export interface UpdateLessonDto extends Partial<CreateLessonDto> {}

export const lessonService = {
  async getLessons(moduleId?: number) {
    const qp = moduleId ? `?module_id=${moduleId}` : "";
    return baseApi.get(`/lessons${qp}`);
  },
  async getLesson(id: number) {
    return baseApi.get(`/lessons/${id}`);
  },
  async createLesson(data: CreateLessonDto) {
    return baseApi.post(`/lessons`, data);
  },
  async updateLesson(id: number, data: UpdateLessonDto) {
    return baseApi.patch(`/lessons/${id}`, data);
  },
  async deleteLesson(id: number) {
    return baseApi.delete(`/lessons/${id}`);
  },
};
