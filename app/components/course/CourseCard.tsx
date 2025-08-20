"use client";

import React from "react";
import Link from "next/link";
import { Course } from "../../types/index";

interface CourseCardProps {
  course: Course;
  showActions?: boolean;
  userRole?: string;
  currentUserId?: number;
  onEdit?: (course: Course) => void;
  onDelete?: (courseId: number) => void;
  onPublish?: (courseId: number) => void;
  onApprove?: (courseId: number) => void;
  onReject?: (courseId: number) => void;
  onEnroll?: (courseId: number) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  showActions = false,
  userRole,
  currentUserId,
  onEdit,
  onDelete,
  onPublish,
  onApprove,
  onReject,
  onEnroll,
}) => {
  const getStatusBadge = (status: string, approvalStatus: string) => {
    const statusStyles = {
      DRAFT: "bg-gray-100 text-gray-800",
      PUBLISHED: "bg-green-100 text-green-800",
      ARCHIVED: "bg-red-100 text-red-800",
    };

    const approvalStyles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };

    return (
      <div className="flex gap-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusStyles[status as keyof typeof statusStyles]
          }`}
        >
          {status}
        </span>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            approvalStyles[approvalStatus as keyof typeof approvalStyles]
          }`}
        >
          {approvalStatus}
        </span>
      </div>
    );
  };

  const getLevelBadge = (level: string) => {
    const levelStyles = {
      BEGINNER: "bg-blue-100 text-blue-800",
      INTERMEDIATE: "bg-orange-100 text-orange-800",
      ADVANCED: "bg-purple-100 text-purple-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          levelStyles[level as keyof typeof levelStyles]
        }`}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {course.thumbnail_url && (
        <div className="relative h-48">
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            {getLevelBadge(course.level)}
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">
            {course.title}
          </h3>
          {showActions && getStatusBadge(course.status, course.approval_status)}
        </div>

        <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              👨‍🏫 {course.instructor?.first_name} {course.instructor?.last_name}
            </span>
            <span className="text-sm text-gray-500">
              📚 {course.category?.name}
            </span>
          </div>
          <div className="text-right">
            {course.original_price && course.original_price > course.price && (
              <span className="text-sm text-gray-500 line-through">
                ${course.original_price}
              </span>
            )}
            <span className="text-lg font-bold text-blue-600 ml-2">
              ${course.price}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
          <span>⏱️ {course.duration_hours}h</span>
          <span>👥 {course.total_enrolled} enrolled</span>
          <span>
            ⭐ {course.rating} ({course.rating_count})
          </span>
        </div>

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.map((tag: { id: number; name: string }) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/courses/${course.id}`}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            View Details
          </Link>

          {userRole === "ROLE_STUDENT" &&
            course.status === "PUBLISHED" &&
            course.approval_status === "APPROVED" && (
              <button
                onClick={() => onEnroll?.(course.id)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Enroll
              </button>
            )}

          {(userRole === "ROLE_TEACHER" || userRole === "ROLE_ADMIN") &&
            showActions && (
              <>
                {/* Inline Edit button */}
                <button
                  onClick={() => onEdit?.(course)}
                  className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>

                {/* Quick management links for owner (or admin) */}
                {(userRole === "ROLE_ADMIN" ||
                  currentUserId === course.instructor_id) && (
                  <>
                    <Link
                      href={`/instructor/courses/${course.id}/manage`}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      title="Manage"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/instructor/courses/${course.id}/enrollments`}
                      className="bg-teal-600 text-white px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                      title="Enrollments"
                    >
                      Enrollments
                    </Link>
                  </>
                )}

                {course.status === "DRAFT" && (
                  <button
                    onClick={() => onPublish?.(course.id)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Publish"
                  >
                    📢
                  </button>
                )}

                <button
                  onClick={() => onDelete?.(course.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </>
            )}

          {userRole === "ROLE_ADMIN" && showActions && (
            <>
              {course.approval_status === "PENDING" && (
                <>
                  <button
                    onClick={() => onApprove?.(course.id)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    title="Approve"
                  >
                    ✅
                  </button>
                  <button
                    onClick={() => onReject?.(course.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    title="Reject"
                  >
                    ❌
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
