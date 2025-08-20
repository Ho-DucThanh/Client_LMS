"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PlayIcon,
  BookOpenIcon,
  ClockIcon,
  StarIcon,
  UsersIcon,
  CheckCircleIcon,
  LockClosedIcon,
  DocumentTextIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import Heading from "../../utils/Heading";
import Header from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import { courseService } from "../../services/api-course";
import { enrollmentService } from "../../services/api-enrollment";
import { moduleService } from "../../services/api-modules";
import { lessonService } from "../../services/api-lessons";
import { reviewService } from "../../services/api-review";

interface CourseDto {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  price?: number;
  duration_hours?: number;
  level: string;
  category?: { id: number; name: string };
  instructor?: { id: number; first_name: string; last_name: string };
}

interface ModuleDto {
  id: number;
  title: string;
  description?: string;
  order_index?: number;
}

interface Lesson {
  id: number;
  title: string;
  description?: string;
  video_url?: string;
  duration_minutes?: number;
  order_index?: number;
  is_completed?: boolean;
  is_free?: boolean;
}

type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "DROPPED" | "PENDING";
interface EnrollmentCheck {
  enrolled: boolean;
  status?: EnrollmentStatus;
}

const CourseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<number, Lesson[]>>({});
  const [enrollment, setEnrollment] = useState<EnrollmentCheck | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showNotPublishedModal, setShowNotPublishedModal] = useState(false);
  const [stats, setStats] = useState<{
    students: number;
    rating: number;
    ratings: number;
  }>({ students: 0, rating: 0, ratings: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  // only show reviews authored by current user

  useEffect(() => {
    if (params.id) {
      loadCourseData();
    }
  }, [params.id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const cRes = await courseService.getCourse(Number(params.id));
      const c = (cRes as any).data || cRes;
      setCourse(c);

      // fetch modules and lessons
      const mRes = await moduleService.getModules(Number(params.id));
      const mData = ((mRes as any).data || mRes || []) as ModuleDto[];
      mData.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setModules(mData);
      const lmap: Record<number, Lesson[]> = {};
      for (const mod of mData) {
        try {
          const lRes = await lessonService.getLessons(mod.id);
          const lData = ((lRes as any).data || lRes || []) as Lesson[];
          lData.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
          lmap[mod.id] = lData;
        } catch {
          lmap[mod.id] = [];
        }
      }
      setLessonsMap(lmap);

      // stats
      try {
        const sRes = await courseService.getCourseStats(Number(params.id));
        const raw = (sRes as any).data ?? sRes ?? {};
        const sd = typeof raw === "object" && raw ? (raw as any) : ({} as any);
        setStats({
          students: sd.total_students ?? sd.students ?? 0,
          rating: sd.average_rating ?? sd.rating ?? 0,
          ratings: sd.rating_count ?? sd.ratings ?? 0,
        });
      } catch (e) {
        // fallback from course object if available
        setStats({
          students: (c as any)?.total_enrolled ?? 0,
          rating: (c as any)?.rating ?? 0,
          ratings: (c as any)?.rating_count ?? 0,
        });
      }

      // enrollment check
      try {
        const chk = await enrollmentService.checkEnrollmentStatus(
          Number(params.id)
        );
        const cd = (chk as any).data || chk;
        setEnrollment({
          enrolled: !!cd?.id || !!cd?.enrolled,
          status: cd?.status,
        });
      } catch {}

      // load all reviews for this course
      try {
        const rv = await reviewService.getForCourse(Number(params.id));
        const ls = ((rv as any).data || rv || []) as any[];
        setReviews(ls);
      } catch (e) {
        setReviews([]);
      }

      // pick first accessible lesson
      const fm = mData[0];
      if (fm && lmap[fm.id]?.length) {
        if (enrollment?.enrolled) {
          setActiveLesson(lmap[fm.id][0]);
        } else {
          const firstFree = lmap[fm.id].find((l) => l.is_free);
          setActiveLesson(firstFree || lmap[fm.id][0]);
        }
      }
    } catch (error) {
      console.error("Error loading course data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Prevent enrolling into unpublished courses from the client-side
    if ((course as any)?.status !== "PUBLISHED") {
      setShowEnrollModal(false);
      setShowNotPublishedModal(true);
      return;
    }

    try {
      setEnrolling(true);
      await enrollmentService.enrollInCourse(Number(params.id));
      setShowEnrollModal(false);
      loadCourseData(); // Refresh data
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      const msg = error?.message || String(error);
      // Show backend error if it's about publish/approval
      if (
        msg.toLowerCase().includes("publish") ||
        msg.toLowerCase().includes("approve")
      ) {
        alert(msg);
      } else {
        alert("Failed to enroll: " + msg);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (_lessonId: number) => {
    // Wire to lesson-progress APIs in the learn page; kept as placeholder here
    console.log("Mark complete", _lessonId);
  };

  const canAccessLesson = (lesson: Lesson) => {
    return lesson.is_free || !!(enrollment && enrollment.enrolled);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading title="Loading Course..." description="" keywords="" />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading course...</div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading title="Course Not Found" description="" keywords="" />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Course not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title={`${course.title} - EduPlatform`}
        description={course.description}
        keywords={`course, ${course.category?.name ?? ""}, ${
          course.level
        }, online learning`}
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 mb-4">{course.description}</p>

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <AcademicCapIcon className="h-5 w-5 mr-1" />
                      <span>
                        {course.instructor?.first_name}{" "}
                        {course.instructor?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 mr-1" />
                      <span>{course.duration_hours ?? 0} hours</span>
                    </div>
                    <div className="flex items-center">
                      <StarIcon className="h-5 w-5 mr-1" />
                      <span>
                        {Number(stats.rating).toFixed(1)} ({stats.ratings})
                      </span>
                    </div>
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 mr-1" />
                      <span>{stats.students} students</span>
                    </div>
                  </div>
                </div>

                {!enrollment?.enrolled && (
                  <div className="ml-6">
                    <div className="text-right mb-4">
                      <div className="text-3xl font-bold text-blue-600">
                        ${course.price ?? 0}
                      </div>
                      <div className="text-sm text-gray-500">
                        One-time payment
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if ((course as any)?.status !== "PUBLISHED") {
                          setShowNotPublishedModal(true);
                          return;
                        }
                        setShowEnrollModal(true);
                      }}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Enroll Now
                    </button>
                  </div>
                )}

                {enrollment?.enrolled && (
                  <div className="ml-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center text-green-800 mb-2">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        <span className="font-semibold">Enrolled</span>
                      </div>
                      <div className="text-sm text-green-700">
                        Status: {enrollment.status}
                      </div>
                    </div>
                    <a
                      href={`/learn/${String(params.id)}`}
                      className="w-full inline-block text-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Start Learning
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Video Player */}
            {activeLesson && (
              <div className="bg-white rounded-lg shadow-sm mb-8">
                <div className="aspect-video bg-gray-900 rounded-t-lg relative">
                  {canAccessLesson(activeLesson) ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-white">
                        <PlayIcon className="h-16 w-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {activeLesson.title}
                        </h3>
                        <p className="text-gray-300">
                          {activeLesson.description}
                        </p>
                        <div className="mt-4">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                            {Math.floor(
                              (activeLesson.duration_minutes ?? 0) / 60
                            )}
                            :
                            {((activeLesson.duration_minutes ?? 0) % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-white">
                        <LockClosedIcon className="h-16 w-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          Lesson Locked
                        </h3>
                        <p className="text-gray-300">
                          Enroll in this course to access this lesson
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {activeLesson.title}
                      </h3>
                      <p className="text-gray-600">
                        {activeLesson.description}
                      </p>
                    </div>

                    {enrollment && canAccessLesson(activeLesson) && (
                      <button
                        onClick={() => handleLessonComplete(activeLesson.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          activeLesson.is_completed
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {activeLesson.is_completed
                          ? "Completed"
                          : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Course Content */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Course Content
              </h3>

              <div className="space-y-4">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className="border border-gray-200 rounded-lg"
                  >
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">
                        {module.title}
                      </h4>
                      {module.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {module.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {(lessonsMap[module.id] || []).length} lessons
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {(lessonsMap[module.id] || []).map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            activeLesson?.id === lesson.id
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : ""
                          }`}
                          disabled={!canAccessLesson(lesson)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {canAccessLesson(lesson) ? (
                                <PlayIcon className="h-4 w-4 text-blue-500" />
                              ) : (
                                <LockClosedIcon className="h-4 w-4 text-gray-400" />
                              )}

                              <div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`font-medium ${
                                      canAccessLesson(lesson)
                                        ? "text-gray-900"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {lesson.title}
                                  </span>
                                  {lesson.is_free && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                      Free
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {Math.floor(
                                    (lesson.duration_minutes ?? 0) / 60
                                  )}
                                  :
                                  {((lesson.duration_minutes ?? 0) % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </div>
                              </div>
                            </div>

                            {enrollment?.enrolled && lesson.is_completed && (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Resources */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resources
              </h3>
              <div className="space-y-3">
                <a
                  href="#"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Course Syllabus
                </a>
                <a
                  href="#"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Course Materials
                </a>
                <a
                  href="#"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Additional Readings
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Reviews</h3>
          <div className="mb-4 text-sm text-gray-600">
            Average: {Number(stats.rating).toFixed(1)} ({stats.ratings} ratings)
          </div>

          {enrollment?.enrolled ? (
            <div className="mb-4 text-sm text-gray-600">
              Reviews shown below are only those you have written for this
              course.
            </div>
          ) : (
            <div className="text-sm text-gray-500 mb-4">
              Enroll to leave a review.
            </div>
          )}

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-sm text-gray-500">No reviews yet.</div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="border rounded p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {r.student?.first_name} {r.student?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="flex items-center justify-end text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`h-5 w-5 ${
                              i < (r.rating || 0)
                                ? "text-yellow-400"
                                : "text-gray-200"
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.97c.3.921-.755 1.688-1.54 1.118l-3.386-2.46a1 1 0 00-1.175 0l-3.386 2.46c-.784.57-1.84-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.045 9.397c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                          </svg>
                        ))}
                      </div>
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                        {r.review_text || ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Enroll in Course
            </h3>
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                {course.title}
              </h4>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>
                  Instructor: {course.instructor?.first_name}{" "}
                  {course.instructor?.last_name}
                </span>
                <span>{course.duration_hours ?? 0} hours</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-4">
                ${course.price}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {enrolling ? "Enrolling..." : "Enroll Now"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Not Published Modal */}
      {showNotPublishedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Course Not Published
            </h3>
            <p className="text-gray-600 mb-4">
              This course hasn't been published yet and is not available for
              enrollment.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNotPublishedModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;
