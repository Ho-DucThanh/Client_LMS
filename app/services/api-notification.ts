import { baseApi } from "./api-base";

export const notificationService = {
  // Notification API methods
  async getNotifications() {
    return baseApi.get("/notifications");
  },

  async markNotificationAsRead(notificationId: number) {
    return baseApi.patch(`/notifications/${notificationId}/read`, {});
  },

  async markAllAsRead() {
    return baseApi.patch(`/notifications/mark-all-read`, {});
  },

  async createNotification(notificationData: any) {
    return baseApi.post("/notifications", notificationData);
  },
};
