"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Heading from "../../utils/Heading";
import Header from "../../components/Header";
import { moduleService } from "../../services/api-modules";
import { lessonService } from "../../services/api-lessons";
import { progressService } from "../../services/api-progress";
import { enrollmentService } from "../../services/api-enrollment";
import { courseService } from "../../services/api-course";
import { reviewService } from "../../services/api-review";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  DocumentTextIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { toast } from "react-hot-toast";

interface ModuleDto {
  id: number;
  title: string;
  order_index?: number;
}
interface LessonDto {
  id: number;
  title: string;
  type?: string;
  content?: string;
  video_url?: string;
  order_index?: number;
  is_completed?: boolean;
  duration_minutes?: number;
}
interface LessonProgressDto {
  id: number;
  enrollment_id: number;
  lesson_id: number;
  is_completed?: boolean;
  progress_percent?: number;
}

export default function CoursePlayerPage() {
  const { id } = useParams() as { id: string };
  const courseId = Number(id);
  const router = useRouter();

  const [courseTitle, setCourseTitle] = useState<string>("");
  const [modules, setModules] = useState<ModuleDto[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<number, LessonDto[]>>({});
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonDto | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [lpByLesson, setLpByLesson] = useState<
    Record<number, LessonProgressDto>
  >({});
  const [assignmentsByLesson, setAssignmentsByLesson] = useState<
    Record<number, any[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) return;
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const init = async () => {
    setLoading(true);
    try {
      // 1) Ensure user is enrolled; swallow Forbidden/401 so student doesn't see console error
      let enrollment: any = null;
      try {
        const eRes = await enrollmentService.checkEnrollmentStatus(courseId);
        if (!eRes || !eRes.data) {
          console.log("[learn] enrollment check failed (ignored):", eRes);
        }
        enrollment = (eRes as any)?.data ?? eRes;
      } catch (err) {
        // don't treat as fatal; user can still access player in some flows
        console.debug("[learn] enrollment check failed (ignored):", err);
        enrollment = null;
      }
      if (enrollment && enrollment.id) setEnrollmentId(enrollment.id);
      else setEnrollmentId(null);

      // 1b) Load course title for breadcrumb/header
      try {
        const cRes = await courseService.getCourse(courseId);
        const c = (cRes as any).data || cRes;
        if (c?.title) setCourseTitle(c.title);
      } catch {}

      // 2) Load course structure
      const mRes = await moduleService.getModules(courseId);
      const ms = (((mRes as any).data || mRes) ?? []) as ModuleDto[];
      ms.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setModules(ms);

      const map: Record<number, LessonDto[]> = {};
      for (const m of ms) {
        const lRes = await lessonService.getLessons(m.id);
        const ls = (((lRes as any).data || lRes) ?? []) as LessonDto[];
        ls.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        map[m.id] = ls;
      }
      setLessonsMap(map);

      // load assignments for lessons
      const asgMap: Record<number, any[]> = {};
      for (const m of ms) {
        const ls = map[m.id] || [];
        for (const l of ls) {
          try {
            const ar = await (
              await fetch(
                `${
                  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000"
                }/assignments/lesson/${l.id}`,
                { credentials: "include" }
              )
            ).json();
            asgMap[l.id] = ar?.data || ar || [];
          } catch {
            asgMap[l.id] = [];
          }
        }
      }
      setAssignmentsByLesson(asgMap);

      // 3) Load existing lesson progress for this enrollment and map to lessons
      if (enrollment && enrollment.id) {
        const lpRes = await progressService.getLessonProgress({
          enrollment_id: enrollment.id,
        });
        const lps = (((lpRes as any).data || lpRes) ??
          []) as LessonProgressDto[];
        const byLesson: Record<number, LessonProgressDto> = {};
        for (const lp of lps) byLesson[lp.lesson_id] = lp;
        setLpByLesson(byLesson);
      } else {
        setLpByLesson({});
      }

      // set defaults
      const firstModule = ms[0];
      setActiveModuleId(firstModule?.id ?? null);
      if (firstModule) {
        setExpanded((prev) => ({ ...prev, [firstModule.id]: true }));
      }
      if (firstModule && map[firstModule.id]?.length) {
        const firstLesson = map[firstModule.id][0];
        setActiveLesson({
          ...firstLesson,
          is_completed: !!lpByLesson[firstLesson.id]?.is_completed,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const courseProgressPercent = useMemo(() => {
    // compute from lessonsMap + lpByLesson
    const allLessons: LessonDto[] = Object.values(lessonsMap).flat();
    if (!allLessons.length) return 0;
    const completed = allLessons.filter(
      (l) => lpByLesson[l.id]?.is_completed
    ).length;
    return Math.round((completed / allLessons.length) * 100);
  }, [lessonsMap, lpByLesson]);

  const setActiveFromIds = (moduleId: number, lessonId: number) => {
    const ls = lessonsMap[moduleId] || [];
    const lesson = ls.find((l) => l.id === lessonId) || null;
    setActiveModuleId(moduleId);
    setExpanded((prev) => ({ ...prev, [moduleId]: true }));
    setActiveLesson(
      lesson
        ? { ...lesson, is_completed: !!lpByLesson[lesson.id]?.is_completed }
        : null
    );
  };

  const gotoNextLesson = () => {
    if (!activeModuleId || !activeLesson) return;
    const ls = lessonsMap[activeModuleId] || [];
    const idx = ls.findIndex((l) => l.id === activeLesson.id);
    if (idx >= 0 && idx + 1 < ls.length) {
      setActiveLesson({
        ...ls[idx + 1],
        is_completed: !!lpByLesson[ls[idx + 1].id]?.is_completed,
      });
      return;
    }
    // if no next in module, jump to first of next module
    const mIdx = modules.findIndex((m) => m.id === activeModuleId);
    if (mIdx >= 0 && mIdx + 1 < modules.length) {
      const nextM = modules[mIdx + 1];
      const nextLs = lessonsMap[nextM.id] || [];
      setActiveModuleId(nextM.id);
      setActiveLesson(
        nextLs[0]
          ? {
              ...nextLs[0],
              is_completed: !!lpByLesson[nextLs[0].id]?.is_completed,
            }
          : null
      );
    }
  };

  const markComplete = async () => {
    if (!activeLesson || !enrollmentId) return;
    try {
      setSaving(true);
      const existing = lpByLesson[activeLesson.id];
      if (existing?.id) {
        await progressService.updateLessonProgress(existing.id, {
          is_completed: true,
          progress_percent: 100,
        });
      } else {
        const res = await progressService.createLessonProgress({
          enrollment_id: enrollmentId,
          lesson_id: activeLesson.id,
          is_completed: true,
          progress_percent: 100,
        });
        const created = (res as any).data ?? res;
        // update map with created id
        if (created?.id) {
          setLpByLesson((prev) => ({ ...prev, [activeLesson.id]: created }));
        }
      }
      // update UI flags
      setLpByLesson((prev) => ({
        ...prev,
        [activeLesson.id]: {
          ...(prev[activeLesson.id] || {
            id: prev[activeLesson.id]?.id ?? 0,
            enrollment_id: enrollmentId,
            lesson_id: activeLesson.id,
          }),
          is_completed: true,
          progress_percent: 100,
        },
      }));
      setActiveLesson({ ...activeLesson, is_completed: true });
    } finally {
      setSaving(false);
    }
  };

  const openReview = () => {
    setReviewRating(5);
    setReviewText("");
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!courseId) return;
    try {
      setSaving(true);
      await reviewService.createOrUpdate({
        course_id: courseId,
        rating: reviewRating,
        review_text: reviewText,
      });
      toast.success("Thank you for your review!");
      setShowReviewModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  // Derived counts for header (must be before any early returns to keep hook order stable)
  const totalLessons = useMemo(
    () => Object.values(lessonsMap).reduce((acc, ls) => acc + ls.length, 0),
    [lessonsMap]
  );
  const completedLessons = useMemo(
    () =>
      Object.values(lessonsMap)
        .flat()
        .filter((l) => lpByLesson[l.id]?.is_completed).length,
    [lessonsMap, lpByLesson]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Course Player"
          description="Loading..."
          keywords="learn, player"
        />
        <Header />
        <div className="container mx-auto px-4 py-10 text-gray-600">
          Loading course...
        </div>
      </div>
    );
  }

  const toggleModule = (moduleId: number) => {
    setExpanded((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
    setActiveModuleId(moduleId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title={courseTitle ? `${courseTitle} - Player` : "Course Player"}
        description="Learn your course"
        keywords="learn, player"
      />
      <Header />

      <div className="container mx-auto px-4 pt-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-3">
          <span className="hover:text-gray-700">Courses</span>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-medium">
            {courseTitle || "Course"}
          </span>
        </nav>
      </div>

      <div className="container mx-auto px-4 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content */}
        <main className="lg:col-span-8 bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Media area */}
          <div className="bg-black aspect-video w-full">
            {activeLesson?.video_url ? (
              <SignedVideo
                lessonId={activeLesson.id}
                fallbackUrl={activeLesson.video_url}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                <VideoCameraIcon className="h-10 w-10 opacity-70" />
              </div>
            )}
          </div>

          {/* Lesson header + actions */}
          <div className="p-5 border-t border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeLesson?.title || "Select a lesson to start"}
                </h1>
                {activeLesson?.duration_minutes != null && (
                  <p className="text-sm text-gray-500 mt-1">
                    Duration:{" "}
                    {Math.floor((activeLesson.duration_minutes ?? 0) / 60)}:
                    {((activeLesson.duration_minutes ?? 0) % 60)
                      .toString()
                      .padStart(2, "0")}
                  </p>
                )}
              </div>

              {activeLesson && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={markComplete}
                    disabled={
                      saving || !!lpByLesson[activeLesson.id]?.is_completed
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      lpByLesson[activeLesson.id]?.is_completed
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {lpByLesson[activeLesson.id]?.is_completed
                      ? "Completed"
                      : saving
                      ? "Saving..."
                      : "Mark Complete"}
                  </button>
                  <button
                    onClick={gotoNextLesson}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Next Lesson
                  </button>
                </div>
              )}
            </div>

            {/* Text content if no video */}
            {!activeLesson?.video_url && (
              <div className="prose max-w-none mt-4 whitespace-pre-wrap text-gray-800">
                {activeLesson?.content || "No content."}
              </div>
            )}

            {/* Completion banner: show when course progress is 100% */}
            {courseProgressPercent === 100 && (
              <div className="mt-4 p-4 border rounded-lg bg-green-50 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-green-800">
                    Course completed
                  </div>
                  <div className="text-sm text-green-700">
                    Congratulations — you finished this course. Would you like
                    to leave a review?
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={openReview}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Leave a review
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky top-20 h-fit">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Danh sách bài học
                </h3>
                <p className="text-xs text-gray-500">
                  {completedLessons}/{totalLessons} Bài học
                </p>
              </div>
              <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {courseProgressPercent}%
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {modules.map((m) => {
                const ls = lessonsMap[m.id] || [];
                const modCompleted = ls.every(
                  (l) => lpByLesson[l.id]?.is_completed
                );
                const isOpen = expanded[m.id] ?? false;
                return (
                  <div key={m.id}>
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      onClick={() => toggleModule(m.id)}
                    >
                      <div className="flex items-center gap-2">
                        {modCompleted ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ChevronRightIcon
                            className={`h-5 w-5 text-gray-400 transition-transform ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        )}
                        <span className="font-medium text-gray-900">
                          {m.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {ls.length} lessons
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-2">
                        {ls.map((l) => {
                          const completed = !!lpByLesson[l.id]?.is_completed;
                          const isActive = activeLesson?.id === l.id;
                          return (
                            <div key={l.id}>
                              <button
                                onClick={() => setActiveFromIds(m.id, l.id)}
                                className={`w-full px-4 py-2 flex items-center justify-between text-left hover:bg-gray-50 ${
                                  isActive ? "bg-blue-50" : ""
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {completed ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <PlayIcon className="h-4 w-4 text-blue-500" />
                                  )}
                                  <span
                                    className={`text-sm ${
                                      completed
                                        ? "text-gray-700"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {l.title}
                                  </span>
                                </div>
                                {l.duration_minutes != null && (
                                  <span className="text-xs text-gray-500">
                                    {Math.floor((l.duration_minutes ?? 0) / 60)}
                                    :
                                    {((l.duration_minutes ?? 0) % 60)
                                      .toString()
                                      .padStart(2, "0")}
                                  </span>
                                )}
                              </button>

                              {Array.isArray(assignmentsByLesson[l.id]) &&
                                assignmentsByLesson[l.id].length > 0 && (
                                  <div className="px-6 py-2 border-l border-blue-100 bg-gray-50">
                                    <div className="text-xs text-gray-500 mb-1">
                                      Assignments:
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      {assignmentsByLesson[l.id].map(
                                        (a: any) => (
                                          <Link
                                            key={a.id}
                                            href={`/learn/${courseId}/assignments/${a.id}`}
                                            className="text-sm text-blue-600 hover:underline"
                                          >
                                            {a.title}
                                          </Link>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
      {/* Review modal rendered at page root so it overlays */}
      <ReviewModal
        visible={showReviewModal}
        rating={reviewRating}
        setRating={setReviewRating}
        text={reviewText}
        setText={setReviewText}
        courseTitle={courseTitle}
        onClose={() => setShowReviewModal(false)}
        onSubmit={submitReview}
        loading={saving}
      />
    </div>
  );
}

// Fetch a signed URL for protected videos; use fallback for free lessons/public URLs
function SignedVideo({
  lessonId,
  fallbackUrl,
}: {
  lessonId: number;
  fallbackUrl: string;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/lessons/${lessonId}/signed-video`,
          {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUrl(data?.url || null);
        } else {
          // fall back to provided url (may be public for free lessons)
          if (mounted) setUrl(fallbackUrl);
        }
      } catch {
        if (mounted) setUrl(fallbackUrl);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lessonId, fallbackUrl]);
  return <video className="w-full h-full" controls src={url || fallbackUrl} />;
}

// review modal (rendered via portal-like div inside same component file)
function ReviewModal({
  visible,
  rating,
  setRating,
  text,
  setText,
  courseTitle,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  rating: number;
  setRating: (r: number) => void;
  text: string;
  setText: (s: string) => void;
  courseTitle?: string;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [chars, setChars] = React.useState(text.length || 0);
  React.useEffect(() => setChars(text.length || 0), [text]);

  // close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (visible) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  if (!visible) return null;
  const canSubmit = rating >= 1 && rating <= 5;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      aria-describedby="review-modal-desc"
    >
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        <h3 id="review-modal-title" className="text-lg font-semibold mb-1">
          Leave a review{courseTitle ? ` — ${courseTitle}` : ""}
        </h3>
        <p id="review-modal-desc" className="text-sm text-gray-600 mb-3">
          Your honest feedback helps other students. You can update your review
          later.
        </p>

        <fieldset className="mb-3" aria-required="true">
          <legend className="text-sm font-medium mb-2">
            Rating (required)
          </legend>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                aria-pressed={rating === r}
                aria-label={`Rate ${r} star${r > 1 ? "s" : ""}`}
                className={`px-3 py-1 rounded focus:outline-none focus:ring-2 ${
                  rating === r ? "bg-yellow-400 text-white" : "bg-gray-100"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="review-text"
        >
          Review
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChars(e.target.value.length);
          }}
          className="w-full border rounded p-2 mb-2"
          rows={5}
          placeholder="Share what you liked, what could be improved, or tips for other learners. (optional)"
          maxLength={2000}
        />
        <div className="text-xs text-gray-500 mb-3">
          {chars}/2000 characters
        </div>

        <div className="text-xs text-gray-500 mb-3">
          Note: Only students enrolled in this course can submit a review. One
          review per student per course; you can update your review later.
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onSubmit()}
            disabled={loading || !canSubmit}
            className={`px-3 py-2 text-white rounded ${
              loading || !canSubmit
                ? "bg-gray-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? "Saving..."
              : !canSubmit
              ? "Select rating"
              : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}
