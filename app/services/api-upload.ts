import { baseApi } from "./api-base";

const API_BASE_URL = "http://localhost:3000";

async function sendFormData(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const uploadService = {
  // Generic helper (field name defaults to 'file')
  async uploadFile(
    file: File,
    endpoint: string = "/upload",
    fieldName = "file"
  ) {
    const formData = new FormData();
    formData.append(fieldName, file);
    return sendFormData(endpoint, formData);
  },

  // Avatar (Teacher/Admin)
  async uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return sendFormData("/upload/avatar", fd);
  },

  // Course thumbnail (Teacher/Admin) -> field 'thumbnail'
  async uploadCourseThumbnail(file: File, courseId?: number) {
    const fd = new FormData();
    fd.append("thumbnail", file);
    if (courseId) fd.append("course_id", String(courseId));
    return sendFormData("/upload/cloudinary/course-thumbnail", fd);
  },

  // Lesson video (Teacher/Admin) -> field 'video'
  async uploadLessonVideo(file: File, lessonId?: number) {
    const fd = new FormData();
    fd.append("video", file);
    if (lessonId) fd.append("lesson_id", String(lessonId));
    return sendFormData("/upload/cloudinary/lesson-video", fd);
  },

  // Delete lesson video associated with a lesson id
  async deleteLessonVideo(lessonId: number) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(
      `${API_BASE_URL}/upload/cloudinary/lesson-video?lesson_id=${lessonId}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Delete failed: ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  },

  // Assignment file (Teacher/Admin for now) -> field 'file'
  async uploadAssignmentFile(file: File, assignmentId?: number) {
    const fd = new FormData();
    fd.append("file", file);
    if (assignmentId) fd.append("assignment_id", String(assignmentId));
    return sendFormData("/upload/cloudinary/assignment-file", fd);
  },
};
