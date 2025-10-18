"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { reportsService } from "../../services/api-reports";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

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

            {/* Charts row: Pie (enrollment distribution) and Bar (top courses) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Phân bố trạng thái ghi danh
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const e =
                            (reports as any)?.overview?.enrollments || {};
                          return [
                            {
                              name: "Đang học",
                              value: Number(e.active || 0),
                              color: "#3b82f6",
                            },
                            {
                              name: "Hoàn thành",
                              value: Number(e.completed || 0),
                              color: "#10b981",
                            },
                            {
                              name: "Đã hủy",
                              value: Number(e.dropped || 0),
                              color: "#9ca3af",
                            },
                          ];
                        })()}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                      >
                        {(() => {
                          const e =
                            (reports as any)?.overview?.enrollments || {};
                          const data = [
                            {
                              name: "Đang học",
                              value: Number(e.active || 0),
                              color: "#3b82f6",
                            },
                            {
                              name: "Hoàn thành",
                              value: Number(e.completed || 0),
                              color: "#10b981",
                            },
                            {
                              name: "Đã hủy",
                              value: Number(e.dropped || 0),
                              color: "#9ca3af",
                            },
                          ];
                          return data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ));
                        })()}
                      </Pie>
                      <ReTooltip formatter={(val: any) => [val, "Số lượng"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Khóa học (Top 10)
                  </h3>
                  <span className="text-xs text-gray-500">
                    Theo số lượt ghi danh
                  </span>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(() => {
                        const rows = ((reports as any)?.courses?.data ||
                          []) as any[];
                        return rows.map((r) => ({
                          name:
                            String(r.title || "").slice(0, 18) +
                            (String(r.title || "").length > 18 ? "…" : ""),
                          enrollments: Number(r.enrollments || 0),
                          rating: Number(r.avg_rating || 0),
                        }));
                      })()}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-10}
                        height={40}
                        textAnchor="end"
                      />
                      <YAxis />
                      <ReTooltip
                        formatter={(v: any, n: any) => [
                          v,
                          n === "enrollments" ? "Ghi danh" : "Đánh giá TB",
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="enrollments"
                        name="Ghi danh"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Trends line chart */}
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Xu hướng theo thời gian
              </h3>
              {!trends ? (
                <div className="text-sm text-gray-600">
                  Đang tải xu hướng...
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(() => {
                        const e = ((trends as any).enrollments || []) as any[];
                        const s = ((trends as any).submissions || []) as any[];
                        const r = ((trends as any).reviews || []) as any[];
                        const map = new Map<
                          string,
                          {
                            bucket: string;
                            enrollments?: number;
                            submissions?: number;
                            reviews?: number;
                          }
                        >();
                        for (const row of e) {
                          map.set(row.bucket, {
                            bucket: row.bucket,
                            enrollments: Number(row.count || 0),
                          });
                        }
                        for (const row of s) {
                          const prev = map.get(row.bucket) || {
                            bucket: row.bucket,
                          };
                          map.set(row.bucket, {
                            ...prev,
                            submissions: Number(row.count || 0),
                          });
                        }
                        for (const row of r) {
                          const prev = map.get(row.bucket) || {
                            bucket: row.bucket,
                          };
                          map.set(row.bucket, {
                            ...prev,
                            reviews: Number(row.count || 0),
                          });
                        }
                        return Array.from(map.values()).sort((a, b) =>
                          a.bucket.localeCompare(b.bucket)
                        );
                      })()}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <ReTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="enrollments"
                        name="Ghi danh"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="submissions"
                        name="Bài nộp"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="reviews"
                        name="Đánh giá"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
