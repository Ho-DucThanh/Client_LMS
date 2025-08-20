"use client";
import React, { useEffect, useState } from "react";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RoleGuard } from "../components/RoleGuard";
import {
  courseService,
  moduleService,
  lessonService,
  progressService,
  enrollmentService,
} from "../services";

export default function InstructorDashboard() {
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [enrollStats, setEnrollStats] = useState<any | null>(null);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [approvalSummary, setApprovalSummary] = useState<{
    pending: number;
    approved: number;
    rejected: number;
  }>({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadMyCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadModules(selectedCourseId);
      loadEnrollStats(selectedCourseId);
    } else {
      setModules([]);
      setLessons([]);
      setEnrollStats(null);
    }
  }, [selectedCourseId]);

  const loadMyCourses = async () => {
    try {
      const res = await courseService.getMyCourses();
      const list = (res?.data || res || []) as any[];
      setMyCourses(list);
      if (list.length) setSelectedCourseId(list[0].id);

      // compute approval summary
      const summary = list.reduce(
        (acc, c) => {
          const s = (c.approval_status || c.approvalStatus || "PENDING") as
            | "PENDING"
            | "APPROVED"
            | "REJECTED";
          if (s === "PENDING") acc.pending += 1;
          else if (s === "APPROVED") acc.approved += 1;
          else if (s === "REJECTED") acc.rejected += 1;
          return acc;
        },
        { pending: 0, approved: 0, rejected: 0 }
      );
      setApprovalSummary(summary);

      // total students across courses (sum active+completed)
      const stats = await Promise.all(
        list.map(async (c) => {
          try {
            const s = await enrollmentService.getCourseEnrollmentStats(c.id);
            const d = (s as any).data || s || {};
            return (d.active ?? 0) + (d.completed ?? 0);
          } catch {
            return 0;
          }
        })
      );
      setTotalStudents(stats.reduce((a, b) => a + b, 0));
    } catch (e) {
      console.error(e);
    }
  };

  const loadModules = async (courseId: number) => {
    try {
      const res = await moduleService.getModules(courseId);
      const data = res?.data || res || [];
      setModules(data);
      if (data.length) {
        const firstModule = data[0];
        const ls = await lessonService.getLessons(firstModule.id);
        setLessons(ls?.data || ls || []);
      } else {
        setLessons([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadEnrollStats = async (courseId: number) => {
    try {
      const res = await enrollmentService.getCourseEnrollmentStats(courseId);
      setEnrollStats(res?.data || res || null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Instructor Dashboard - ELearning"
          description="Manage your courses, modules, and lessons"
          keywords="instructor, teacher, dashboard"
        />
        <Header />

        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Courses</div>
              <div className="text-3xl font-bold">{myCourses.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Students</div>
              <div className="text-3xl font-bold">{totalStudents}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Approval</div>
              <div className="flex gap-4 mt-2 text-sm">
                <div className="text-yellow-700">
                  Pending: {approvalSummary.pending}
                </div>
                <div className="text-green-700">
                  Approved: {approvalSummary.approved}
                </div>
                <div className="text-red-700">
                  Rejected: {approvalSummary.rejected}
                </div>
              </div>
            </div>
          </div>

          {/* My courses list and selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(myCourses || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`text-left p-4 rounded-lg border ${
                    selectedCourseId === c.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">{c.title}</div>
                  <div className="text-sm text-gray-600">
                    Enrolled: {c.total_enrolled ?? "-"}
                  </div>
                  <div className="text-xs mt-1">
                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 mr-2">
                      {c.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        c.approval_status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : c.approval_status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {c.approval_status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedCourseId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Modules & Lessons
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((m) => (
                    <div key={m.id} className="border rounded-lg p-4">
                      <div className="font-semibold text-gray-900">
                        {m.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        Order #{m.order_index ?? "-"}
                      </div>
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Lessons
                        </div>
                        <ul className="space-y-2">
                          {lessons
                            .filter((l: any) => l.module_id === m.id)
                            .map((l: any) => (
                              <li
                                key={l.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-800">{l.title}</span>
                                <span className="text-gray-500">{l.type}</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Enrollment Stats
                </h2>
                {enrollStats ? (
                  <>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="font-semibold">
                          {enrollStats.total}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active</span>
                        <span className="font-semibold text-green-600">
                          {enrollStats.active}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed</span>
                        <span className="font-semibold text-blue-600">
                          {enrollStats.completed}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dropped</span>
                        <span className="font-semibold text-red-600">
                          {enrollStats.dropped}
                        </span>
                      </div>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Active", value: enrollStats.active },
                            { name: "Completed", value: enrollStats.completed },
                            { name: "Dropped", value: enrollStats.dropped },
                          ]}
                        >
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-600">No stats</div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Approval notifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Approval Notifications
          </h2>
          {myCourses.filter((c) => c.approval_status !== "APPROVED").length ===
          0 ? (
            <div className="text-gray-600 text-sm">All courses approved.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {myCourses
                .filter((c) => c.approval_status !== "APPROVED")
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between border rounded px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{c.title}</div>
                      <div className="text-gray-600">
                        Status: {c.approval_status}
                      </div>
                    </div>
                    <a
                      href={`/instructor/courses/${c.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Review
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
