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
    return baseApi.post("/users/forgot-password", { email });
  },
};
