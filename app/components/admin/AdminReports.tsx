"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { reportsService } from "../../services/api-reports";

interface TrendParams {
  from: string;
  to: string;
  interval: "day" | "month";
}

const AdminReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [trendParams, setTrendParams] = useState<TrendParams>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    return { from: fmt(from), to: fmt(to), interval: "day" };
  });

  const loadReports = async () => {
    try {
      setLoading(true);
      const [overview, courses] = await Promise.all([
        reportsService.getAdminOverview(),
        reportsService.getAdminCourses(1, 10),
      ]);
      setReports({ role: "admin", overview, courses });
      const t = await reportsService.getAdminTrends(
        trendParams.from,
        trendParams.to,
        trendParams.interval
      );
      setTrends(t);
    } catch (e) {
      console.error("Failed to load admin reports", e);
    } finally {
      setLoading(false);
    }
  };

  const reloadTrendsOnly = async () => {
    try {
      const t = await reportsService.getAdminTrends(
        trendParams.from,
        trendParams.to,
        trendParams.interval
      );
      setTrends(t);
    } catch (e) {
      console.error("Failed to reload trends", e);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">Báo cáo quản trị</h2>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi hiệu suất và xu hướng học tập theo thời gian
          </p>
        </div>

        <div className="mb-6 bg-gray-50/80 border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={trendParams.from}
              onChange={(e) =>
                setTrendParams((p) => ({ ...p, from: e.target.value }))
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={trendParams.to}
              onChange={(e) =>
                setTrendParams((p) => ({ ...p, to: e.target.value }))
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Khoảng thời gian
            </label>
            <select
              value={trendParams.interval}
              onChange={(e) =>
                setTrendParams((p) => ({
                  ...p,
                  interval: e.target.value as "day" | "month",
                }))
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Ngày</option>
              <option value="month">Tháng</option>
            </select>
          </div>
          <button
            onClick={reloadTrendsOnly}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-sm"
          >
            Áp dụng
          </button>
        </div>

        {!reports ? (
          <div className="text-sm text-gray-600">Đang tải báo cáo...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <AcademicCapIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Người dùng
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {reports.overview?.totals?.users ?? 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <BookOpenIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Khóa học
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {reports.overview?.totals?.courses ?? 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <ChartBarIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Lượt ghi danh
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {reports.overview?.totals?.enrollments ?? 0}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <CheckCircleIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Bài nộp
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {reports.overview?.totals?.submissions ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Hiệu quả khóa học (Top 10)
              </h3>
              <div className="divide-y">
                {((reports.courses?.data || []) as any[]).map(
                  (row: any, _idx: number, arr: any[]) => {
                    const maxEnroll = Math.max(
                      1,
                      ...arr.map((r: any) => Number(r.enrollments || 0))
                    );
                    const val = Number(row.enrollments || 0);
                    const width = Math.round((val / maxEnroll) * 100);
                    return (
                      <div key={row.id} className="py-3">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div className="flex-1 truncate pr-3 text-gray-900 font-medium">
                            {row.title}
                          </div>
                          <div className="w-28 text-right text-gray-700">
                            Ghi danh: {val}
                          </div>
                          <div className="w-36 text-right text-gray-700">
                            Đánh giá TB:{" "}
                            {Number(row.avg_rating || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Xu hướng</h3>
              {!trends ? (
                <div className="text-sm text-gray-600">
                  Đang tải xu hướng...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {(["enrollments", "submissions", "reviews"] as const).map(
                    (key) => {
                      const labels: Record<string, string> = {
                        enrollments: "Ghi danh",
                        submissions: "Bài nộp",
                        reviews: "Đánh giá",
                      };
                      const series = (trends as any)[key] || [];
                      const max = Math.max(
                        1,
                        ...series.map((s: any) => Number(s.count || 0))
                      );
                      return (
                        <div key={key} className="rounded-lg bg-gray-50 p-4">
                          <div className="text-sm font-medium text-gray-800 mb-2">
                            {labels[key]}
                          </div>
                          <div className="flex items-end gap-1.5 h-28">
                            {series.map((s: any) => {
                              const h = (Number(s.count || 0) / max) * 100;
                              return (
                                <div
                                  key={s.bucket}
                                  title={`${s.bucket}: ${s.count}`}
                                  className="w-2.5 rounded-t-md bg-gradient-to-t from-blue-300 to-blue-600"
                                  style={{ height: `${h}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="mt-1 text-[10px] text-gray-500 truncate">
                            {series.map((s: any) => s.bucket).join("  ")}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
