import { baseApi } from "./api-base";

export interface CreateReviewDto {
  course_id: number;
  rating: number;
  review_text?: string;
}

export const reviewService = {
  async createOrUpdate(data: CreateReviewDto) {
    return baseApi.post("/reviews", data);
  },
  async getForCourse(courseId: number) {
    return baseApi.get(`/reviews/course/${courseId}`);
  },
  async delete(id: number) {
    return baseApi.delete(`/reviews/${id}`);
  },
};
