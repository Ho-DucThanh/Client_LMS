"use client";
import React, { useMemo, useState } from "react";
import {
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

export interface AdminCourseItem {
  id: number;
  title: string;
  instructor?: any;
  instructor_name?: string;
  isPublished?: boolean;
  status?: string;
  approval_status?: "PENDING" | "APPROVED" | "REJECTED" | string;
  enrollmentCount?: number;
  total_enrolled?: number;
  createdAt?: string;
  created_at?: string;
  enrollments?: any[];
}

export type AdminCoursesProps = {
  courses: AdminCourseItem[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onStatusChange?: (status: "PENDING" | "APPROVED" | "REJECTED") => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
};

const AdminCourses: React.FC<AdminCoursesProps> = ({
  courses,
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onStatusChange,
  onApprove,
  onReject,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");

  const getApprovalStatus = (c: AdminCourseItem) => {
    const raw = (c.approval_status as any) || (c as any).approvalStatus;
    if (raw) return String(raw).toUpperCase() as any;
    if ((c.status || "").toUpperCase() === "PUBLISHED") return "APPROVED"; // heuristic fallback
    return "PENDING";
  };

  const getInstructorName = (course: AdminCourseItem) => {
    const i = course.instructor as any;
    if (typeof i === "string" && i) return i;
    if (i && typeof i === "object") {
      const first = i.first_name || i.firstName || "";
      const last = i.last_name || i.lastName || "";
      const full = `${first} ${last}`.trim();
      if (full) return full;
      if (i.email) return i.email as string;
    }
    if (course.instructor_name) return course.instructor_name as string;
    return "N/A";
  };

  const filteredCourses = useMemo(() => {
    return (courses || []).filter((c) => getApprovalStatus(c) === activeSubTab);
  }, [courses, activeSubTab]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 10)));

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Quản lý khóa học
      </h3>

      {/* Sub-tabs by approval status */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {(["PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveSubTab(tab);
                  onStatusChange && onStatusChange(tab);
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "PENDING"
                  ? "Chờ duyệt"
                  : tab === "APPROVED"
                  ? "Đã duyệt"
                  : "Từ chối"}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="space-y-4">
        {filteredCourses.length === 0 && (
          <div className="text-sm text-gray-500">Không tìm thấy khóa học.</div>
        )}
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            className="border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {course.title}
                </h4>
                <p className="text-gray-600">
                  Giảng viên: {getInstructorName(course)}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>
                    {course.enrollmentCount ??
                      course.total_enrolled ??
                      course.enrollments?.length ??
                      0}{" "}
                    lượt ghi danh
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full ${
                      getApprovalStatus(course) === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : getApprovalStatus(course) === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {getApprovalStatus(course) === "APPROVED"
                      ? "Đã duyệt"
                      : getApprovalStatus(course) === "REJECTED"
                      ? "Từ chối"
                      : "Chờ duyệt"}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full ${
                      course.isPublished ?? course.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {course.isPublished ?? course.status === "PUBLISHED"
                      ? "Đã xuất bản"
                      : "Bản nháp"}
                  </span>
                  <span>
                    Tạo ngày {""}
                    {new Date(
                      (course.created_at as any) || (course.createdAt as any)
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {activeSubTab === "PENDING" && (
                  <>
                    <button
                      onClick={() => onApprove && onApprove(course.id)}
                      className="p-2 text-green-600 hover:text-green-700 flex items-center gap-1"
                      title="Duyệt khóa học"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Duyệt
                    </button>
                    <button
                      onClick={() => onReject && onReject(course.id)}
                      className="p-2 text-red-600 hover:text-red-700 flex items-center gap-1"
                      title="Từ chối khóa học"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() =>
                  onPageChange && onPageChange(Math.max(1, page - 1))
                }
                disabled={page <= 1}
              >
                Trước
              </button>
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() =>
                  onPageChange && onPageChange(Math.min(totalPages, page + 1))
                }
                disabled={page >= totalPages}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
