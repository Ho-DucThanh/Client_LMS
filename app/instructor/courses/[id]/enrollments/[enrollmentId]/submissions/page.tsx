"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Heading from "../../../../../../utils/Heading";
import Header from "../../../../../../components/Header";
import { assignmentService } from "../../../../../../services/api-assignment";
import { enrollmentService } from "../../../../../../services/api-enrollment";
import toast from "react-hot-toast";

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

  useEffect(() => {
    if (!courseId || !studentId) return;
    (async () => {
      setLoading(true);
      try {
        const aRes = await assignmentService.getAssignments(courseId, {
          page,
          limit,
          sortBy: "created_at",
          order: "DESC",
        });
        const resp = (aRes as any) || {};
        const assignmentsList = Array.isArray(resp) ? resp : resp.data || [];
        setAssignments(Array.isArray(assignmentsList) ? assignmentsList : []);
        setTotal(resp.total || 0);
        setTotalPages(resp.totalPages || 1);

        const sRes = await assignmentService.getSubmissionsByStudent(studentId);
        const submissions = (sRes as any).data || sRes || [];
        const map: Record<number, any> = {};
        (Array.isArray(submissions) ? submissions : []).forEach((sub: any) => {
          map[sub.assignment_id] = sub;
        });
        setSubmissionsMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, studentId, page, limit]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title="Student Submissions"
        description="Review and grade student submissions"
        keywords={""}
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Student submissions</h3>
          {loading && <div className="text-sm text-gray-500">Loading…</div>}
          {!loading && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilter("ALL");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded ${
                      filter === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setFilter("SUBMITTED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded ${
                      filter === "SUBMITTED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Submitted
                  </button>
                  <button
                    onClick={() => {
                      setFilter("NOT_SUBMITTED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded ${
                      filter === "NOT_SUBMITTED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Not submitted
                  </button>
                  <button
                    onClick={() => {
                      setFilter("UN_GRADED");
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded ${
                      filter === "UN_GRADED"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border"
                    }`}
                  >
                    Ungraded
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">Per page:</div>
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
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Course</div>
                  <div className="font-semibold">{grouped.course.title}</div>
                </div>
              )}

              {grouped.modules.map((m: any) => (
                <div key={m.module.id}>
                  <div className="text-sm text-gray-600">Module</div>
                  <div className="font-medium mb-2">{m.module.title}</div>
                  {m.lessons.map((L: any) => (
                    <div key={L.lesson.id} className="mb-4">
                      <div className="text-xs text-gray-500">Lesson</div>
                      <div className="font-semibold">{L.lesson.title}</div>
                      <div className="mt-2 space-y-3">
                        {L.assignments
                          .filter((a: any) => filterMatches(a))
                          .map((a: any) => {
                            const sub = submissionsMap[a.id];
                            return (
                              <div key={a.id} className="border rounded p-4">
                                <div className="flex justify-between items-start">
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
                                    <div className="text-xs text-gray-500">
                                      {a.type} • Due:{" "}
                                      {a.due_date
                                        ? new Date(a.due_date).toLocaleString()
                                        : "—"}
                                    </div>
                                  </div>
                                  <div className="text-sm text-right">
                                    <div>
                                      {sub
                                        ? sub.grade != null
                                          ? `${sub.grade}`
                                          : "Not graded"
                                        : "No submission"}
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
                                            className="text-blue-600"
                                          >
                                            Download file
                                          </a>
                                        </div>
                                      )}
                                      <div className="mt-2">
                                        <button
                                          onClick={() => openGrade(sub)}
                                          className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                                        >
                                          Grade
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">
                                      Student has not submitted this assignment.
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
                <div className="text-sm text-gray-600">Total: {total}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onPrev}
                    disabled={page <= 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <div className="px-3">
                    Page {page} / {totalPages}
                  </div>
                  <button
                    onClick={onNext}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
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
            <h4 className="font-semibold mb-2">Grade submission</h4>
            <div className="mb-2">
              <label className="block text-xs text-gray-600">Grade</label>
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
              <label className="block text-xs text-gray-600">Feedback</label>
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
                Cancel
              </button>
              <button
                onClick={submitGrade}
                className="px-3 py-1 rounded bg-green-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
