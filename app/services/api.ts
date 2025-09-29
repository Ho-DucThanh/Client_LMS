const API_BASE_URL = "http://localhost:3000";

class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      credentials: "include", // Include cookies in requests
      headers: {
        "Content-Type": "application/json",
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    const text = await response.text();
    let data: any = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch (e) {
      data = text;
    }

    if (!response.ok) {
      const err: any = new Error(
        (data && (data.message || data.error)) ||
          `HTTP ${response.status}: ${response.statusText}`
      );
      (err.status = response.status), (err.response = data);
      throw err;
    }

    return data;
  }

  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // User Profile API methods
  async getUserProfile() {
    return this.get("/users/profile");
  }

  async updateUserProfile(profileData: any) {
    return this.put("/users/profile", profileData);
  }

  async changeUserPassword(currentPassword: string, newPassword: string) {
    return this.put("/users/change-password", {
      currentPassword,
      newPassword,
    });
  }

  // Course API methods
  async getCourses(filters?: any) {
    const queryParams = filters
      ? `?${new URLSearchParams(filters).toString()}`
      : "";
    return this.get(`/courses${queryParams}`);
  }

  async getCourse(id: number) {
    return this.get(`/courses/${id}`);
  }

  async createCourse(courseData: any) {
    return this.post("/courses", courseData);
  }

  async updateCourse(id: number, courseData: any) {
    return this.patch(`/courses/${id}`, courseData);
  }

  async deleteCourse(id: number) {
    return this.delete(`/courses/${id}`);
  }

  async getMyCourses() {
    return this.get("/courses/my-courses");
  }

  async publishCourse(id: number) {
    return this.patch(`/courses/${id}/publish`, {});
  }

  async getStudentCount(courseId: number) {
    return this.get(`/courses/${courseId}/student-count`);
  }

  // Enrollment API methods
  async enrollInCourse(courseId: number) {
    return this.post("/enrollments", { courseId });
  }

  async getMyEnrollments() {
    return this.get("/enrollments/my-enrollments");
  }

  // AI Recommendation
  async generateRecommendation(data: {
    goal: string;
    currentLevel: string;
    preferences: string[];
    verbosity?: "short" | "medium" | "deep";
    guidanceMode?: "novice" | "guided" | "standard";
  }) {
    return this.post("/recommendations", data);
  }

  async saveRecommendation(id: number, saved = true) {
    return this.post(`/recommendations/${id}/save`, { saved });
  }

  async followUpRecommendation(id: number, question: string) {
    return this.post(`/recommendations/${id}/followup`, { question });
  }

  async clarifyRecommendation(data: { question: string; context?: any }) {
    return this.post(`/recommendations/clarify`, data);
  }

  // Learning Paths
  async saveLearningPath(
    recommendationId: number,
    data: { name?: string; selectedCourseIds?: number[] }
  ) {
    return this.post(`/recommendations/${recommendationId}/save-path`, data);
  }

  async listMyLearningPaths() {
    return this.post(`/recommendations/my-paths`, {});
  }

  async getEnrollmentProgress(enrollmentId: number) {
    return this.get(`/enrollments/${enrollmentId}/progress`);
  }

  async updateProgress(enrollmentId: number, lessonId: number) {
    return this.patch(`/enrollments/${enrollmentId}/progress`, { lessonId });
  }

  async dropCourse(enrollmentId: number) {
    return this.delete(`/enrollments/${enrollmentId}`);
  }

  // Assignment API methods
  async getAssignments(courseId?: number) {
    const queryParams = courseId ? `?courseId=${courseId}` : "";
    return this.get(`/assignments${queryParams}`);
  }

  async createAssignment(assignmentData: any) {
    return this.post("/assignments", assignmentData);
  }

  async submitAssignment(assignmentId: number, submissionData: any) {
    return this.post(`/assignments/${assignmentId}/submit`, submissionData);
  }

  async gradeSubmission(submissionId: number, gradeData: any) {
    return this.patch(
      `/assignments/submissions/${submissionId}/grade`,
      gradeData
    );
  }

  async getMySubmissions() {
    return this.get("/assignments/my-submissions");
  }

  // Forum API methods
  async getForumPosts(courseId?: number) {
    const queryParams = courseId ? `?courseId=${courseId}` : "";
    return this.get(`/forum/posts${queryParams}`);
  }

  async createForumPost(postData: any) {
    return this.post("/forum/posts", postData);
  }

  async getForumComments(postId: number) {
    return this.get(`/forum/posts/${postId}/comments`);
  }

  async createForumComment(postId: number, commentData: any) {
    return this.post(`/forum/posts/${postId}/comments`, commentData);
  }

  // Notification API methods
  async getNotifications() {
    return this.get("/notifications");
  }

  async markNotificationAsRead(notificationId: number) {
    return this.patch(`/notifications/${notificationId}/read`, {});
  }

  async createNotification(notificationData: any) {
    return this.post("/notifications", notificationData);
  }

  // Admin API methods
  async getUsers() {
    return this.get("/admin/users");
  }

  async createUser(userData: any) {
    return this.post("/admin/users", userData);
  }

  async updateUser(userId: number, userData: any) {
    return this.patch(`/admin/users/${userId}`, userData);
  }

  async deleteUser(userId: number) {
    return this.delete(`/admin/users/${userId}`);
  }

  async blockUser(userId: number) {
    return this.patch(`/admin/users/${userId}/block`, {});
  }

  async unblockUser(userId: number) {
    return this.patch(`/admin/users/${userId}/unblock`, {});
  }

  async assignRole(userId: number, roleData: any) {
    const roleName = typeof roleData === "string" ? roleData : roleData?.role;
    return this.post(
      `/admin/users/${userId}/roles/${encodeURIComponent(roleName)}`,
      {}
    );
  }

  // Admin category/tag management
  async getAdminCategories() {
    return this.get("/admin/categories");
  }

  async createAdminCategory(data: { name: string; description?: string }) {
    return this.post("/admin/categories", data);
  }

  async deleteAdminCategory(id: number) {
    return this.delete(`/admin/categories/${id}`);
  }

  async getAdminTags() {
    return this.get("/admin/tags");
  }

  async createAdminTag(data: { name: string }) {
    return this.post("/admin/tags", data);
  }

  async deleteAdminTag(id: number) {
    return this.delete(`/admin/tags/${id}`);
  }

  async getSystemStats() {
    // Note: Backend does not expose /admin/stats. Compute stats on client instead.
    throw new Error(
      "/admin/stats endpoint is not available. Compute on client."
    );
  }
}

export const apiService = new ApiService(API_BASE_URL);
