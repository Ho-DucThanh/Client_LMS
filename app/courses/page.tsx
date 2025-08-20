"use client";
import React, { useEffect, useMemo, useState } from "react";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { courseService } from "../services/api-course";
import Link from "next/link";

const DEFAULT_LIMIT = 10;
const DEFAULT_SORT_BY:
  | "created_at"
  | "rating"
  | "rating_count"
  | "total_enrolled" = "rating_count";
const DEFAULT_SORT_ORDER: "ASC" | "DESC" = "DESC";

const CoursesPage = () => {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [tagId, setTagId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadCourses();
  }, [search, level, categoryId, tagId, page]);

  const loadMeta = async () => {
    try {
      const [cats, tg] = await Promise.all([
        courseService.getCategories(),
        courseService.getTags(),
      ]);
      setCategories((cats as any).data || cats || []);
      setTags((tg as any).data || tg || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseService.getCourses({
        search: search || undefined,
        level,
        category_id: categoryId,
        tag_id: tagId as any,
        // only show published courses on public listing
        status: "PUBLISHED",
        sort_by: DEFAULT_SORT_BY,
        sort_order: DEFAULT_SORT_ORDER,
        page,
        limit: DEFAULT_LIMIT,
      } as any);
      const payload = (res as any).data || res || {};
      const data = payload.courses || payload.data || payload.items || [];
      setCourses(Array.isArray(data) ? data : []);
      if (typeof payload.total === "number") setTotal(payload.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_LIMIT)),
    [total]
  );
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const getPageItems = (current: number, totalPages: number) => {
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let last: number | undefined;
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= current - 1 && i <= current + 1)
      ) {
        range.push(i);
      }
    }
    for (const i of range) {
      if (last !== undefined) {
        if (i - last === 2) rangeWithDots.push(last + 1);
        else if (i - last > 2) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      last = i;
    }
    return rangeWithDots;
  };

  const levelOptions = [
    { value: "", label: "All" },
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
  ];
  const levelLabel = (lv?: string) => {
    if (!lv) return "";
    switch (lv) {
      case "BEGINNER":
        return "Beginner";
      case "INTERMEDIATE":
        return "Intermediate";
      case "ADVANCED":
        return "Advanced";
      default:
        return lv;
    }
  };

  const formatNumber = (n?: number) =>
    typeof n === "number" ? new Intl.NumberFormat().format(n) : "0";

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Browse Courses"
        description="Discover and enroll in courses from our talented instructors"
        keywords="courses, browse, categories, tags, search"
      />
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Explore Courses</h1>
          <p className="mt-2 text-gray-600">
            Find the right course by filtering category, level, and more.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <select
                value={level || ""}
                onChange={(e) => setLevel(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryId || ""}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag
              </label>
              <select
                value={tagId || ""}
                onChange={(e) =>
                  setTagId(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All</option>
                {tags.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            No courses found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course: any) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100 h-full flex flex-col"
              >
                <div className="relative bg-gray-100">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-r from-blue-50 to-indigo-50" />
                  )}
                  {(course.rating_count >= 500 ||
                    course.total_enrolled >= 1000) && (
                    <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded">
                      Popular
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col grow">
                  {Array.isArray(course.tags) && course.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {course.tags.slice(0, 3).map((t: any) => (
                        <span
                          key={t.id}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3.5rem]">
                    {course.title}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-2 mt-1 min-h-[2.5rem]">
                    {course.description}
                  </p>

                  {course.instructor?.first_name && (
                    <p className="text-sm text-gray-500 mt-2">
                      By {course.instructor.first_name}{" "}
                      {course.instructor.last_name}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-yellow-500 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>
                          {i < Math.round(Number(course.rating || 0))
                            ? "★"
                            : "☆"}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">
                      {Number(course.rating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({formatNumber(course.rating_count as number)})
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 min-w-0">
                        <span>⏱</span>
                        <span className="truncate">
                          {course.duration_hours
                            ? `${course.duration_hours} hours`
                            : "--"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <span>👥</span>
                        <span className="truncate">
                          {formatNumber(course.total_enrolled as number)}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs whitespace-nowrap">
                      {levelLabel(course.level) || ""}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        ${Number(course.price ?? 0).toFixed(2)}
                      </span>
                      {Number(course.original_price ?? 0) >
                        Number(course.price ?? 0) && (
                        <span className="text-gray-400 line-through">
                          ${Number(course.original_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              className={`px-4 h-9 rounded-md border text-sm ${
                canPrev
                  ? "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
              disabled={!canPrev}
              onClick={() => canPrev && setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            {getPageItems(page, totalPages).map((item, idx) =>
              typeof item === "number" ? (
                <button
                  key={idx}
                  className={`min-w-9 px-3 h-9 rounded-md border text-sm ${
                    item === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ) : (
                <span key={idx} className="px-2 text-gray-500">
                  {item}
                </span>
              )
            )}
            <button
              className={`px-4 h-9 rounded-md border text-sm ${
                canNext
                  ? "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
              disabled={!canNext}
              onClick={() => canNext && setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
