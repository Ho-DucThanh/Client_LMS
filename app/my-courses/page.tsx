"use client";
import React, { useEffect, useMemo, useState } from "react";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { enrollmentService } from "../services/api-enrollment";
import Link from "next/link";
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "DROPPED" | "PENDING";

interface EnrollmentItem {
  id: number;
  course_id: number;
  status: EnrollmentStatus;
  progress_percentage?: number;
  course?: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    level?: string;
    instructor?: { first_name?: string; last_name?: string };
  };
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnrollmentStatus>(
    "ALL"
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await enrollmentService.getMyEnrollments();
        setEnrollments(((res as any).data || res) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const completed = enrollments.filter(
      (e) => e.status === "COMPLETED"
    ).length;
    const dropped = enrollments.filter((e) => e.status === "DROPPED").length;
    const avgProgress = total
      ? Math.round(
          enrollments.reduce(
            (sum, e) => sum + (e.progress_percentage || 0),
            0
          ) / total
        )
      : 0;
    return { total, active, completed, dropped, avgProgress };
  }, [enrollments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrollments
      .filter((e) =>
        statusFilter === "ALL" ? true : e.status === statusFilter
      )
      .filter((e) =>
        q ? (e.course?.title || "").toLowerCase().includes(q) : true
      );
  }, [enrollments, query, statusFilter]);

  const statusPill = (status: EnrollmentStatus) => {
    const map: Record<EnrollmentStatus, string> = {
      ACTIVE: "bg-blue-100 text-blue-800",
      COMPLETED: "bg-green-100 text-green-800",
      DROPPED: "bg-gray-200 text-gray-700",
      PENDING: "bg-yellow-100 text-yellow-800",
    };
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${map[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="My Courses"
        description="Your enrolled courses"
        keywords="my courses, learning"
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Hero/Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                My Courses
              </h1>
              <p className="text-gray-600 mt-1">
                Keep learning and track your progress across all enrolled
                courses.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 hover:bg-blue-100"
              >
                <AcademicCapIcon className="h-5 w-5" /> Browse Courses
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-2xl font-semibold text-gray-900">
                {stats.total}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Active</div>
              <div className="text-2xl font-semibold text-blue-700">
                {stats.active}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Completed</div>
              <div className="text-2xl font-semibold text-green-700">
                {stats.completed}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500">Avg. Progress</div>
              <div className="text-2xl font-semibold text-gray-900">
                {stats.avgProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 w-full md:w-auto">
            {(
              ["ALL", "ACTIVE", "COMPLETED", "DROPPED", "PENDING"] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  statusFilter === s
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your courses..."
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                  <div className="h-9 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <AcademicCapIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              No courses yet
            </h2>
            <p className="text-gray-600 mb-6">
              Browse the catalog and start your learning journey.
            </p>
            <Link
              href="/courses"
              className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700"
            >
              Browse Courses
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-100">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <MagnifyingGlassIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No matches found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((enrollment) => {
              const progress = Math.round(enrollment.progress_percentage || 0);
              const title = enrollment.course?.title || "Untitled course";
              const desc = enrollment.course?.description || "";
              const thumb = enrollment.course?.thumbnail_url;
              return (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col"
                >
                  {/* Thumbnail */}
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={title}
                      className="w-full aspect-[16/9] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[16/9] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                      <AcademicCapIcon className="h-10 w-10 text-blue-400" />
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {title}
                      </h3>
                      {statusPill(enrollment.status)}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {desc}
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${
                            progress === 100 ? "bg-green-600" : "bg-blue-600"
                          } h-2 rounded-full`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-2">
                      {enrollment.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm">
                          <CheckCircleIcon className="h-4 w-4" /> Completed
                        </span>
                      ) : enrollment.status === "DROPPED" ? (
                        <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 border border-gray-200 px-3 py-2 rounded-lg text-sm">
                          <XCircleIcon className="h-4 w-4" /> Dropped
                        </span>
                      ) : (
                        <Link
                          href={`/learn/${enrollment.course_id}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                        >
                          <ClockIcon className="h-4 w-4" /> Continue Learning
                        </Link>
                      )}
                      {enrollment.status === "ACTIVE" && (
                        <button
                          className="shrink-0 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                          onClick={async () => {
                            if (!confirm("Drop this course?")) return;
                            try {
                              await enrollmentService.dropCourse(
                                enrollment.course_id
                              );
                              const res =
                                await enrollmentService.getMyEnrollments();
                              setEnrollments(((res as any).data || res) ?? []);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        >
                          Drop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
