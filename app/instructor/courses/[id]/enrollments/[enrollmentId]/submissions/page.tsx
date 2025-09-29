"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Heading from "../../../../../../utils/Heading";
import Header from "../../../../../../components/Header";
import { assignmentService } from "../../../../../../services/api-assignment";
import { enrollmentService } from "../../../../../../services/api-enrollment";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Layers,
  User2,
  FileText,
} from "lucide-react";

export default function StudentSubmissionsPage() {
  const params = useParams() as { id: string; enrollmentId: string };
  const search = useSearchParams();
  const courseId = Number(params.id);
  const enrollmentId = Number(params.enrollmentId);
  const studentId = Number(search.get("student"));

  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [filter, setFilter] = useState<
    "ALL" | "SUBMITTED" | "NOT_SUBMITTED" | "UN_GRADED"
  >("ALL");
  const [enrollment, setEnrollment] = useState<any | null>(null);

  useEffect(() => {
    if (!courseId || !studentId) return;
    (async () => {
      setLoading(true);
      try {
        const [aRes, sRes, enr] = await Promise.all([
          assignmentService.getAssignments(courseId, {
            page,
            limit,
            sortBy: "created_at",
            order: "DESC",
          }),
          assignmentService.getSubmissionsByStudent(studentId),
          enrollmentId
            ? enrollmentService
                .getEnrollmentProgress(enrollmentId)
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        const resp = (aRes as any) || {};
        const assignmentsList = Array.isArray(resp) ? resp : resp.data || [];
        setAssignments(Array.isArray(assignmentsList) ? assignmentsList : []);
        setTotal(resp.total || 0);
        setTotalPages(resp.totalPages || 1);

        const submissions = (sRes as any).data || sRes || [];
        const map: Record<number, any> = {};
        (Array.isArray(submissions) ? submissions : []).forEach((sub: any) => {
          map[sub.assignment_id] = sub;
        });
        setSubmissionsMap(map);

        const enrObj = (enr as any)?.data || enr || null;
        setEnrollment(enrObj);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, studentId, page, limit, enrollmentId]);

  // group assignments by module -> lesson for ordered display
  const grouped = React.useMemo(() => {
    if (!assignments || assignments.length === 0)
      return { course: null, modules: [] };
    // course info from first assignment if available
    const first = assignments.find(
      (a) => a.lesson && a.lesson.module && a.lesson.module.course
    );
    const course = first?.lesson?.module?.course ?? null;

    const modulesMap: Record<number, any> = {};
    for (const a of assignments) {
      const lesson = a.lesson ?? { id: null, title: "Lesson" };
      const module = lesson.module ?? { id: 0, title: "Module" };
      if (!modulesMap[module.id]) {
        modulesMap[module.id] = { module, lessons: {} };
      }
      const modEntry = modulesMap[module.id];
      if (!modEntry.lessons[lesson.id]) {
        modEntry.lessons[lesson.id] = { lesson, assignments: [] };
      }
      modEntry.lessons[lesson.id].assignments.push(a);
    }

    // convert to arrays with simple sorting by id
    const modules = Object.values(modulesMap)
      .map((m: any) => ({
        module: m.module,
        lessons: Object.values(m.lessons).sort(
          (x: any, y: any) => (x.lesson.id || 0) - (y.lesson.id || 0)
        ),
      }))
      .sort((a: any, b: any) => (a.module.id || 0) - (b.module.id || 0));

    return { course, modules };
  }, [assignments]);

  const statusFor = (assignment: any) => {
    const sub = submissionsMap[assignment.id];
    if (!sub)
      return {
        key: "NOT_SUBMITTED",
        label: "Not submitted",
        color: "text-gray-600",
        bg: "bg-gray-100",
        icon: "○",
      };
    if (sub.status === "SUBMITTED")
      return {
        key: "SUBMITTED",
        label: "Submitted",
        color: "text-blue-600",
        bg: "bg-blue-100",
        icon: "⬤",
      };
    if (sub.status === "GRADED")
      return {
        key: "GRADED",
        label: "Graded",
        color: "text-green-600",
        bg: "bg-green-100",
        icon: "✓",
      };
    return {
      key: "UNKNOWN",
      label: sub.status || "Unknown",
      color: "text-yellow-600",
      bg: "bg-yellow-100",
      icon: "!",
    };
  };

  const filterMatches = (assignment: any) => {
    const s = statusFor(assignment).key;
    if (filter === "ALL") return true;
    if (filter === "SUBMITTED") return s === "SUBMITTED" || s === "GRADED";
    if (filter === "NOT_SUBMITTED") return s === "NOT_SUBMITTED";
    if (filter === "UN_GRADED") return s === "SUBMITTED";
    return true;
  };

  const onPrev = () => setPage((p) => Math.max(1, p - 1));
  const onNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const [grading, setGrading] = useState<{ open: boolean; subId?: number }>({
    open: false,
  });
  const [gradeValue, setGradeValue] = useState<number | "">("");
  const [feedback, setFeedback] = useState("");

  const openGrade = (submission: any) => {
    setGrading({ open: true, subId: submission.id });
    setGradeValue(submission.grade ?? "");
    setFeedback(submission.feedback ?? "");
  };

  const submitGrade = async () => {
    if (!grading.subId) return;
    try {
      await assignmentService.gradeSubmission(grading.subId, {
        grade: Number(gradeValue),
        feedback,
      });
      toast.success("Graded successfully");
      // refresh submissions
      const sRes = await assignmentService.getSubmissionsByStudent(studentId);
      const submissions = (sRes as any).data || sRes || [];
      const map: Record<number, any> = {};
      (Array.isArray(submissions) ? submissions : []).forEach((sub: any) => {
        map[sub.assignment_id] = sub;
      });
      setSubmissionsMap(map);
      setGrading({ open: false });
    } catch (err: any) {
      toast.error(err?.message || "Failed to grade");
    }
  };

  const stats = useMemo(() => {
    const totalAssignments = assignments.length;
    let submitted = 0;
    let graded = 0;
    for (const a of assignments) {
      const sub = submissionsMap[a.id];
      if (sub) {
        submitted += 1;
        if (sub.status === "GRADED" || sub.grade != null) graded += 1;
      }
    }
    const notSubmitted = Math.max(0, totalAssignments - submitted);
    const ungraded = Math.max(0, submitted - graded);
    return { totalAssignments, submitted, graded, ungraded, notSubmitted };
  }, [assignments, submissionsMap]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Bài nộp của học viên"
        description="Xem và chấm điểm bài nộp của học viên"
        keywords={"bai nop,hoc vien"}
      />
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-semibold">
                {(enrollment?.student?.first_name?.[0] || "S").toUpperCase()}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  <User2 size={16} className="text-gray-500" />
                  <span>
                    {enrollment?.student?.first_name}{" "}
                    {enrollment?.student?.last_name}
                  </span>
                </div>
                {enrollment?.student?.email && (
                  <div className="text-sm text-gray-500">
                    {enrollment?.student?.email}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 flex items-center justify-end gap-2">
                <BookOpen size={16} className="text-gray-500" />
                <span>Khóa học</span>
              </div>
              <div className="text-lg font-semibold">
                {enrollment?.course?.title || "Bài tập của khóa học"}
              </div>
              <div className="text-xs text-gray-500">
                <Link
                  href={`/instructor/courses/${courseId}/enrollments`}
                  className="text-blue-600 hover:underline"
                >
                  ← Quay lại danh sách ghi danh
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-gray-50 text-gray-700">
                <ClipboardList size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Tổng bài tập</div>
                <div className="font-semibold">{stats.totalAssignments}</div>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Đã nộp</div>
                <div className="font-semibold">{stats.submitted}</div>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-50 text-amber-600">
                <Clock3 size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Chưa chấm</div>
                <div className="font-semibold">{stats.ungraded}</div>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Đã chấm</div>
                <div className="font-semibold">{stats.graded}</div>
              </div>
            </div>
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-red-50 text-red-600">
                <CircleAlert size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Chưa nộp</div>
                <div className="font-semibold">{stats.notSubmitted}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-gray-500" />
            Bài nộp của học viên
          </h3>
          {loading && <div className="text-sm text-gray-500">Đang tải…</div>}
          {!loading && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilter("ALL");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => {
                      setFilter("SUBMITTED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter === "SUBMITTED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Đã nộp
                  </button>
                  <button
                    onClick={() => {
                      setFilter("NOT_SUBMITTED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter === "NOT_SUBMITTED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Chưa nộp
                  </button>
                  <button
                    onClick={() => {
                      setFilter("UN_GRADED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter === "UN_GRADED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Chưa chấm
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">Mỗi trang:</div>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
              {grouped.course && (
                <div className="mb-4 p-3 rounded-md bg-gray-50 border text-sm text-gray-700 flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-500" />
                  <span className="font-medium">{grouped.course.title}</span>
                </div>
              )}

              {grouped.modules.map((m: any) => (
                <div key={m.module.id}>
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <Layers size={16} className="text-gray-500" />
                    <div className="font-medium">{m.module.title}</div>
                  </div>
                  {m.lessons.map((L: any) => (
                    <div key={L.lesson.id} className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen size={14} className="text-gray-400" />
                        <div className="font-semibold text-gray-800">
                          {L.lesson.title}
                        </div>
                      </div>
                      <div className="mt-2 space-y-3">
                        {L.assignments
                          .filter((a: any) => filterMatches(a))
                          .map((a: any) => {
                            const sub = submissionsMap[a.id];
                            return (
                              <div
                                key={a.id}
                                className="border rounded p-4 hover:shadow-sm transition"
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <div className="font-medium flex items-center gap-3">
                                      <div
                                        className={`w-7 h-7 flex items-center justify-center rounded-full ${
                                          statusFor(a).bg
                                        } ${statusFor(a).color}`}
                                      >
                                        {statusFor(a).icon}
                                      </div>
                                      <div>{a.title}</div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-full border bg-white">
                                        {a.type || "Assignment"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full border bg-white flex items-center gap-1">
                                        <Clock3 size={12} />
                                        {a.due_date
                                          ? new Date(
                                              a.due_date
                                            ).toLocaleString()
                                          : "Không hạn"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-right min-w-36">
                                    <div className="mb-1">
                                      {sub ? (
                                        sub.grade != null ? (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                            Điểm: {sub.grade}
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                            Chưa chấm
                                          </span>
                                        )
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                          Chưa nộp
                                        </span>
                                      )}
                                    </div>
                                    {sub && (
                                      <div className="text-xs text-gray-500">
                                        {sub.submitted_at
                                          ? new Date(
                                              sub.submitted_at
                                            ).toLocaleString()
                                          : ""}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3">
                                  {sub ? (
                                    <div className="space-y-2">
                                      {sub.content && (
                                        <div className="text-sm">
                                          {sub.content}
                                        </div>
                                      )}
                                      {sub.file_url && (
                                        <div className="text-sm">
                                          <a
                                            href={sub.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            Tải tệp đính kèm
                                          </a>
                                        </div>
                                      )}
                                      <div className="mt-2">
                                        <button
                                          onClick={() => openGrade(sub)}
                                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                                        >
                                          Chấm điểm
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      Học viên chưa nộp bài tập này.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">Tổng: {total}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onPrev}
                    disabled={page <= 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  >
                    Trước
                  </button>
                  <div className="px-3">
                    Trang {page} / {totalPages}
                  </div>
                  <button
                    onClick={onNext}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {grading.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white p-4 rounded w-96">
            <h4 className="font-semibold mb-2">Chấm điểm bài nộp</h4>
            <div className="mb-2">
              <label className="block text-xs text-gray-600">Điểm</label>
              <input
                type="number"
                value={gradeValue as any}
                onChange={(e) =>
                  setGradeValue(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full border px-2 py-1 rounded"
              />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-gray-600">Nhận xét</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full border px-2 py-1 rounded"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setGrading({ open: false })}
                className="px-3 py-1 rounded border"
              >
                Hủy
              </button>
              <button
                onClick={submitGrade}
                className="px-3 py-1 rounded bg-green-600 text-white"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
