import { baseApi } from "./api-base";

export const forumService = {
  // Forum API methods
  async getForumPosts(courseId?: number) {
    const queryParams = courseId ? `?courseId=${courseId}` : "";
    return baseApi.get(`/forum/posts${queryParams}`);
  },

  async createForumPost(postData: any) {
    return baseApi.post("/forum/posts", postData);
  },

  async getForumComments(postId: number) {
    return baseApi.get(`/forum/posts/${postId}/comments`);
  },

  async createForumComment(postId: number, commentData: any) {
    return baseApi.post(`/forum/posts/${postId}/comments`, commentData);
  },
};
