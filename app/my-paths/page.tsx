"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

type PathItem = {
  id: number;
  stage: string;
  order_index: number;
  note?: string | null;
  course?: any | null;
};

type LearningPath = {
  id: number;
  name: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  items: PathItem[];
};

export default function MyPathsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<string>("recent");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiService.listMyLearningPaths();
        if (!cancelled) setPaths(Array.isArray(res) ? res : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Không thể tải lộ trình");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = paths.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.metadata?.goal_text || "").toLowerCase().includes(q)
      );
    }
    if (stageFilter !== "ALL") {
      list = list.filter((p) => p.items?.some((i) => i.stage === stageFilter));
    }
    switch (sort) {
      case "name":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "oldest":
        list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
    return list;
  }, [paths, query, stageFilter, sort]);

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleDelete = async (id: number) => {
    const path = paths.find((p) => p.id === id);
    const name = path?.name || `Lộ trình #${id}`;
    const ok = confirm(
      `Xóa lộ trình “${name}”?\nThao tác này không thể hoàn tác.`
    );
    if (!ok) return;
    // Optimistic UI
    const prev = paths;
    setPaths((p) => p.filter((x) => x.id !== id));
    try {
      await apiService.deleteLearningPath(id);
    } catch (e: any) {
      // revert
      setPaths(prev);
      alert(e?.message || "Xóa lộ trình thất bại");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Lộ trình của tôi</h1>
        <p className="text-sm text-gray-600">
          Xem lại, tìm kiếm và quản lý những lộ trình bạn đã lưu.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Tìm theo tên hoặc mục tiêu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="ALL">Tất cả giai đoạn</option>
              <option value="FOUNDATION">Foundation</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="SPECIALIZATION">Specialization</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sắp xếp:</span>
          <select
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Mới cập nhật</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
          </select>
          <button
            onClick={() => {
              setQuery("");
              setStageFilter("ALL");
              setSort("recent");
            }}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border rounded-lg bg-white animate-pulse"
            >
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="mt-2 h-3 w-64 bg-gray-100 rounded" />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="h-20 bg-gray-100 rounded" />
                <div className="h-20 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center">
          <div className="text-lg font-medium text-gray-800">
            Chưa có lộ trình nào
          </div>
          <p className="text-gray-600 mt-2">
            Hãy bắt đầu tại trang Dashboard để AI gợi ý lộ trình phù hợp với
            bạn.
          </p>
          <Link
            href="/dashboard?tab=learning"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Tạo lộ trình đầu tiên
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((p) => {
          const items = (p.items || []).slice().sort((a, b) => {
            if (a.stage === b.stage) return a.order_index - b.order_index;
            const order: Record<string, number> = {
              FOUNDATION: 0,
              INTERMEDIATE: 1,
              ADVANCED: 2,
              SPECIALIZATION: 3,
            };
            return (order[a.stage] ?? 99) - (order[b.stage] ?? 99);
          });
          return (
            <div
              key={p.id}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {p.items?.length || 0} khóa học
                    </span>
                    {Array.from(new Set(items.map((i) => i.stage))).map(
                      (st) => (
                        <span
                          key={st}
                          className="px-2 py-0.5 text-[11px] rounded-full bg-gray-50 text-gray-700 border"
                        >
                          {st}
                        </span>
                      )
                    )}
                  </div>
                  <div
                    className="mt-2 text-lg font-semibold truncate"
                    title={p.name}
                  >
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Cập nhật: {new Date(p.updatedAt).toLocaleString()}
                  </div>
                  {p.metadata?.goal_text && (
                    <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                      Mục tiêu: {p.metadata.goal_text}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    {expanded[p.id] ? (
                      <>
                        Thu gọn <ChevronUpIcon className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Xem chi tiết <ChevronDownIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50"
                    title="Xóa lộ trình"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {expanded[p.id] && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        Bước: {it.stage} • Thứ tự: {it.order_index}
                      </div>
                      {it.course ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm line-clamp-2">
                              {it.course.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {it.course.category?.name || ""}
                            </div>
                          </div>
                          <Link
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white whitespace-nowrap"
                            href={`/courses/${it.course.id}`}
                          >
                            Xem khóa học
                          </Link>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">
                          Khóa học không khả dụng
                        </div>
                      )}
                      {it.note && (
                        <div className="text-[11px] text-gray-600 mt-1">
                          Ghi chú: {it.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
