"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import LearningPath from "../components/LearningPath"; // legacy (may keep for fallback)
import LearningPathSplit from "../components/LearningPathSplit";
import { useAuth } from "../contexts/AuthContext";
import { enrollmentService } from "../services/api-enrollment";
import { courseService } from "../services/api-course";
import { reportsService } from "../services/api-reports";
import { Enrollment } from "../types";

export default function StudentDashboard() {
  const { user } = useAuth();
  const role: string = (user?.role as unknown as string) || "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  const [reports, setReports] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [trendParams, setTrendParams] = useState<{
    from: string;
    to: string;
    interval: "day" | "month";
  }>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    return { from: fmt(from), to: fmt(to), interval: "day" };
  });

  const [myCoursesCount, setMyCoursesCount] = useState<number>(0);
  const [teacherStats, setTeacherStats] = useState({
    totalStudents: 0,
    active: 0,
    completed: 0,
    dropped: 0,
    pending: 0,
  });
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const tab = searchParams?.get("tab");
    if (tab && typeof tab === "string") setActiveTab(tab);
  }, [isMounted, searchParams]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
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
      loadReports("teacher");
      return;
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user?.role !== "ROLE_STUDENT") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadEnrollments();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user]);

  useEffect(() => {
    if (activeTab === "reports" && role === "ROLE_TEACHER" && !reports) {
      loadReports("teacher");
    }
  }, [activeTab, role]);

  const loadTeacherOverview = async () => {
    try {
      const res = await courseService.getMyCourses();
      const courses = ((res as any).data || res || []) as any[];
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
        } catch {}
        try {
          const eRes = await enrollmentService.getCourseEnrollments(c.id);
          const list = ((eRes as any).data || eRes || []) as any[];
          const pendings = list.filter((e) => e.status === "PENDING");
          pending += pendings.length;
          pendings.forEach((e) =>
            pendingList.push({ ...e, course_title: c.title })
          );
        } catch {}
      }
      setTeacherStats({
        totalStudents: total,
        active,
        completed,
        dropped,
        pending,
      });
      setPendingEnrollments(pendingList);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const response = await enrollmentService.getMyEnrollments();
      const list = (response as any).data || response || [];
      setEnrollments(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (r: "admin" | "teacher") => {
    try {
      if (r === "admin") {
        const [overview, courses] = await Promise.all([
          reportsService.getAdminOverview(),
          reportsService.getAdminCourses(1, 10),
        ]);
        setReports({ role: r, overview, courses });
        const t = await reportsService.getAdminTrends(
          trendParams.from,
          trendParams.to,
          trendParams.interval
        );
        setTrends(t);
      } else {
        const [overview, courses] = await Promise.all([
          reportsService.getTeacherOverview(),
          reportsService.getTeacherCourses(undefined, 1, 10),
        ]);
        setReports({ role: r, overview, courses });
        const t = await reportsService.getTeacherTrends(
          undefined,
          trendParams.from,
          trendParams.to,
          trendParams.interval
        );
        setTrends(t);
      }
    } catch (e) {
      console.error("Failed to load reports", e);
    }
  };

  const reloadTrendsOnly = async () => {
    if (!reports) return;
    try {
      if (reports.role === "admin") {
        const t = await reportsService.getAdminTrends(
          trendParams.from,
          trendParams.to,
          trendParams.interval
        );
        setTrends(t);
      } else {
        const t = await reportsService.getTeacherTrends(
          undefined,
          trendParams.from,
          trendParams.to,
          trendParams.interval
        );
        setTrends(t);
      }
    } catch (e) {
      console.error("Failed to load trends", e);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      COMPLETED: "bg-blue-100 text-blue-800",
      DROPPED: "bg-red-100 text-red-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };
    const viText: Record<string, string> = {
      ACTIVE: "Đang học",
      COMPLETED: "Hoàn thành",
      DROPPED: "Đã hủy",
      PENDING: "Chờ duyệt",
    };
    const key = String(status).toUpperCase();
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusStyles[key] || "bg-gray-100 text-gray-700"
        }`}
      >
        {viText[key] || status}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-red-500";
    if (progress < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const safeProgress = (p: any) => {
    const n = Number(p);
    if (!Number.isFinite(n) || isNaN(n)) return 0;
    return Math.round(Math.max(0, Math.min(100, n)));
  };

  const stats = useMemo(() => {
    if (role !== "ROLE_STUDENT")
      return {
        totalEnrolled: 0,
        activeEnrollments: 0,
        completedCourses: 0,
        averageProgress: 0,
      };
    const normalized = enrollments.map((e) => ({
      ...e,
      _status: String(e.status || "").toUpperCase(),
      _progress: safeProgress((e as any).progress_percentage),
    }));
    const notDropped = normalized.filter((e) => e._status !== "DROPPED");
    const totalEnrolled = notDropped.length;
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
  }, [role, enrollments]);

  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return enrollments.slice(start, start + pageSize);
  }, [enrollments, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(enrollments.length / pageSize));
  const goToPage = (p: number) => {
    const page = Math.max(1, Math.min(totalPages, p));
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard?tab=${encodeURIComponent(tabId)}`, {
      scroll: false,
    });
  };

  const tabs = useMemo(() => {
    const base = [{ id: "overview", label: "Tổng quan", icon: ChartBarIcon }];
    const report =
      role === "ROLE_ADMIN" || role === "ROLE_TEACHER"
        ? [{ id: "reports", label: "Báo cáo", icon: ChartBarIcon }]
        : [];
    const student =
      role === "ROLE_STUDENT"
        ? [
            { id: "courses", label: "Khóa học của tôi", icon: BookOpenIcon },
            { id: "learning", label: "Lộ trình học", icon: AcademicCapIcon },
          ]
        : [];
    return [...base, ...report, ...student];
  }, [role]);

  if (!isMounted || loading) {
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
        title="Bảng điều khiển - Nền tảng học trực tuyến"
        description="Theo dõi tiến độ học và quản lý ghi danh"
        keywords="học viên, bảng điều khiển, khóa học, tiến độ, học tập"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chào mừng trở lại, {user?.firstName}!
          </h1>
          <p className="text-gray-600">Tiếp tục hành trình học tập của bạn</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
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

        {activeTab === "overview" && (
          <div className="space-y-8">
            {role === "ROLE_STUDENT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpenIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">
                        Tổng số ghi danh
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
                        Khóa học đang học
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
                        Hoàn thành
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
                        Tiến độ trung bình
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.averageProgress}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {role === "ROLE_TEACHER" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">
                      Khóa học giảng dạy
                    </div>
                    <div className="text-3xl font-bold">{myCoursesCount}</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">Học viên</div>
                    <div className="text-3xl font-bold">
                      {teacherStats.totalStudents}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-500">Chờ phê duyệt</div>
                    <div className="text-3xl font-bold">
                      {teacherStats.pending}
                    </div>
                  </div>
                  <Link
                    href="/instructor/courses"
                    className="bg-white rounded-lg shadow-sm p-6 hover:bg-gray-50"
                  >
                    <div className="text-sm text-gray-500">
                      Quản lý khóa học
                    </div>
                    <div className="text-sm text-blue-600">Mở</div>
                  </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Tổng quan tiến độ học viên
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Đang học",
                        value: teacherStats.active,
                        color: "bg-blue-600",
                      },
                      {
                        label: "Hoàn thành",
                        value: teacherStats.completed,
                        color: "bg-green-600",
                      },
                      {
                        label: "Đã hủy",
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

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Phê duyệt ghi danh
                    </h3>
                    <span className="text-sm text-gray-500">
                      {pendingEnrollments.length} đang chờ
                    </span>
                  </div>
                  {pendingEnrollments.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      Hiện không có ghi danh đang chờ.
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
                              Mã học viên: {e.student_id}
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
                              Duyệt
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
                              Từ chối
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Tác vụ nhanh
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {role === "ROLE_STUDENT" ? (
                  <Link
                    href="/submissions"
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <BookOpenIcon className="w-5 h-5" />
                    <span>Bài nộp của tôi</span>
                  </Link>
                ) : (
                  <Link
                    href="/courses"
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <BookOpenIcon className="w-5 h-5" />
                    <span>Xem khóa học</span>
                  </Link>
                )}

                {role === "ROLE_STUDENT" && (
                  <button
                    onClick={() => switchTab("courses")}
                    className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <AcademicCapIcon className="w-5 h-5" />
                    <span>Khóa học của tôi</span>
                  </button>
                )}

                <Link
                  href={
                    role === "ROLE_TEACHER"
                      ? "/instructor/courses"
                      : "/progress"
                  }
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span>
                    {role === "ROLE_TEACHER"
                      ? "Quản lý khóa học"
                      : "Xem tiến độ"}
                  </span>
                </Link>
              </div>
            </div>

            {role === "ROLE_STUDENT" && enrollments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Hoạt động gần đây
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
                          Ghi danh ngày {""}
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

        {activeTab === "reports" &&
          (role === "ROLE_ADMIN" || role === "ROLE_TEACHER") && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {role === "ROLE_ADMIN"
                      ? "Báo cáo quản trị"
                      : "Báo cáo giảng viên"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Theo dõi hiệu suất và xu hướng học tập theo thời gian
                  </p>
                </div>
                <div className="mb-6 bg-gray-50/80 border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={trendParams.from}
                      onChange={(e) =>
                        setTrendParams((p) => ({ ...p, from: e.target.value }))
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={trendParams.to}
                      onChange={(e) =>
                        setTrendParams((p) => ({ ...p, to: e.target.value }))
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Khoảng thời gian
                    </label>
                    <select
                      value={trendParams.interval}
                      onChange={(e) =>
                        setTrendParams((p) => ({
                          ...p,
                          interval: e.target.value as "day" | "month",
                        }))
                      }
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="day">Ngày</option>
                      <option value="month">Tháng</option>
                    </select>
                  </div>
                  <button
                    onClick={reloadTrendsOnly}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-sm"
                  >
                    Áp dụng
                  </button>
                </div>

                {!reports ? (
                  <div className="text-sm text-gray-600">
                    Đang tải báo cáo...
                  </div>
                ) : reports.role === "admin" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <AcademicCapIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Người dùng
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.users ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                            <BookOpenIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Khóa học
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.courses ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <ChartBarIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Lượt ghi danh
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.enrollments ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                            <CheckCircleIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Bài nộp
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.submissions ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Hiệu quả khóa học (Top 10)
                      </h3>
                      <div className="divide-y">
                        {((reports.courses?.data || []) as any[]).map(
                          (row: any, _, arr: any[]) => {
                            const maxEnroll = Math.max(
                              1,
                              ...arr.map((r: any) => Number(r.enrollments || 0))
                            );
                            const val = Number(row.enrollments || 0);
                            const width = Math.round((val / maxEnroll) * 100);
                            return (
                              <div key={row.id} className="py-3">
                                <div className="flex items-center justify-between gap-4 text-sm">
                                  <div className="flex-1 truncate pr-3 text-gray-900 font-medium">
                                    {row.title}
                                  </div>
                                  <div className="w-28 text-right text-gray-700">
                                    Ghi danh: {val}
                                  </div>
                                  <div className="w-36 text-right text-gray-700">
                                    Đánh giá TB:{" "}
                                    {Number(row.avg_rating || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                                  <div
                                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Xu hướng
                      </h3>
                      {!trends ? (
                        <div className="text-sm text-gray-600">
                          Đang tải xu hướng...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {(
                            ["enrollments", "submissions", "reviews"] as const
                          ).map((key) => {
                            const labels: Record<string, string> = {
                              enrollments: "Ghi danh",
                              submissions: "Bài nộp",
                              reviews: "Đánh giá",
                            };
                            const series = (trends as any)[key] || [];
                            const max = Math.max(
                              1,
                              ...series.map((s: any) => Number(s.count || 0))
                            );
                            return (
                              <div
                                key={key}
                                className="rounded-lg bg-gray-50 p-4"
                              >
                                <div className="text-sm font-medium text-gray-800 mb-2">
                                  {labels[key]}
                                </div>
                                <div className="flex items-end gap-1.5 h-28">
                                  {series.map((s: any) => {
                                    const h =
                                      (Number(s.count || 0) / max) * 100;
                                    return (
                                      <div
                                        key={s.bucket}
                                        title={`${s.bucket}: ${s.count}`}
                                        className="w-2.5 rounded-t-md bg-gradient-to-t from-blue-300 to-blue-600"
                                        style={{ height: `${h}%` }}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-500 truncate">
                                  {series.map((s: any) => s.bucket).join("  ")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                            <BookOpenIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Khóa học
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.courses ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <AcademicCapIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Học viên
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.totals?.students ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <ChartBarIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Ghi danh đang hoạt động
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {reports.overview?.enrollments?.active ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Khóa học của bạn (Top 10)
                      </h3>
                      <div className="divide-y">
                        {((reports.courses?.data || []) as any[]).map(
                          (row: any, _, arr: any[]) => {
                            const maxEnroll = Math.max(
                              1,
                              ...arr.map((r: any) => Number(r.enrollments || 0))
                            );
                            const val = Number(row.enrollments || 0);
                            const width = Math.round((val / maxEnroll) * 100);
                            return (
                              <div key={row.id} className="py-3">
                                <div className="flex items-center justify-between gap-4 text-sm">
                                  <div className="flex-1 truncate pr-3 text-gray-900 font-medium">
                                    {row.title}
                                  </div>
                                  <div className="w-28 text-right text-gray-700">
                                    Ghi danh: {val}
                                  </div>
                                  <div className="w-36 text-right text-gray-700">
                                    Đánh giá TB:{" "}
                                    {Number(row.avg_rating || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                                  <div
                                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Xu hướng
                      </h3>
                      {!trends ? (
                        <div className="text-sm text-gray-600">
                          Đang tải xu hướng...
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {(
                            ["enrollments", "submissions", "reviews"] as const
                          ).map((key) => {
                            const labels: Record<string, string> = {
                              enrollments: "Ghi danh",
                              submissions: "Bài nộp",
                              reviews: "Đánh giá",
                            };
                            const series = (trends as any)[key] || [];
                            const max = Math.max(
                              1,
                              ...series.map((s: any) => Number(s.count || 0))
                            );
                            return (
                              <div
                                key={key}
                                className="rounded-lg bg-gray-50 p-4"
                              >
                                <div className="text-sm font-medium text-gray-800 mb-2">
                                  {labels[key]}
                                </div>
                                <div className="flex items-end gap-1.5 h-28">
                                  {series.map((s: any) => {
                                    const h =
                                      (Number(s.count || 0) / max) * 100;
                                    return (
                                      <div
                                        key={s.bucket}
                                        title={`${s.bucket}: ${s.count}`}
                                        className="w-2.5 rounded-t-md bg-gradient-to-t from-emerald-300 to-emerald-600"
                                        style={{ height: `${h}%` }}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-500 truncate">
                                  {series.map((s: any) => s.bucket).join("  ")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {activeTab === "learning" && role === "ROLE_STUDENT" && (
          <div className="space-y-6">
            <LearningPathSplit />
          </div>
        )}

        {role === "ROLE_STUDENT" && activeTab === "courses" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Khóa học đã ghi danh
              </h2>
              <Link
                href="/courses"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Xem thêm khóa học
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chưa có khóa học đã ghi danh
                </h3>
                <p className="text-gray-600 mb-6">
                  Bắt đầu hành trình học tập bằng cách ghi danh một khóa học.
                </p>
                <Link
                  href="/courses"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xem khóa học
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Hiển thị{" "}
                    {Math.min(
                      (currentPage - 1) * pageSize + 1,
                      enrollments.length
                    )}{" "}
                    - {Math.min(currentPage * pageSize, enrollments.length)}{" "}
                    trong tổng {enrollments.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Mỗi trang:</label>
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
                        // eslint-disable-next-line @next/next/no-img-element
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
                            <span>Tiến độ</span>
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
                            Ghi danh:{" "}
                            {new Date(
                              enrollment.enrolled_at
                            ).toLocaleDateString()}
                          </span>
                          {enrollment.completed_at && (
                            <span>
                              Hoàn thành:{" "}
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
                            Tiếp tục học
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

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
                    Trước
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
                    Sau
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
