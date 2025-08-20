"use client";
import React, { useState, useEffect, useContext, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { enrollmentService } from "../services/api-enrollment";
import { courseService } from "../services/api-course";
import { Enrollment } from "../types";

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  // pagination for My Courses (student)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6); // items per page
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [myCoursesCount, setMyCoursesCount] = useState<number>(0);
  // Teacher specific
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [teacherStats, setTeacherStats] = useState({
    totalStudents: 0,
    active: 0,
    completed: 0,
    dropped: 0,
    pending: 0,
  });
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Admins go straight to /admin
    if (user.role === "ROLE_ADMIN") {
      router.replace("/admin");
      setLoading(false);
      return;
    }
    if (user.role === "ROLE_STUDENT") {
      loadEnrollments();
      return;
    }
    if (user.role === "ROLE_TEACHER") {
      loadTeacherOverview();
      return;
    }
    setLoading(false);
  }, [user]);

  // Reload enrollments when the user returns to the tab (help reflect progress updates)
  useEffect(() => {
    if (user?.role !== "ROLE_STUDENT") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        loadEnrollments();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user]);

  const loadTeacherOverview = async () => {
    try {
      const res = await courseService.getMyCourses();
      const courses = ((res as any).data || res || []) as any[];
      setTeacherCourses(courses);
      setMyCoursesCount(Array.isArray(courses) ? courses.length : 0);

      let total = 0,
        active = 0,
        completed = 0,
        dropped = 0,
        pending = 0;
      const pendingList: any[] = [];
      for (const c of courses) {
        try {
          const sRes = await enrollmentService.getCourseEnrollmentStats(c.id);
          const s = (sRes as any).data || sRes || {};
          total += Number(s.total || 0);
          active += Number(s.active || 0);
          completed += Number(s.completed || 0);
          dropped += Number(s.dropped || 0);
        } catch (e) {}
        try {
          const eRes = await enrollmentService.getCourseEnrollments(c.id);
          const list = ((eRes as any).data || eRes || []) as any[];
          const pendings = list.filter((e) => e.status === "PENDING");
          pending += pendings.length;
          pendings.forEach((e) =>
            pendingList.push({ ...e, course_title: c.title })
          );
        } catch (e) {}
      }
      setTeacherStats({
        totalStudents: total,
        active,
        completed,
        dropped,
        pending,
      });
      setPendingEnrollments(pendingList);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const response = await enrollmentService.getMyEnrollments();
      const list = (response as any).data || response || [];
      setEnrollments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error loading enrollments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDropCourse = async (courseId: number) => {
    if (!confirm("Are you sure you want to drop this course?")) return;

    try {
      await enrollmentService.dropCourse(courseId);
      alert("Course dropped successfully!");
      loadEnrollments(); // Refresh enrollments
    } catch (error) {
      console.error("Error dropping course:", error);
      alert("Failed to drop course. Please try again.");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      ACTIVE: "bg-green-100 text-green-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      DROPPED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusStyles[status as keyof typeof statusStyles]
        }`}
      >
        {status}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  // helper to coerce progress values to safe integer (0-100)
  const safeProgress = (p: any) => {
    const n = Number(p);
    if (!Number.isFinite(n) || isNaN(n)) return 0;
    return Math.round(Math.max(0, Math.min(100, n)));
  };

  // Calculate stats (students only; default zeros otherwise)
  const stats = useMemo(() => {
    if (user?.role !== "ROLE_STUDENT") {
      return {
        totalEnrolled: 0,
        activeEnrollments: 0,
        completedCourses: 0,
        averageProgress: 0,
      };
    }
    // normalize statuses to be robust against casing or unexpected values
    const normalized = enrollments.map((e) => ({
      ...e,
      _status: String(e.status || "").toUpperCase(),
      _progress: safeProgress((e as any).progress_percentage),
    }));

    const notDropped = normalized.filter((e) => e._status !== "DROPPED");
    const totalEnrolled = notDropped.length; // exclude dropped
    const activeEnrollments = normalized.filter(
      (e) => e._status === "ACTIVE"
    ).length;
    const completedCourses = normalized.filter(
      (e) => e._status === "COMPLETED"
    ).length;
    const averageProgress = totalEnrolled
      ? Math.round(
          notDropped.reduce((acc, e) => acc + (e._progress || 0), 0) /
            totalEnrolled
        )
      : 0;
    return {
      totalEnrolled,
      activeEnrollments,
      completedCourses,
      averageProgress,
    };
  }, [user?.role, enrollments]);

  // paginated enrollments (client-side)
  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return enrollments.slice(start, start + pageSize);
  }, [enrollments, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(enrollments.length / pageSize));

  const goToPage = (p: number) => {
    const page = Math.max(1, Math.min(totalPages, p));
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Student Dashboard - ELearning Platform"
        description="Track your learning progress and manage your enrollments"
        keywords="student, dashboard, courses, progress, learning"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600">Continue your learning journey</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "overview", label: "Overview", icon: ChartBarIcon },
              // Only show student courses tab for ROLE_STUDENT
              ...(user?.role === "ROLE_STUDENT"
                ? ([
                    { id: "courses", label: "My Courses", icon: BookOpenIcon },
                  ] as const)
                : ([] as const)),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Role-specific overview */}
            {user?.role === "ROLE_STUDENT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpenIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Total Enrolled
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.totalEnrolled}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Active Courses
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.activeEnrollments}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Completed
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.completedCourses}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Avg Progress
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.averageProgress}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.role === "ROLE_TEACHER" && (
              <div className="space-y-6">
                {/* Teacher KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">Courses Taught</div>
                    <div className="text-3xl font-bold">{myCoursesCount}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">Students</div>
                    <div className="text-3xl font-bold">
                      {teacherStats.totalStudents}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">
                      Pending Approvals
                    </div>
                    <div className="text-3xl font-bold">
                      {teacherStats.pending}
                    </div>
                  </div>
                  <Link
                    href="/instructor/courses"
                    className="bg-white rounded-lg shadow-sm p-6 hover:bg-gray-50"
                  >
                    <div className="text-sm text-gray-500">Manage Courses</div>
                    <div className="text-sm text-blue-600">Open</div>
                  </Link>
                </div>

                {/* Aggregated progress chart */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Student Progress Overview
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Active",
                        value: teacherStats.active,
                        color: "bg-blue-600",
                      },
                      {
                        label: "Completed",
                        value: teacherStats.completed,
                        color: "bg-green-600",
                      },
                      {
                        label: "Dropped",
                        value: teacherStats.dropped,
                        color: "bg-gray-400",
                      },
                    ].map((row) => {
                      const total = Math.max(
                        teacherStats.active +
                          teacherStats.completed +
                          teacherStats.dropped,
                        1
                      );
                      const pct = Math.round((row.value / total) * 100);
                      return (
                        <div
                          key={row.label}
                          className="flex items-center gap-3"
                        >
                          <div className="w-28 text-sm text-gray-600">
                            {row.label}
                          </div>
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`${row.color} h-3`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-14 text-right text-sm text-gray-700">
                            {row.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pending approvals */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Enrollment Approvals
                    </h3>
                    <span className="text-sm text-gray-500">
                      {pendingEnrollments.length} pending
                    </span>
                  </div>
                  {pendingEnrollments.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No pending enrollments right now.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {pendingEnrollments.slice(0, 8).map((e: any) => (
                        <li
                          key={e.id}
                          className="py-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {e.course_title}
                            </div>
                            <div className="text-xs text-gray-500">
                              Student ID: {e.student_id}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await enrollmentService.updateEnrollmentStatus(
                                    e.id,
                                    "ACTIVE"
                                  );
                                  setPendingEnrollments((prev) =>
                                    prev.filter((x) => x.id !== e.id)
                                  );
                                  setTeacherStats((s) => ({
                                    ...s,
                                    pending: Math.max(0, s.pending - 1),
                                    active: s.active + 1,
                                  }));
                                } catch {}
                              }}
                              className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await enrollmentService.updateEnrollmentStatus(
                                    e.id,
                                    "DROPPED"
                                  );
                                  setPendingEnrollments((prev) =>
                                    prev.filter((x) => x.id !== e.id)
                                  );
                                  setTeacherStats((s) => ({
                                    ...s,
                                    pending: Math.max(0, s.pending - 1),
                                    dropped: s.dropped + 1,
                                  }));
                                } catch {}
                              }}
                              className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                            >
                              Decline
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/courses"
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <BookOpenIcon className="w-5 h-5" />
                  <span>Browse Courses</span>
                </Link>

                {user?.role === "ROLE_STUDENT" && (
                  <button
                    onClick={() => setActiveTab("courses")}
                    className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <AcademicCapIcon className="w-5 h-5" />
                    <span>My Courses</span>
                  </button>
                )}

                <Link
                  href={
                    user?.role === "ROLE_TEACHER"
                      ? "/instructor/courses"
                      : "/progress"
                  }
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span>
                    {user?.role === "ROLE_TEACHER"
                      ? "Manage Courses"
                      : "View Progress"}
                  </span>
                </Link>
              </div>
            </div>

            {/* Recent Activity (students only) */}
            {user?.role === "ROLE_STUDENT" && enrollments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {enrollments.slice(0, 3).map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {enrollment.course?.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Enrolled on{" "}
                          {new Date(
                            enrollment.enrolled_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(enrollment.status)}
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {safeProgress(enrollment.progress_percentage)}%
                          </p>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(
                                safeProgress(enrollment.progress_percentage)
                              )}`}
                              style={{
                                width: `${safeProgress(
                                  enrollment.progress_percentage
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Courses Tab (students only) */}
        {user?.role === "ROLE_STUDENT" && activeTab === "courses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                My Enrolled Courses
              </h2>
              <Link
                href="/courses"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse More Courses
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Enrolled Courses
                </h3>
                <p className="text-gray-600 mb-6">
                  Start your learning journey by enrolling in a course.
                </p>
                <Link
                  href="/courses"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Showing{" "}
                    {Math.min(
                      (currentPage - 1) * pageSize + 1,
                      enrollments.length
                    )}{" "}
                    - {Math.min(currentPage * pageSize, enrollments.length)} of{" "}
                    {enrollments.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {[6, 9, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedEnrollments.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      {enrollment.course?.thumbnail_url && (
                        <img
                          src={enrollment.course.thumbnail_url}
                          alt={enrollment.course.title}
                          className="w-full h-52 object-cover"
                        />
                      )}

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {enrollment.course?.title}
                          </h3>
                          {getStatusBadge(enrollment.status)}
                        </div>

                        <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                          {enrollment.course?.description}
                        </p>

                        <div className="mb-4">
                          <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>
                              {safeProgress(enrollment.progress_percentage)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(
                                safeProgress(enrollment.progress_percentage)
                              )}`}
                              style={{
                                width: `${safeProgress(
                                  enrollment.progress_percentage
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                          <span>
                            Enrolled:{" "}
                            {new Date(
                              enrollment.enrolled_at
                            ).toLocaleDateString()}
                          </span>
                          {enrollment.completed_at && (
                            <span>
                              Completed:{" "}
                              {new Date(
                                enrollment.completed_at
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Link
                            href={`/learn/${enrollment.course_id}`}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                          >
                            Continue Learning
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-center mt-6 space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-500"
                        : "bg-white border"
                    }`}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={`px-3 py-1 rounded ${
                          p === currentPage
                            ? "bg-blue-600 text-white"
                            : "bg-white border text-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded ${
                      currentPage === totalPages
                        ? "bg-gray-200 text-gray-500"
                        : "bg-white border"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
