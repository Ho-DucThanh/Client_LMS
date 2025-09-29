"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "../services/api";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lộ trình của tôi</h1>
        <p className="text-sm text-gray-600">
          Xem lại các lộ trình đã lưu từ gợi ý AI.
        </p>
      </div>

      {loading && <div className="text-gray-600">Đang tải lộ trình...</div>}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && paths.length === 0 && (
        <div className="text-gray-600 bg-gray-50 border rounded p-6">
          Bạn chưa lưu lộ trình nào.
        </div>
      )}

      <div className="space-y-5">
        {paths.map((p) => {
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
            <div key={p.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    Cập nhật: {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500">#{p.id}</div>
              </div>
              {p.metadata?.goal_text && (
                <div className="text-sm text-gray-600 mt-1">
                  Mục tiêu: {p.metadata.goal_text}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((it) => (
                  <div key={it.id} className="border rounded p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-1">
                      Bước: {it.stage} • Thứ tự: {it.order_index}
                    </div>
                    {it.course ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm line-clamp-2">
                            {it.course.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {it.course.category?.name || ""}
                          </div>
                        </div>
                        <Link
                          className="text-xs px-2 py-1 rounded bg-blue-600 text-white"
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
