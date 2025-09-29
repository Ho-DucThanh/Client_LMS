import { baseApi } from "./api-base";

export const userService = {
  // User Profile API methods
  async getUserProfile() {
    return baseApi.get("/users/profile");
  },

  async updateUserProfile(profileData: any) {
    return baseApi.put("/users/profile", profileData);
  },

  async changeUserPassword(currentPassword: string, newPassword: string) {
    return baseApi.put("/users/change-password", {
      currentPassword,
      newPassword,
    });
  },

  async forgotPassword(email: string) {
    return baseApi.post("/auth/forgot-password", { email });
  },
  async resetPassword(token: string, newPassword: string) {
    return baseApi.post("/auth/reset-password", { token, newPassword });
  },
};
