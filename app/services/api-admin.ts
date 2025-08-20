import { baseApi } from "./api-base";

export const adminService = {
  // Admin API methods
  async getUsers() {
    return baseApi.get("/admin/users");
  },

  async createUser(userData: any) {
    return baseApi.post("/admin/users", userData);
  },

  async updateUser(userId: number, userData: any) {
    return baseApi.patch(`/admin/users/${userId}`, userData);
  },

  async deleteUser(userId: number) {
    return baseApi.delete(`/admin/users/${userId}`);
  },

  async assignRole(userId: number, roleData: any) {
    return baseApi.post(`/admin/users/${userId}/roles`, roleData);
  },

  async getSystemStats() {
    return baseApi.get("/admin/stats");
  },
};
