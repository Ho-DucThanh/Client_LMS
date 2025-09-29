"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";
import { CourseCard } from "./course/CourseCard";
import { useAuth } from "../contexts/AuthContext";

const STAGES = ["FOUNDATION", "INTERMEDIATE", "ADVANCED", "SPECIALIZATION"];
const STAGE_LABELS: Record<string, string> = {
  FOUNDATION: "Nền tảng",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
  SPECIALIZATION: "Chuyên sâu",
};

export default function LearningPath() {
  const { user } = useAuth();
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [mode, setMode] = useState<"guided" | "direct">("guided");
  const [chatMode, setChatMode] = useState(false);
  const [prefs, setPrefs] = useState("");
  const [prefTags, setPrefTags] = useState<string[]>([]);
  const [prefInput, setPrefInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<any | null>(null);
  const [coursesMeta, setCoursesMeta] = useState<Record<number, any>>({});
  const [notInterested, setNotInterested] = useState<Record<number, boolean>>(
    {}
  );
  const [path, setPath] = useState<number[]>([]);
  const [explain, setExplain] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCareers, setShowCareers] = useState(false);
  const [showStages, setShowStages] = useState(true);
  const [followUp, setFollowUp] = useState("");
  // removed explicit save button/state per requirement
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    // reset when user changes, hydrate saved path from localStorage
    setRec(null);
    setCoursesMeta({});
    setNotInterested({});
    const key = user?.id ? `learningPath:${user.id}` : `learningPath:guest`;
    try {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPath(
            parsed
              .filter((x) => Number.isFinite(Number(x)))
              .map((x) => Number(x))
          );
        } else {
          setPath([]);
        }
      } else {
        setPath([]);
      }
    } catch {
      setPath([]);
    }
  }, [user?.id]);

  useEffect(() => {
    // persist path when it changes
    const key = user?.id ? `learningPath:${user.id}` : `learningPath:guest`;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          key,
          JSON.stringify(Array.from(new Set(path)))
        );
      }
    } catch {}
  }, [path, user?.id]);

  const generate = async () => {
    if (!goal.trim()) return setError("Vui lòng nhập mục tiêu học tập");
    setError(null);
    setLoading(true);
    try {
      // prefer tag-based preferences if provided
      const preferences =
        prefTags && prefTags.length > 0
          ? prefTags.slice()
          : prefs
              .split(/[,|]/)
              .map((s) => s.trim())
              .filter(Boolean);

      const data = await apiService.generateRecommendation({
        goal,
        currentLevel: level,
        preferences,
        verbosity: mode === "guided" ? "deep" : "medium",
        guidanceMode: mode === "guided" ? "novice" : "standard",
      });

      setRec(data);

      // If server already returned metadata inside courses_by_stage (now enriched), use it and avoid extra GET requests
      const meta: Record<number, any> = {};
      const byStage = data?.courses_by_stage || null;
      if (byStage) {
        for (const stage of Object.keys(byStage)) {
          for (const item of byStage[stage] || []) {
            if (item && item.id) {
              // store full enriched course object
              meta[item.id] = { ...item };
            }
          }
        }
      } else {
        // fallback to legacy 'courses' array
        const ids = Array.from(
          new Set(
            (data?.courses || []).map((c: any) => Number(c?.id)).filter(Boolean)
          )
        ) as number[];
        await Promise.all(
          ids.map(async (id: number) => {
            try {
              const res = await apiService.getCourse(id);
              const course = (res && ((res as any).data || res)) || null;
              if (course) meta[id] = course;
            } catch (e) {}
          })
        );
      }
      setCoursesMeta(meta);

      // Hydrate: fetch full course detail for any course missing key fields (instructor, category, price, rating, description)
      const hydrateIds = Object.values(meta)
        .filter(
          (c: any) =>
            !c.instructor ||
            !c.category ||
            typeof c.price === "undefined" ||
            typeof c.rating === "undefined" ||
            typeof c.description === "undefined"
        )
        .map((c: any) => c.id);
      if (hydrateIds.length) {
        try {
          const detailed: Record<number, any> = { ...meta };
          await Promise.all(
            hydrateIds.map(async (id: number) => {
              try {
                const res = await apiService.getCourse(id);
                const full = (res && ((res as any).data || res)) || null;
                if (full) {
                  detailed[id] = { ...detailed[id], ...full };
                }
              } catch (e) {}
            })
          );
          setCoursesMeta(detailed);
        } catch (e) {
          // silent – non-critical enhancement
        }
      }
    } catch (e: any) {
      setError(e?.message || "Không thể tạo gợi ý lộ trình");
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    if (!rec) return {} as Record<string, any[]>;
    const map: Record<string, any[]> = {};
    for (const s of STAGES) map[s] = [];

    // prefer server-provided grouped data
    if (rec.courses_by_stage) {
      for (const s of STAGES) {
        const list = rec.courses_by_stage[s] || [];
        const mapped = list
          // skip placeholders entirely (no id)
          .filter((it: any) => it && it.id)
          .map((it: any) => ({
            id: it.id,
            title: it.title,
            description: it.description,
            rationale: it.note || (it.matchedTopics || []).join(", "),
            matchedTopics: it.matchedTopics || [],
            thumbnail_url: it.thumbnail_url || null,
            level: it.level || null,
            total_enrolled: it.total_enrolled || 0,
            price: it.price,
            original_price: it.original_price,
            duration_hours: it.duration_hours,
            rating: it.rating,
            rating_count: it.rating_count,
            status: it.status,
            approval_status: it.approval_status,
            instructor: it.instructor,
            category: it.category,
            tags: it.tags,
          }));
        // per-stage dedupe by id and limit to 3
        const seen = new Set<number>();
        map[s] = mapped
          .filter((it: any) => {
            if (seen.has(it.id)) return false;
            seen.add(it.id);
            return true;
          })
          .slice(0, 3);
      }
    } else {
      for (const c of rec.courses || []) {
        if (!c || !c.id) continue;
        if (notInterested[c.id]) continue;
        const stage = c.stage || "FOUNDATION";
        map[stage] = map[stage] || [];
        map[stage].push(c);
      }
      // limit each stage to 3 courses and dedupe by id
      for (const k of Object.keys(map)) {
        const seen = new Set<number>();
        map[k] = map[k]
          .filter((it: any) => {
            const id = Number(it.id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          })
          .slice(0, 3);
      }
    }

    // apply notInterested filter and ensure up to 3 items per stage
    for (const k of Object.keys(map)) {
      map[k] = (map[k] || [])
        .filter((it: any) => !(it.id && notInterested[it.id]))
        .slice(0, 3);
    }

    return map;
  }, [rec, notInterested]);

  const handleNotInterested = (courseId: number) => {
    setNotInterested((s) => ({ ...s, [courseId]: true }));
  };

  const handleAddToPath = (courseId: number) => {
    if (!courseId) return;
    setPath((p) => (p.includes(courseId) ? p : [...p, courseId]));
  };

  const handleRemoveFromPath = (courseId: number) => {
    setPath((p) => p.filter((id) => id !== courseId));
  };

  // Removed direct enroll/start from Learning Path per requirements

  const openExplain = (course: any) => {
    setExplain(course);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-3">Lộ trình học tập</h2>
      <p className="text-sm text-gray-600 mb-4">
        Nhập mục tiêu và sở thích để nhận lộ trình học với các khóa học gợi ý.
      </p>

      {/* Mode toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="text-sm text-gray-600">Chế độ:</div>
        <button
          onClick={() => setMode("guided")}
          className={`px-3 py-1 rounded ${
            mode === "guided"
              ? "bg-blue-600 text-white"
              : "border text-gray-700"
          }`}
        >
          Hướng dẫn / Giải thích trước
        </button>
        <button
          onClick={() => setMode("direct")}
          className={`px-3 py-1 rounded ${
            mode === "direct"
              ? "bg-blue-600 text-white"
              : "border text-gray-700"
          }`}
        >
          Nhanh / Trực tiếp
        </button>
        <button
          onClick={() => {
            setMode("guided");
            setGoal(
              "Tôi là người mới, tôi muốn bắt đầu học lập trình nhưng không biết bắt đầu từ đâu, hãy giúp tôi."
            );
          }}
          className="ml-auto text-sm text-blue-600 underline"
        >
          Tôi không biết bắt đầu từ đâu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Mục tiêu của bạn (VD: Học Frontend)"
          className="col-span-2 border rounded p-3"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border rounded p-3"
        >
          <option>Mới bắt đầu</option>
          <option>Trung cấp</option>
          <option>Nâng cao</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="text-sm text-gray-600 block mb-1">
          Sở thích / công nghệ
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1 border rounded p-2">
            <div className="flex flex-wrap gap-2">
              {prefTags.map((t, i) => (
                <span
                  key={`tag-${t}-${i}`}
                  className="px-2 py-1 bg-gray-100 rounded text-sm flex items-center gap-2"
                >
                  <span>{t}</span>
                  <button
                    onClick={() => setPrefTags((s) => s.filter((x) => x !== t))}
                    className="text-xs text-gray-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={prefInput}
                onChange={(e) => setPrefInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const v = (prefInput || "").trim();
                    if (v) {
                      setPrefTags((s) => Array.from(new Set([...s, v])));
                      setPrefInput("");
                    }
                  }
                }}
                placeholder="Nhập thẻ và nhấn Enter"
                className="flex-1 p-2 outline-none"
              />
            </div>
          </div>
          <input
            value={prefs}
            onChange={(e) => setPrefs(e.target.value)}
            placeholder="Hoặc nhập danh sách, phân tách bằng dấu phẩy"
            className="w-56 border rounded p-2"
          />
          <button
            onClick={generate}
            disabled={loading || !goal.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "Đang tạo..." : "Tạo lộ trình"}
          </button>
        </div>
      </div>
      {/* Chat mode (conversational alternative) */}
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={chatMode}
            onChange={(e) => setChatMode(e.target.checked)}
          />{" "}
          Chế độ chat (ngôn ngữ tự nhiên)
        </label>
        {chatMode && (
          <span className="text-xs text-gray-500">
            Gợi ý: Hãy đặt câu hỏi như “Tôi nên chọn web hay mobile?” rồi tạo
            lại.
          </span>
        )}
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Loading state */}
      {loading && (
        <div className="mt-4 p-4 bg-gray-50 rounded flex items-center gap-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <div className="text-sm text-gray-700">
            Đang tạo lộ trình của bạn…
          </div>
        </div>
      )}

      {/* Concepts & Careers for novice users */}
      {rec && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-2">
            {chatMode && (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Đặt câu hỏi bổ sung (vd: Nên chọn web hay mobile?)"
                  className="flex-1 border rounded p-2"
                />
                <button
                  disabled={!followUp.trim() || !rec?.id}
                  onClick={async () => {
                    const res = await apiService.followUpRecommendation(
                      rec.id,
                      followUp
                    );
                    setAnswer(res?.answer || "");
                  }}
                  className="px-3 py-1 border rounded"
                >
                  Hỏi
                </button>
              </div>
            )}
          </div>
          {answer && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-gray-700">
              {answer}
            </div>
          )}
          {Array.isArray(rec.concepts) && rec.concepts.length > 0 && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Khái niệm cốt lõi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rec.concepts.slice(0, 8).map((c: any, idx: number) => (
                  <div
                    key={`concept-${idx}`}
                    className="p-3 rounded bg-gray-50"
                  >
                    <div className="font-medium">{c.name}</div>
                    {c.short && (
                      <div className="text-sm text-gray-600 mt-1">
                        {c.short}
                      </div>
                    )}
                    {c.long && (
                      <details className="mt-2 text-sm text-gray-700">
                        <summary className="cursor-pointer">Xem thêm</summary>
                        <div className="mt-1 whitespace-pre-wrap">{c.long}</div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(rec.careers) && rec.careers.length > 0 && (
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Lộ trình nghề nghiệp</h3>
                <button
                  onClick={() => setShowCareers((v) => !v)}
                  className="text-sm text-blue-600 underline"
                >
                  {showCareers ? "Thu gọn" : "Xem chi tiết"}
                </button>
              </div>
              {showCareers && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rec.careers.slice(0, 9).map((c: any, idx: number) => (
                    <div
                      key={`career-${idx}`}
                      className="p-3 rounded bg-gray-50"
                    >
                      <div className="font-medium">{c.name}</div>
                      {c.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {c.description}
                        </div>
                      )}
                      {Array.isArray(c.typicalRoles) &&
                        c.typicalRoles.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {c.typicalRoles.map((r: string, i: number) => (
                              <span
                                key={`role-${idx}-${i}`}
                                className="px-2 py-0.5 text-xs bg-gray-200 rounded"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
              {!showCareers && (
                <div className="text-sm text-gray-600">
                  Gợi ý lộ trình nghề nghiệp (Web, Mobile, Data, Game, DevOps,
                  QA…). Nhấn “Xem chi tiết”.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {rec ? (
        <div className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            {STAGES.map((s, idx) => (
              <div key={s} className="flex-1 text-center">
                <div className="text-sm text-gray-500">Bước {idx + 1}</div>
                <div className="mt-2 font-semibold">{STAGE_LABELS[s] || s}</div>
                <div className="h-1 bg-gray-200 mt-3 rounded" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="sr-only">Timeline</h3>
            <button
              onClick={() => setShowStages((v) => !v)}
              className="text-sm text-blue-600 underline"
            >
              {showStages ? "Thu gọn lộ trình" : "Xem lộ trình"}
            </button>
          </div>

          {showStages &&
            STAGES.map((s) => (
              <div key={s} className="bg-gray-50 p-4 rounded">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">{STAGE_LABELS[s] || s}</h3>
                  <div className="text-sm text-gray-600">
                    {(grouped[s] || []).length} khóa học
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(grouped[s] || []).map((c: any, idx: number) => {
                    if (!c || !c.id) return null; // placeholders skipped

                    const meta = coursesMeta[c.id];
                    // safe key: if id is missing for any reason use stage+idx token
                    const itemKey = `course-${c.id ?? `idx-${s}-${idx}`}`;
                    const cardCourse = meta ? { ...meta } : { ...c };
                    if (!cardCourse.description) {
                      cardCourse.description = c.rationale || "";
                    }
                    const matchCount = c.matchCount || 0;
                    const matchPct = Number.isFinite(c.matchScore)
                      ? c.matchScore
                      : matchCount > 0
                      ? Math.min(100, Math.round((matchCount / 3) * 100))
                      : 0;
                    return (
                      <div
                        key={itemKey}
                        className="border rounded p-3 bg-white"
                      >
                        <CourseCard
                          course={cardCourse}
                          userRole={user?.role}
                          hideEnroll={true}
                        />
                        {matchCount > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">
                              Phù hợp: {matchCount} chủ đề
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                              <div
                                className="h-2 bg-blue-500"
                                style={{ width: `${matchPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => openExplain(c)}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            Vì sao?
                          </button>
                          <button
                            onClick={() => handleNotInterested(c.id)}
                            className="px-3 py-1 border rounded text-sm"
                          >
                            Không quan tâm
                          </button>
                          <button
                            onClick={() => handleAddToPath(c.id)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                          >
                            Thêm vào lộ trình
                          </button>
                          {/* Removed "Bắt đầu học" button */}
                        </div>
                      </div>
                    );
                  })}
                  {(grouped[s] || []).length === 0 && (
                    <div className="text-gray-500">
                      Chưa có khóa học gợi ý cho bước này.
                    </div>
                  )}
                </div>
              </div>
            ))}

          {/* Selected path */}
          <div className="mt-4 bg-white p-4 rounded border">
            <h4 className="font-semibold mb-2">
              Lộ trình đã lưu {path.length > 0 ? `(${path.length})` : ""}
            </h4>
            {path.length === 0 ? (
              <div className="text-sm text-gray-600">
                Chưa có khóa học nào trong lộ trình. Hãy nhấn “Thêm vào lộ
                trình”.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {path.map((id) => {
                  const c = coursesMeta[id];
                  return (
                    <div
                      key={`saved-${id}`}
                      className="flex items-center justify-between border rounded p-3"
                    >
                      <div className="flex items-center gap-3">
                        {c?.thumbnail_url ? (
                          <img
                            src={c.thumbnail_url}
                            alt={c?.title || `Course ${id}`}
                            className="w-14 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            {id}
                          </div>
                        )}
                        <div>
                          <div className="font-medium line-clamp-1">
                            {c?.title || `Khóa học #${id}`}
                          </div>
                          {c?.category?.name && (
                            <div className="text-xs text-gray-500">
                              Chủ đề: {c.category.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={c ? `/courses/${id}` : `#`}
                          className="px-3 py-1 text-sm border rounded"
                        >
                          Xem
                        </a>
                        <button
                          onClick={() => handleRemoveFromPath(id)}
                          className="px-3 py-1 text-sm border rounded text-red-600"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500 flex flex-col items-center gap-3 p-8">
          <img src="/file.svg" alt="no-path" className="w-32 h-32 opacity-60" />
          <div className="text-lg">Chưa có lộ trình</div>
          <div className="text-sm">
            Hãy nhập mục tiêu và nhấn <strong>Tạo lộ trình</strong>.
          </div>
        </div>
      )}

      {/* Explain modal */}
      {explain && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 max-w-2xl w-full">
            <h3 className="font-semibold text-lg mb-2">Vì sao khóa học này?</h3>
            <p className="text-gray-700 mb-3">{explain.rationale || "N/A"}</p>
            {explain.matchedTopics && (
              <div className="mb-3">
                <div className="text-sm text-gray-500 mb-1">
                  Chủ đề phù hợp:
                </div>
                <div className="flex gap-2 flex-wrap">
                  {explain.matchedTopics.map((t: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 rounded text-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setExplain(null);
                }}
                className="px-4 py-2 border rounded"
              >
                Đóng
              </button>
              {explain?.id ? (
                <button
                  onClick={() => {
                    handleNotInterested(explain.id);
                    setExplain(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Không quan tâm
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
