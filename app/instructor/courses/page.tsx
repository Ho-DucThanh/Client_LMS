"use client";
import React, { useEffect, useMemo, useState } from "react";
import { RoleGuard } from "../../components/RoleGuard";
import Heading from "../../utils/Heading";
import Header from "../../components/Header";
import { useRouter } from "next/navigation";
import { courseService } from "../../services/api-course";
import { notificationService } from "../../services/api-notification";
import Link from "next/link";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import {
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Approval = "PENDING" | "APPROVED" | "REJECTED";

export default function InstructorCoursesPage() {
  // Pagination state
  const COURSES_PER_PAGE = 6;
  const [page, setPage] = useState(1);

  const router = useRouter();
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [approval, setApproval] = useState<Approval | "">("");

  useEffect(() => {
    if (user?.id) loadCourses();
    // Reset to page 1 when filters/search change
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, search, status, approval]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseService.getCourses({
        instructor_id: user!.id,
        search: search || undefined,
        status: (status || undefined) as any,
        approval_status: (approval || undefined) as any,
        limit: 100,
        page: 1,
      });
      const data =
        (res as any).data?.courses ||
        (res as any).courses ||
        (res as any).data ||
        res ||
        [];
      setCourses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (id: number) => {
    if (!confirm("Delete this course? This will archive it.")) return;
    try {
      await courseService.deleteCourse(id);
      await loadCourses();
    } catch (e) {
      alert("Delete failed.");
    }
  };

  const publishCourse = async (id: number) => {
    try {
      await courseService.publishCourse(id);
      await loadCourses();
      alert("Course published.");
    } catch (e) {
      alert("Publish failed. Ensure course is approved.");
    }
  };

  const formatNumber = (n?: number) =>
    typeof n === "number" ? n.toLocaleString() : "-";

  const levelLabel = (lvl?: string) => {
    if (!lvl) return "-";
    if (lvl === "BEGINNER") return "Beginner";
    if (lvl === "INTERMEDIATE") return "Intermediate";
    if (lvl === "ADVANCED") return "Advanced";
    return lvl;
  };

  const toNum = (v: any): number => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    const n = parseFloat(v as any);
    return isNaN(n) ? 0 : n;
  };

  // Custom sort order: PUBLISHED -> DRAFT -> ARCHIVED
  const statusOrder: Record<Status, number> = {
    PUBLISHED: 0,
    DRAFT: 1,
    ARCHIVED: 2,
  };
  const sortedCourses = [...courses].sort((a, b) => {
    const aOrder = statusOrder[a.status as Status] ?? 99;
    const bOrder = statusOrder[b.status as Status] ?? 99;
    return aOrder - bOrder;
  });

  // Pagination logic
  const totalCourses = sortedCourses.length;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const paginatedCourses = sortedCourses.slice(
    (page - 1) * COURSES_PER_PAGE,
    page * COURSES_PER_PAGE
  );

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Quản lý khóa học"
          description="Tạo và quản lý các khóa học của bạn"
          keywords="giang vien,khoa hoc,quan ly"
        />
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Khóa học của tôi
            </h1>
            <button
              onClick={() => router.push("/instructor/courses/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Tạo khóa học
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Tìm kiếm
                </label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tiêu đề/mô tả"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Trạng thái
                </label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="">Tất cả</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="PUBLISHED">Đã xuất bản</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Phê duyệt
                </label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={approval}
                  onChange={(e) => setApproval(e.target.value as any)}
                >
                  <option value="">Tất cả</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setApproval("");
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-blue-600" />
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded p-8 text-center text-gray-600">
              Không tìm thấy khóa học nào.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map((c) => {
                  const isPopular =
                    (c.total_enrolled ?? 0) > 1000 ||
                    (c.rating_count ?? 0) > 1000;
                  const rating = typeof c.rating === "number" ? c.rating : 0;
                  const ratingCount = c.rating_count ?? 0;
                  const tags: { id?: number; name: string }[] = (c.tags ||
                    []) as any[];
                  return (
                    <div
                      key={c.id}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
                    >
                      <div className="relative h-40 bg-gray-100">
                        {c.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt={c.title}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        {isPopular && (
                          <span className="absolute top-3 left-3 text-xs font-semibold bg-orange-500 text-white px-2 py-1 rounded-md shadow">
                            Phổ biến
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        {/* tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.slice(0, 3).map((t, idx) => (
                              <span
                                key={t.id ?? idx}
                                className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {c.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {c.description}
                        </p>

                        {/* author */}
                        {(c.instructor?.first_name ||
                          c.instructor?.last_name) && (
                          <p className="mt-2 text-sm text-gray-700">
                            By {c.instructor?.first_name}{" "}
                            {c.instructor?.last_name}
                          </p>
                        )}

                        {/* rating */}
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const filled =
                                rating >= i + 1 ||
                                (rating > i && rating < i + 1);
                              return (
                                <StarSolidIcon
                                  key={i}
                                  className={`h-4 w-4 ${
                                    filled ? "text-yellow-500" : "text-gray-300"
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-gray-800 font-medium">
                            {rating.toFixed(1)}
                          </span>
                          <span className="text-gray-500">
                            ({formatNumber(ratingCount)})
                          </span>
                        </div>

                        {/* stats */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {c.duration_hours ?? 0} giờ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <UserGroupIcon className="h-4 w-4" />
                            {formatNumber(c.total_enrolled)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <AcademicCapIcon className="h-4 w-4" />
                            {levelLabel(c.level)}
                          </span>
                        </div>

                        {/* price + status badges */}
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            {(() => {
                              const price = toNum(c.price);
                              const original = toNum(c.original_price);
                              const hasDiscount =
                                original > price && price >= 0;
                              const pct = hasDiscount
                                ? Math.round(
                                    ((original - price) / original) * 100
                                  )
                                : 0;
                              return (
                                <div className="flex items-baseline gap-2">
                                  <div className="text-2xl font-bold text-gray-900">
                                    ${price.toFixed(2)}
                                  </div>
                                  {hasDiscount && (
                                    <>
                                      <div className="text-sm text-gray-500 line-through">
                                        ${original.toFixed(2)}
                                      </div>
                                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                        -{pct}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                              {c.status}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                c.approval_status === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : c.approval_status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {c.approval_status}
                            </span>
                          </div>
                        </div>

                        {/* actions */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            href={`/instructor/courses/${c.id}/manage`}
                            className="col-span-2 md:col-span-1 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                          >
                            Quản lý
                          </Link>
                          <Link
                            href={`/instructor/courses/${c.id}/enrollments`}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm hover:bg-gray-50"
                          >
                            Học viên
                          </Link>
                          <button
                            onClick={() =>
                              router.push(`/instructor/courses/${c.id}/edit`)
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm hover:bg-gray-50"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() => deleteCourse(c.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 px-4 py-2 text-sm hover:bg-red-50"
                          >
                            Xóa
                          </button>

                          {c.status === "PUBLISHED" ? (
                            <button
                              className="col-span-2 inline-flex items-center justify-center rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium opacity-70 cursor-not-allowed"
                              disabled
                              title="Khóa học này đã được xuất bản"
                            >
                              Đã xuất bản
                            </button>
                          ) : (
                            <button
                              onClick={() => publishCourse(c.id)}
                              className="col-span-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                              disabled={c.approval_status !== "APPROVED"}
                              title={
                                c.approval_status !== "APPROVED"
                                  ? "Cần được phê duyệt trước"
                                  : "Xuất bản khóa học"
                              }
                            >
                              Xuất bản
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  <button
                    className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      className={`px-3 py-1 rounded border ${
                        page === idx + 1 ? "bg-blue-600 text-white" : "bg-white"
                      }`}
                      onClick={() => setPage(idx + 1)}
                      disabled={page === idx + 1}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    className="px-3 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
