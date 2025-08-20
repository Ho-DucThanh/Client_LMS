import { baseApi } from "./api-base";

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export const categoryService = {
  // Get all categories
  async getCategories() {
    // Backend grouped under /courses
    return baseApi.get("/courses/categories");
  },

  // Create/Update/Delete may be admin-only in another controller.
  async createCategory(data: { name: string; description?: string }) {
    return baseApi.post("/categories", data);
  },
  async updateCategory(
    id: number,
    data: { name?: string; description?: string }
  ) {
    return baseApi.patch(`/categories/${id}`, data);
  },
  async deleteCategory(id: number) {
    return baseApi.delete(`/categories/${id}`);
  },
};

export const tagService = {
  // Get all tags
  async getTags() {
    // Backend grouped under /courses
    return baseApi.get("/courses/tags");
  },

  async createTag(data: { name: string }) {
    return baseApi.post("/tags", data);
  },
  async updateTag(id: number, data: { name: string }) {
    return baseApi.patch(`/tags/${id}`, data);
  },
  async deleteTag(id: number) {
    return baseApi.delete(`/tags/${id}`);
  },
  async searchTags(query: string) {
    return baseApi.get(`/tags/search?q=${encodeURIComponent(query)}`);
  },
};
