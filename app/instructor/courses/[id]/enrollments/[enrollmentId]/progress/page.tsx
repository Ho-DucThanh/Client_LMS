"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RoleGuard } from "../../../../../../components/RoleGuard";
import Heading from "../../../../../../utils/Heading";
import Header from "../../../../../../components/Header";
import Link from "next/link";
import { enrollmentService } from "../../../../../../services/api-enrollment";
import { moduleService } from "../../../../../../services/api-modules";
import { lessonService } from "../../../../../../services/api-lessons";
import { progressService } from "../../../../../../services/api-progress";
import { BookOpen, CheckCircle2, Clock3, Layers } from "lucide-react";

type ModuleItem = { id: number; title: string } & Record<string, any>;
type LessonItem = { id: number; title: string; module_id: number } & Record<
  string,
  any
>;

export default function ProgressPage() {
  const { id, enrollmentId } = useParams() as {
    id: string;
    enrollmentId: string;
  };
  const courseId = Number(id);
  const enrId = Number(enrollmentId);

  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [lessonsByModule, setLessonsByModule] = useState<
    Record<number, LessonItem[]>
  >({});
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"module" | "lesson">("module");

  useEffect(() => {
    if (!courseId || !enrId) return;
    (async () => {
      setLoading(true);
      try {
        const [enr, mods, mProg, lProg] = await Promise.all([
          enrollmentService.getEnrollmentProgress(enrId).catch(() => null),
          moduleService.getModules(courseId),
          progressService.getProgress({ enrollment_id: enrId }),
          progressService.getLessonProgress({ enrollment_id: enrId }),
        ]);

        const enrObj = (enr as any)?.data || enr || null;
        setEnrollment(enrObj);

        const modsArr: ModuleItem[] = (((mods as any)?.data || mods) ??
          []) as any[];
        setModules(modsArr);

        const mProgArr: any[] = (((mProg as any)?.data || mProg) ??
          []) as any[];
        setModuleProgress(mProgArr);

        const lProgArr: any[] = (((lProg as any)?.data || lProg) ??
          []) as any[];
        setLessonProgress(lProgArr);

        // Load lessons per module
        const lessonPairs = await Promise.all(
          modsArr.map(async (m) => {
            try {
              const lr = await lessonService.getLessons(m.id);
              const list: LessonItem[] = (((lr as any)?.data || lr) ??
                []) as any[];
              return [m.id, list] as [number, LessonItem[]];
            } catch {
              return [m.id, []] as [number, LessonItem[]];
            }
          })
        );
        const grouped: Record<number, LessonItem[]> = {};
        for (const [mid, list] of lessonPairs) grouped[mid] = list;
        setLessonsByModule(grouped);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, enrId]);

  const moduleProgressById = useMemo(() => {
    const map: Record<number, any> = {};
    for (const p of moduleProgress) {
      if (p.module_id) map[p.module_id] = p;
    }
    return map;
  }, [moduleProgress]);

  const lessonProgressByLessonId = useMemo(() => {
    const map: Record<number, any> = {};
    for (const p of lessonProgress) {
      if (p.lesson_id) map[p.lesson_id] = p;
    }
    return map;
  }, [lessonProgress]);

  const totals = useMemo(() => {
    const totalModules = modules.length;
    const totalLessons = Object.values(lessonsByModule).reduce(
      (acc, list) => acc + (list?.length || 0),
      0
    );
    const completedLessons = Object.entries(lessonsByModule).reduce(
      (acc, [mid, list]) => {
        const count = (list || []).filter((l) => {
          const lp = lessonProgressByLessonId[l.id];
          const pct = Number(lp?.progress_percent ?? 0);
          return Boolean(lp?.is_completed) || pct >= 100;
        }).length;
        return acc + count;
      },
      0
    );
    const modulePercents = modules.map((m) => computeModulePercent(m.id));
    const avgModulePercent = modulePercents.length
      ? Math.round(
          modulePercents.reduce((a, b) => a + b, 0) / modulePercents.length
        )
      : 0;
    const completedModules = modulePercents.filter((p) => p >= 100).length;
    const totalMinutes = moduleProgress.reduce(
      (acc, mp) => acc + Number(mp?.time_spent_minutes || 0),
      0
    );
    return {
      totalModules,
      totalLessons,
      completedLessons,
      avgModulePercent,
      completedModules,
      totalMinutes,
    };
  }, [modules, lessonsByModule, lessonProgressByLessonId, moduleProgress]);

  const overallPercent = useMemo(() => {
    const fromEnrollment = Number(enrollment?.progress_percentage);
    if (!Number.isNaN(fromEnrollment) && fromEnrollment >= 0) {
      return Math.max(0, Math.min(100, Math.round(fromEnrollment)));
    }
    if (totals.totalLessons > 0) {
      return Math.round(
        (totals.completedLessons / Math.max(1, totals.totalLessons)) * 100
      );
    }
    return totals.avgModulePercent;
  }, [enrollment?.progress_percentage, totals]);

  const radialStyle = useMemo(() => {
    const deg = Math.max(0, Math.min(100, overallPercent)) * 3.6;
    return {
      background: `conic-gradient(#2563eb ${deg}deg, #e5e7eb ${deg}deg 360deg)`,
    } as React.CSSProperties;
  }, [overallPercent]);

  const formatMinutes = (mins: number) => {
    if (!mins || mins <= 0) return "0 phút";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} giờ ${m} phút`;
    if (h > 0) return `${h} giờ`;
    return `${m} phút`;
  };

  function computeModulePercent(moduleId: number) {
    const mp = moduleProgressById[moduleId];
    if (mp) return Number(mp.completion_percentage ?? mp.progress_percent ?? 0);
    const lessons = lessonsByModule[moduleId] || [];
    if (lessons.length === 0) return 0;
    const completed = lessons.filter((l) => {
      const lp = lessonProgressByLessonId[l.id];
      const pct = Number(lp?.progress_percent ?? 0);
      const done = Boolean(lp?.is_completed) || pct >= 100;
      return done;
    }).length;
    return Math.round((completed / lessons.length) * 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Tiến độ ghi danh"
          description="Xem tiến độ học viên"
          keywords="tien do"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Tiến độ ghi danh"
          description="Xem tiến độ học viên"
          keywords="tien do"
        />
        <Header />

        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/instructor/courses/${courseId}/enrollments`}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Quay lại danh sách ghi danh
              </Link>
              <h1 className="text-2xl font-semibold">Tổng quan tiến độ</h1>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-semibold">
                  {(enrollment?.student?.first_name?.[0] || "S").toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">
                    {enrollment?.student?.first_name}{" "}
                    {enrollment?.student?.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {enrollment?.student?.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div
                  className="relative w-20 h-20 rounded-full grid place-items-center"
                  style={radialStyle}
                >
                  <div className="absolute inset-1 rounded-full bg-white grid place-items-center">
                    <span className="text-lg font-semibold text-gray-800">
                      {overallPercent}%
                    </span>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm text-gray-500">Tiến độ tổng thể</div>
                  <div className="text-xl font-semibold">{overallPercent}%</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                  <Layers size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Mô-đun</div>
                  <div className="font-semibold">
                    {totals.completedModules}/{totals.totalModules} hoàn thành
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Bài học</div>
                  <div className="font-semibold">
                    {totals.completedLessons}/{totals.totalLessons} hoàn thành
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">TB mô-đun</div>
                  <div className="font-semibold">
                    {totals.avgModulePercent}%
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4 flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-50 text-amber-600">
                  <Clock3 size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Thời gian học</div>
                  <div className="font-semibold">
                    {formatMinutes(totals.totalMinutes)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 px-6">
              <nav className="flex space-x-6">
                {[
                  { key: "module", label: "Theo mô-đun" },
                  { key: "lesson", label: "Theo bài học" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`py-4 px-1 border-b-2 -mb-px text-sm font-medium ${
                      activeTab === t.key
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === "module" && (
              <div className="p-6 space-y-4">
                {modules.length === 0 ? (
                  <div className="text-gray-600">Chưa có mô-đun</div>
                ) : (
                  modules.map((m) => {
                    const pct = computeModulePercent(m.id);
                    const mp = moduleProgressById[m.id];
                    const lessons = lessonsByModule[m.id] || [];
                    const doneCount = lessons.filter((l) => {
                      const lp = lessonProgressByLessonId[l.id];
                      const lpct = Number(lp?.progress_percent ?? 0);
                      return Boolean(lp?.is_completed) || lpct >= 100;
                    }).length;
                    return (
                      <div key={m.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium text-gray-800">
                            {m.title}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              pct >= 100
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
                          <div
                            className="h-2 rounded bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                            style={{
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                            }}
                          />
                        </div>
                        <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
                          <div>
                            {doneCount}/{lessons.length} bài học hoàn thành
                          </div>
                          <div>
                            {mp?.time_spent_minutes ? (
                              <span>
                                ⏱ {formatMinutes(Number(mp.time_spent_minutes))}
                              </span>
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "lesson" && (
              <div className="p-6 space-y-6">
                {modules.length === 0 ? (
                  <div className="text-gray-600">Chưa có mô-đun</div>
                ) : (
                  modules.map((m) => {
                    const lessons = lessonsByModule[m.id] || [];
                    return (
                      <div key={m.id}>
                        <div className="font-semibold text-gray-800 mb-3">
                          {m.title}
                        </div>
                        {lessons.length === 0 ? (
                          <div className="text-sm text-gray-500">
                            Chưa có bài học
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {lessons.map((l, idx) => {
                              const lp = lessonProgressByLessonId[l.id];
                              const pct = Number(lp?.progress_percent ?? 0);
                              const done =
                                Boolean(lp?.is_completed) || pct >= 100;
                              return (
                                <li
                                  key={l.id}
                                  className="flex items-center justify-between border rounded-md p-3 hover:shadow-sm transition"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-700">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">
                                        {l.title}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Bài học #{l.id}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        done
                                          ? "bg-green-100 text-green-700"
                                          : "bg-yellow-100 text-yellow-700"
                                      }`}
                                    >
                                      {done ? "Hoàn thành" : `${pct}%`}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
