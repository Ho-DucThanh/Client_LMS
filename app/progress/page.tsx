"use client";
import React, { useEffect, useMemo, useState } from "react";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { enrollmentService } from "../services/api-enrollment";
import { progressService } from "../services/api-progress";
import { reviewService } from "../services/api-review";
import {
  AcademicCapIcon,
  ChartBarIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "DROPPED" | "PENDING";

interface EnrollmentItem {
  id: number;
  course_id: number;
  status: EnrollmentStatus;
  progress_percentage?: number;
  enrolled_at?: string;
  completed_at?: string;
  course?: {
    title?: string;
    description?: string;
    thumbnail_url?: string;
  };
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | EnrollmentStatus>(
    "ALL"
  );
  // Details / progress panel state
  const [showDetailsFor, setShowDetailsFor] = useState<number | null>(null);
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showReviewFor, setShowReviewFor] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await enrollmentService.getMyEnrollments();
        const list = ((res as any).data || res || []) as EnrollmentItem[];
        setEnrollments(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDetails = async (enrollmentId: number) => {
    setShowDetailsFor(enrollmentId);
    setLoadingDetails(true);
    try {
      const mpRes = await progressService.getProgress({
        enrollment_id: enrollmentId,
      });
      const lpRes = await progressService.getLessonProgress({
        enrollment_id: enrollmentId,
      });
      setModuleProgress(((mpRes as any).data || mpRes) ?? []);
      setLessonProgress(((lpRes as any).data || lpRes) ?? []);
    } catch (err) {
      console.error(err);
      setModuleProgress([]);
      setLessonProgress([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setShowDetailsFor(null);
    setModuleProgress([]);
    setLessonProgress([]);
  };

  const markLessonComplete = async (lessonId: number) => {
    if (!showDetailsFor) return;
    try {
      const existing = lessonProgress.find((lp) => lp.lesson_id === lessonId);
      if (existing && existing.id) {
        await progressService.updateLessonProgress(existing.id, {
          progress_percent: 100,
          is_completed: true,
        });
      } else {
        await progressService.createLessonProgress({
          enrollment_id: showDetailsFor,
          lesson_id: lessonId,
          progress_percent: 100,
          is_completed: true,
        });
      }
      // refresh lesson progress and enrollment summary
      const lpRes = await progressService.getLessonProgress({
        enrollment_id: showDetailsFor,
      });
      setLessonProgress(((lpRes as any).data || lpRes) ?? []);

      const enrRes = await enrollmentService.getEnrollmentProgress(
        showDetailsFor
      );
      const updated = (enrRes as any).data || enrRes;
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === showDetailsFor
            ? {
                ...e,
                progress_percentage: updated.progress_percentage,
                status: updated.status,
              }
            : e
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update lesson progress");
    }
  };

  const openReviewForm = (enrollmentId: number) => {
    setShowReviewFor(enrollmentId);
    setReviewRating(5);
    setReviewText("");
  };

  const submitReview = async (enrollmentId: number, courseId: number) => {
    try {
      await reviewService.createOrUpdate({
        course_id: courseId,
        rating: reviewRating,
        review_text: reviewText,
      });
      alert("Review saved. Thank you!");
      setShowReviewFor(null);
      // optional: you may want to refresh course reviews or enrollment list
    } catch (err) {
      console.error(err);
      alert("Failed to save review");
    }
  };

  const stats = useMemo(() => {
    const total = enrollments.filter((e) => e.status !== "DROPPED").length;
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const completed = enrollments.filter(
      (e) => e.status === "COMPLETED"
    ).length;
    const avg = total
      ? Math.round(
          enrollments
            .filter((e) => e.status !== "DROPPED")
            .reduce((s, e) => s + (e.progress_percentage || 0), 0) / total
        )
      : 0;
    return { total, active, completed, avg };
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Progress"
        description="Track your learning progress across courses"
        keywords="progress, learning"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                My Progress
              </h1>
              <p className="text-gray-600 mt-1">
                See how you’re progressing across all enrolled courses.
              </p>
            </div>
            <Link
              href="/my-courses"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 hover:bg-blue-100"
            >
              <AcademicCapIcon className="h-5 w-5" /> My Courses
            </Link>
          </div>

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
                {stats.avg}%
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
              placeholder="Search courses..."
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
              Enroll in a course to start tracking your progress.
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
            {filtered.map((e) => {
              const progress = Math.round(e.progress_percentage || 0);
              const title = e.course?.title || "Untitled course";
              const desc = e.course?.description || "";
              const thumb = e.course?.thumbnail_url;
              return (
                <div
                  key={e.id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col"
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={title}
                      className="w-full aspect-[16/9] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[16/9] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                      <ChartBarIcon className="h-10 w-10 text-purple-400" />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {desc}
                    </p>

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

                    <div className="mt-auto flex items-center gap-2">
                      {e.status === "COMPLETED" ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg text-sm">
                            <CheckCircleIcon className="h-4 w-4" /> Completed
                          </span>
                          <button
                            onClick={() => openReviewForm(e.id)}
                            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
                          >
                            Leave Review
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/learn/${e.course_id}`}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                        >
                          Continue Learning
                        </Link>
                      )}
                      <button
                        onClick={() => openDetails(e.id)}
                        className="shrink-0 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Details
                      </button>
                      <Link
                        href={`/courses/${e.course_id}`}
                        className="shrink-0 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Course
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Inline review form */}
        {showReviewFor && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 w-full max-w-lg bg-white border rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Leave a review</h3>
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setReviewRating(r)}
                  className={`px-3 py-1 rounded ${
                    reviewRating === r
                      ? "bg-yellow-400 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full border rounded p-2 mb-2"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReviewFor(null)}
                className="px-3 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const enr = enrollments.find((x) => x.id === showReviewFor);
                  if (enr) submitReview(showReviewFor as number, enr.course_id);
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Submit Review
              </button>
            </div>
          </div>
        )}

        {/* Details panel */}
        {showDetailsFor && (
          <div className="fixed right-6 top-24 w-[420px] max-h-[70vh] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Progress Details</h3>
              <button onClick={closeDetails} className="text-gray-500">
                Close
              </button>
            </div>
            {loadingDetails ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Modules</h4>
                  {moduleProgress.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No module progress
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {moduleProgress.map((m: any) => (
                        <li key={m.id} className="border p-2 rounded">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                {m.title || "Module"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.round(m.completion_percentage || 0)}%
                                complete
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Lessons</h4>
                  {lessonProgress.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No lesson records
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {lessonProgress.map((lp: any) => (
                        <li
                          key={lp.id || lp.lesson_id}
                          className="flex items-center justify-between border p-2 rounded"
                        >
                          <div>
                            <div className="font-medium">
                              {lp.lesson_title || `Lesson ${lp.lesson_id}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round(lp.progress_percent || 0)}%
                            </div>
                          </div>
                          <div>
                            {Math.round(lp.progress_percent || 0) < 100 ? (
                              <button
                                onClick={() => markLessonComplete(lp.lesson_id)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                              >
                                Mark Complete
                              </button>
                            ) : (
                              <span className="text-xs text-green-600">
                                Completed
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
