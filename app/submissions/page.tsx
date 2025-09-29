"use client";
import React, { useEffect, useMemo, useState } from "react";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { RoleGuard } from "../components/RoleGuard";
import { assignmentService } from "../services/api-assignment";
import { useAuth } from "../contexts/AuthContext";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  MessageSquareMore,
  School,
} from "lucide-react";

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await assignmentService.getMySubmissions();
        const list = (res as any).data || res || [];
        setSubs(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const courses: Record<string, any> = {};
    for (const s of subs) {
      const a = s.assignment || {};
      const lesson = a.lesson || {};
      const module = lesson.module || {};
      const course = module.course || {};
      const cid = String(course.id ?? "unknown");
      if (!courses[cid]) {
        courses[cid] = { course, modules: {} };
      }
      const modId = String(module.id ?? "unknown");
      if (!courses[cid].modules[modId]) {
        courses[cid].modules[modId] = { module, lessons: {} };
      }
      const lessonId = String(lesson.id ?? "unknown");
      if (!courses[cid].modules[modId].lessons[lessonId]) {
        courses[cid].modules[modId].lessons[lessonId] = { lesson, items: [] };
      }
      courses[cid].modules[modId].lessons[lessonId].items.push(s);
    }
    const result = Object.values(courses).map((c: any) => ({
      course: c.course,
      modules: Object.values(c.modules).map((m: any) => ({
        module: m.module,
        lessons: Object.values(m.lessons).map((l: any) => ({
          lesson: l.lesson,
          items: l.items,
        })),
      })),
    }));
    return result;
  }, [subs]);

  const stats = useMemo(() => {
    const total = subs.length;
    const graded = subs.filter(
      (s) => s.status === "GRADED" || s.grade != null
    ).length;
    const submitted = subs.filter((s) => !!s.id).length;
    const ungraded = Math.max(0, submitted - graded);
    return { total, graded, submitted, ungraded };
  }, [subs]);

  return (
    <RoleGuard roles={["ROLE_STUDENT"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="My Submissions"
          description="View your assignment submissions and grades"
          keywords="submissions, grades"
        />
        <Header />

        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-sm text-gray-500">Học viên</div>
                <div className="text-xl font-semibold">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-sm text-gray-500">{user?.email}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Tổng quan</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Tổng bài nộp</div>
                    <div className="font-semibold">{stats.total}</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Đã chấm</div>
                    <div className="font-semibold">{stats.graded}</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Chưa chấm</div>
                    <div className="font-semibold">{stats.ungraded}</div>
                  </div>
                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Đã nộp</div>
                    <div className="font-semibold">{stats.submitted}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList size={18} className="text-gray-500" />
                Bài nộp của tôi
              </h2>
              <Link
                href="/dashboard"
                className="text-sm text-blue-600 hover:underline"
              >
                ← Quay lại Dashboard
              </Link>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải…</div>
            ) : grouped.length === 0 ? (
              <div className="text-sm text-gray-600">
                Bạn chưa có bài nộp nào.
              </div>
            ) : (
              <div className="space-y-6">
                {grouped.map((c: any, cIdx: number) => (
                  <div key={cIdx} className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <School size={16} className="text-gray-500" />
                      <div className="font-semibold">
                        {c.course?.title || "Khoá học"}
                      </div>
                    </div>
                    {c.modules.map((m: any, mIdx: number) => (
                      <div key={mIdx}>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <BookOpen size={14} className="text-gray-400" />
                          <div className="font-medium text-gray-800">
                            {m.module?.title || "Module"}
                          </div>
                        </div>
                        {m.lessons.map((L: any, lIdx: number) => (
                          <div key={lIdx} className="mb-4">
                            <div className="text-xs text-gray-500 mb-2">
                              Bài học:{" "}
                              <span className="font-medium text-gray-800">
                                {L.lesson?.title || "Lesson"}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {L.items.map((s: any) => (
                                <div
                                  key={s.id}
                                  className="border rounded p-4 hover:shadow-sm transition"
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        <FileText
                                          size={16}
                                          className="text-gray-500"
                                        />
                                        <span>
                                          {s.assignment?.title || "Bài tập"}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                        <span className="px-2 py-0.5 rounded-full border bg-white">
                                          {s.assignment?.type || "Assignment"}
                                        </span>
                                        {s.assignment?.due_date && (
                                          <span className="px-2 py-0.5 rounded-full border bg-white flex items-center gap-1">
                                            <Clock3 size={12} />
                                            {new Date(
                                              s.assignment.due_date
                                            ).toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-sm text-right min-w-36">
                                      {s.grade != null ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                          Điểm: {s.grade}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                          Chưa chấm
                                        </span>
                                      )}
                                      {s.submitted_at && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          Nộp:{" "}
                                          {new Date(
                                            s.submitted_at
                                          ).toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {s.content && (
                                      <div className="text-sm">{s.content}</div>
                                    )}
                                    {s.file_url && (
                                      <div className="text-sm">
                                        <a
                                          href={s.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          Tải tệp đính kèm
                                        </a>
                                      </div>
                                    )}
                                    {s.feedback && (
                                      <div className="text-sm flex items-start gap-2">
                                        <MessageSquareMore
                                          size={14}
                                          className="text-gray-500 mt-0.5"
                                        />
                                        <div>
                                          <div className="text-xs text-gray-500">
                                            Nhận xét của giảng viên
                                          </div>
                                          <div>{s.feedback}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
