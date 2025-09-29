"use client";
import React, { useEffect, useState, useMemo } from "react";
import { RoleGuard } from "../../../../components/RoleGuard";
import Heading from "../../../../utils/Heading";
import Header from "../../../../components/Header";
import { useParams } from "next/navigation";
import { enrollmentService } from "../../../../services/api-enrollment";
import { courseService } from "../../../../services/api-course";
import { assignmentService } from "../../../../services/api-assignment";
import Link from "next/link";

export default function CourseEnrollmentsPage() {
  const { id } = useParams() as { id: string };
  const courseId = Number(id);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  // progress details are shown on the dedicated progress page; no modal here
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  const loadData = async () => {
    const [list, s] = await Promise.all([
      enrollmentService.getCourseEnrollments(courseId),
      enrollmentService.getCourseEnrollmentStats(courseId),
    ]);
    setEnrollments((list as any).data || list || []);
    setStats((s as any).data || s || null);
  };

  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const cRes = await courseService.getCourse(courseId);
        setCourse((cRes as any).data || cRes || null);
      } catch (e) {
        setCourse(null);
      }
    })();
  }, [courseId]);

  const filtered = useMemo(() => {
    if (!query) return enrollments;
    return enrollments.filter((e: any) => {
      const name = `${e.student?.first_name || ""} ${
        e.student?.last_name || ""
      }`.toLowerCase();
      return (
        name.includes(query.toLowerCase()) ||
        String(e.student?.email || "")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    });
  }, [enrollments, query]);

  const updateStatus = async (enrollmentId: number, status: string) => {
    await enrollmentService.updateEnrollmentStatus(enrollmentId, status);
    await loadData();
  };

  const [openSubmissionsFor, setOpenSubmissionsFor] = useState<number | null>(
    null
  );
  const [submissionsCache, setSubmissionsCache] = useState<
    Record<number, any[]>
  >({});

  const loadStudentSubmissions = async (
    studentId: number,
    enrollmentId: number
  ) => {
    try {
      const res = await assignmentService.getSubmissionsByStudent(studentId);
      const list = (res as any).data || res || [];
      setSubmissionsCache((s) => ({
        ...s,
        [enrollmentId]: Array.isArray(list) ? list : [],
      }));
    } catch (err) {
      setSubmissionsCache((s) => ({ ...s, [enrollmentId]: [] }));
    }
  };

  // navigation to progress detail page is handled by Link in the UI

  const exportCsv = () => {
    const header = [
      "Student",
      "Status",
      "Progress%",
      "Enrolled At",
      "Completed At",
    ];
    const rows = enrollments.map((e: any) => [
      `${e.student?.first_name || ""} ${e.student?.last_name || ""}`,
      e.status,
      e.progress_percentage,
      e.enrolled_at,
      e.completed_at || "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `course-${courseId}-enrollments.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Ghi danh khóa học"
          description="Phê duyệt và quản lý ghi danh"
          keywords="ghi danh,quan ly"
        />
        <Header />
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl font-bold text-gray-600">
                  {course?.title ? course.title.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {course?.title || "Khóa học"}
                  </h2>
                  <div className="text-sm text-gray-500">
                    {course?.description}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="mr-2">
                      Tổng học viên: <b>{stats?.total ?? 0}</b>
                    </span>
                    <span className="mr-2 text-green-700">
                      Đang học: <b>{stats?.active ?? 0}</b>
                    </span>
                    <span className="mr-2 text-blue-700">
                      Hoàn thành: <b>{stats?.completed ?? 0}</b>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm học viên theo tên hoặc email"
                  className="px-3 py-2 border rounded-lg text-sm w-64"
                />
                <button
                  onClick={exportCsv}
                  className="px-4 py-2 rounded bg-gray-800 text-white"
                >
                  Xuất CSV
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((e: any) => {
              const progress = Number(e.progress_percentage) || 0;
              const status =
                progress >= 100 || e.status === "COMPLETED"
                  ? "COMPLETED"
                  : "ACTIVE";
              return (
                <div
                  key={e.id}
                  className="relative bg-white rounded-lg shadow p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-lg font-semibold text-blue-700">
                      {e.student?.first_name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {e.student?.first_name} {e.student?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {e.student?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {status === "COMPLETED" ? "Đã hoàn thành" : "Đang học"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/instructor/courses/${courseId}/enrollments/${e.id}/progress`}
                        className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
                      >
                        Xem tiến độ
                      </Link>

                      <Link
                        href={`/instructor/courses/${courseId}/enrollments/${e.id}/submissions?student=${e.student.id}`}
                        className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
                      >
                        Bài nộp
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress details are shown on the dedicated progress page */}
        </div>
      </div>
    </RoleGuard>
  );
}
