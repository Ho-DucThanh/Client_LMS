"use client";

import React, { useState, useEffect, useContext } from "react";
import { Course, Category, Tag } from "../../types";
import { CourseCard } from "./CourseCard";
import { courseService, CourseFilters } from "../../services/api-course";
import { enrollmentService } from "../../services/api-enrollment";
import { AuthContext } from "../../contexts/AuthContext";

interface CourseListProps {
  showFilters?: boolean;
  showActions?: boolean;
  title?: string;
  onCourseEdit?: (course: Course) => void;
  onCourseDelete?: (courseId: number) => void;
  apiEndpoint?: "published" | "all" | "my-courses";
}

export const CourseList: React.FC<CourseListProps> = ({
  showFilters = true,
  showActions = false,
  title = "Courses",
  onCourseEdit,
  onCourseDelete,
  apiEndpoint = "published",
}) => {
  const authContext = useContext(AuthContext);
  const userRole = authContext?.user?.role;
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<CourseFilters>({
    search: "",
    category_id: undefined,
    level: undefined,
    status: undefined,
    approval_status: undefined,
    page: 1,
    limit: 12,
  });

  useEffect(() => {
    loadCategoriesAndTags();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [filters, apiEndpoint]);

  const loadCategoriesAndTags = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        courseService.getCategories(),
        courseService.getTags(),
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }

      if (tagsRes.success) {
        setTags(tagsRes.data);
      }
    } catch (error) {
      console.error("Error loading categories and tags:", error);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      let response;

      switch (apiEndpoint) {
        case "published":
          response = await courseService.getPublishedCourses();
          break;
        case "my-courses":
          response = await courseService.getMyCourses();
          break;
        case "all":
        default:
          response = await courseService.getCourses(filters);
          break;
      }

      if (response.success) {
        if (apiEndpoint === "all" && response.data.courses) {
          setCourses(response.data.courses);
          setTotalCourses(response.data.total);
          setCurrentPage(response.data.page);
          setTotalPages(Math.ceil(response.data.total / response.data.limit));
        } else {
          setCourses(response.data);
          setTotalCourses(response.data.length);
        }
      }
    } catch (error) {
      console.error("Error loading courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleEnroll = async (courseId: number) => {
    try {
      const response = await enrollmentService.enrollInCourse(courseId);
      if (response.success) {
        alert("Successfully enrolled in course!");
        // Optionally refresh the course list to update enrollment count
        loadCourses();
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Failed to enroll in course. Please try again.");
    }
  };

  const handlePublish = async (courseId: number) => {
    try {
      const response = await courseService.publishCourse(courseId);
      if (response.success) {
        alert("Course published successfully!");
        loadCourses();
      }
    } catch (error) {
      console.error("Error publishing course:", error);
      alert("Failed to publish course. Please try again.");
    }
  };

  const handleApprove = async (courseId: number) => {
    try {
      const response = await courseService.approveCourse(courseId);
      if (response.success) {
        alert("Course approved successfully!");
        loadCourses();
      }
    } catch (error) {
      console.error("Error approving course:", error);
      alert("Failed to approve course. Please try again.");
    }
  };

  const handleReject = async (courseId: number) => {
    try {
      const response = await courseService.rejectCourse(courseId);
      if (response.success) {
        alert("Course rejected successfully!");
        loadCourses();
      }
    } catch (error) {
      console.error("Error rejecting course:", error);
      alert("Failed to reject course. Please try again.");
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category_id: undefined,
      level: undefined,
      status: undefined,
      approval_status: undefined,
      page: 1,
      limit: 12,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {(userRole === "ROLE_TEACHER" || userRole === "ROLE_ADMIN") &&
            showActions && (
              <button
                onClick={() => onCourseEdit && onCourseEdit({} as any)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Course
              </button>
            )}
          <div className="text-sm text-gray-600">
            {totalCourses} course{totalCourses !== 1 ? "s" : ""} found
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Search courses..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category_id || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "category_id",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={filters.level || ""}
                onChange={(e) => handleFilterChange("level", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            {/* Status (if showing all courses) */}
            {apiEndpoint === "all" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            )}

            {/* Approval Status (if admin) */}
            {authContext?.user?.role === "ROLE_ADMIN" &&
              apiEndpoint === "all" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approval
                  </label>
                  <select
                    value={filters.approval_status || ""}
                    onChange={(e) =>
                      handleFilterChange("approval_status", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              showActions={showActions}
              userRole={authContext?.user?.role}
              currentUserId={authContext?.user?.id}
              onEdit={onCourseEdit}
              onDelete={onCourseDelete}
              onPublish={handlePublish}
              onApprove={handleApprove}
              onReject={handleReject}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {apiEndpoint === "all" && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <nav className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    currentPage === page
                      ? "text-blue-600 bg-blue-50 border border-blue-300"
                      : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};
