"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const STAGES = ["FOUNDATION", "INTERMEDIATE", "ADVANCED"];
const STAGE_LABELS: Record<string, string> = {
  FOUNDATION: "Nền tảng",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
  // SPECIALIZATION removed per requirement
};

// Split layout version of learning path (Q&A left, results right)
export default function LearningPathSplit() {
  const { user } = useAuth();
  // Persisted session state key (per user)
  const storageKey = useMemo(
    () => (user?.id ? `lp:state:${user.id}` : `lp:state:guest`),
    [user?.id]
  );
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Mới bắt đầu");
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
  const [answer, setAnswer] = useState<string | null>(null);
  // Beginner flow states
  const [beginnerFlow, setBeginnerFlow] = useState(false); // whether user is in interactive clarification mode
  const [beginnerClarifications, setBeginnerClarifications] = useState<
    { id: number; question: string; answer: string }[]
  >([]);
  const [beginnerInput, setBeginnerInput] = useState("");
  const [beginnerCounter, setBeginnerCounter] = useState(0);
  const [beginnerFinalizing, setBeginnerFinalizing] = useState(false);

  // Hydrate from sessionStorage so data persists when navigating away/back
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return;
      const s = JSON.parse(raw || "null");
      if (!s || typeof s !== "object") return;
      if (typeof s.goal === "string") setGoal(s.goal);
      if (typeof s.level === "string") setLevel(s.level);
      if (s.mode === "guided" || s.mode === "direct") setMode(s.mode);
      if (typeof s.chatMode === "boolean") setChatMode(s.chatMode);
      if (typeof s.prefs === "string") setPrefs(s.prefs);
      if (Array.isArray(s.prefTags)) setPrefTags(s.prefTags);
      if (s.rec) setRec(s.rec);
      if (s.coursesMeta) setCoursesMeta(s.coursesMeta);
      if (s.notInterested) setNotInterested(s.notInterested);
      if (Array.isArray(s.path)) setPath(s.path);
      if (typeof s.showCareers === "boolean") setShowCareers(s.showCareers);
      if (typeof s.showStages === "boolean") setShowStages(s.showStages);
      if (typeof s.answer === "string") setAnswer(s.answer);
      if (typeof s.beginnerFlow === "boolean") setBeginnerFlow(s.beginnerFlow);
      if (Array.isArray(s.beginnerClarifications))
        setBeginnerClarifications(s.beginnerClarifications);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const dump = {
        goal,
        level,
        mode,
        chatMode,
        prefs,
        prefTags,
        rec,
        coursesMeta,
        notInterested,
        path,
        showCareers,
        showStages,
        answer,
        beginnerFlow,
        beginnerClarifications,
      };
      window.sessionStorage.setItem(storageKey, JSON.stringify(dump));
    } catch {}
  }, [
    storageKey,
    goal,
    level,
    mode,
    chatMode,
    prefs,
    prefTags,
    rec,
    coursesMeta,
    notInterested,
    path,
    showCareers,
    showStages,
    answer,
    beginnerFlow,
    beginnerClarifications,
  ]);

  // hydrate saved path
  useEffect(() => {
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
        }
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
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

  const beginnerPreset =
    "Tôi là người mới, tôi muốn bắt đầu học lập trình nhưng không biết bắt đầu từ đâu, hãy giúp tôi.";

  const advancedHints = [
    "Nâng cao kỹ năng React và tối ưu hiệu năng",
    "Chuẩn bị cho phỏng vấn backend Node.js",
    "Học chuyên sâu về hệ thống phân tán",
  ];

  const generate = async () => {
    if (!goal.trim()) return setError("Vui lòng nhập mục tiêu học tập");
    // Prevent accidental generation during beginner clarification phase
    if (beginnerFlow && !beginnerFinalizing) {
      setError(
        "Bạn đang ở chế độ hỏi đáp cho người mới. Nhấn 'Tôi đã rõ, tạo lộ trình' để sinh lộ trình."
      );
      return;
    }
    setError(null);
    setLoading(true);
    setAnswer(null);
    try {
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
      const meta: Record<number, any> = {};
      const byStage = data?.courses_by_stage || null;
      if (byStage) {
        for (const stage of Object.keys(byStage)) {
          for (const item of byStage[stage] || []) {
            if (item && item.id) meta[item.id] = { ...item };
          }
        }
      }
      setCoursesMeta(meta);
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
    if (rec.courses_by_stage) {
      for (const s of STAGES) {
        const list = rec.courses_by_stage[s] || [];
        const seen = new Set<number>();
        map[s] = list
          .filter((it: any) => it && it.id && !notInterested[it.id])
          .filter((it: any) => {
            if (seen.has(it.id)) return false;
            seen.add(it.id);
            return true;
          })
          .slice(0, 3);
      }
    }
    return map;
  }, [rec, notInterested]);

  const handleNotInterested = (courseId: number) => {
    setNotInterested((s) => ({ ...s, [courseId]: true }));
  };
  const handleAddToPath = (courseId: number) => {
    setPath((p) => (p.includes(courseId) ? p : [...p, courseId]));
  };
  const handleRemoveFromPath = (courseId: number) => {
    setPath((p) => p.filter((id) => id !== courseId));
  };
  const openExplain = (course: any) => setExplain(course);

  // (đã bỏ builder cục bộ; phần giải đáp sẽ gọi API /recommendations/clarify ở backend)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x">
        {/* LEFT: Q&A Panels */}
        <div className="p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Lộ trình học tập cá nhân
            </h2>
            <p className="text-sm text-gray-600">
              Chọn tình trạng hiện tại của bạn và đặt mục tiêu để nhận đề xuất
              phù hợp.
            </p>
          </div>

          {/* Beginner Section */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-800">Người mới bắt đầu</h3>
              {!beginnerFlow && (
                <button
                  onClick={() => {
                    setMode("guided");
                    if (!goal.trim()) setGoal(beginnerPreset);
                    setLevel("Mới bắt đầu");
                    setPrefTags([]);
                    setPrefs("");
                    setBeginnerFlow(true);
                    setError(null);
                  }}
                  className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Bắt đầu hỏi đáp
                </button>
              )}
              {beginnerFlow && (
                <button
                  onClick={() => {
                    // reset beginner clarification
                    setBeginnerFlow(false);
                    setBeginnerClarifications([]);
                    setBeginnerInput("");
                    setBeginnerFinalizing(false);
                    setError(null);
                  }}
                  className="text-xs px-3 py-1 rounded border border-blue-400 text-blue-700 hover:bg-blue-100 bg-white"
                >
                  Hủy chế độ
                </button>
              )}
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              Nếu bạn chưa rõ nên học gì trước, hãy dùng mẫu này. Hệ thống sẽ
              gợi ý các khái niệm nền tảng và lộ trình tuần tự.
            </p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
              <li>Thiết lập tư duy và công cụ cơ bản</li>
              <li>Nắm các khái niệm cốt lõi: biến, hàm, cấu trúc điều khiển</li>
              <li>Làm quen mô hình client - server & web cơ bản</li>
            </ul>
            {!beginnerFlow && (
              <button
                onClick={() => {
                  if (!goal.trim()) setGoal(beginnerPreset);
                  setBeginnerFinalizing(true); // allow generation directly
                  generate();
                  setBeginnerFinalizing(false);
                }}
                disabled={loading}
                className="w-full mt-2 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Đang tạo..." : "Tạo lộ trình ngay"}
              </button>
            )}
            {beginnerFlow && (
              <div className="space-y-3 mt-2">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Bước hỏi đáp làm rõ ({beginnerClarifications.length} câu hỏi)
                </div>
                <div className="rounded border border-blue-300 bg-white p-3 space-y-2 max-h-56 overflow-auto text-xs">
                  {beginnerClarifications.length === 0 && (
                    <div className="text-blue-600/70 italic">
                      Chưa có câu hỏi. Hãy đặt câu hỏi ví dụ: "Mình nên bắt đầu
                      với ngôn ngữ nào?"
                    </div>
                  )}
                  {beginnerClarifications.map((c) => (
                    <div key={c.id} className="space-y-1">
                      <div className="font-medium text-blue-800">
                        • Bạn: {c.question}
                      </div>
                      <div className="pl-3 text-gray-700 whitespace-pre-line">
                        Hệ thống: {c.answer}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={beginnerInput}
                    onChange={(e) => setBeginnerInput(e.target.value)}
                    placeholder="Đặt câu hỏi (VD: Nên học front-end hay back-end trước?)"
                    rows={2}
                    className="w-full border rounded px-3 py-2 text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const q = beginnerInput.trim();
                        if (!q) return;
                        const localId = beginnerCounter + 1;
                        // push placeholder while waiting
                        setBeginnerClarifications((arr) => [
                          ...arr,
                          {
                            id: localId,
                            question: q,
                            answer: "Đang trả lời...",
                          },
                        ]);
                        setBeginnerCounter((n) => n + 1);
                        setBeginnerInput("");
                        setError(null);
                        try {
                          const preferences =
                            prefTags && prefTags.length > 0
                              ? prefTags.slice()
                              : (prefs || "")
                                  .split(/[,|]/)
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                          const context = {
                            goal,
                            currentLevel: level,
                            preferences,
                            history: beginnerClarifications,
                          };
                          const res = await apiService.clarifyRecommendation({
                            question: q,
                            context,
                          });
                          const ans =
                            (res && (res.answer || res.data?.answer)) || "";
                          setBeginnerClarifications((arr) =>
                            arr.map((c) =>
                              c.id === localId
                                ? { ...c, answer: ans || "(Không có nội dung)" }
                                : c
                            )
                          );
                        } catch (e: any) {
                          const msg = e?.message || "Lỗi khi gọi API clarify";
                          setBeginnerClarifications((arr) =>
                            arr.map((c) =>
                              c.id === localId
                                ? { ...c, answer: `Lỗi: ${msg}` }
                                : c
                            )
                          );
                        }
                      }}
                      disabled={!beginnerInput.trim()}
                      className="px-4 py-2 text-xs font-medium rounded bg-blue-600 text-white disabled:opacity-50"
                    >
                      Hỏi
                    </button>
                    <button
                      onClick={() => {
                        setBeginnerFinalizing(true);
                        setTimeout(() => {
                          generate();
                          setBeginnerFinalizing(false);
                        }, 0);
                      }}
                      disabled={loading || beginnerClarifications.length === 0}
                      className="flex-1 px-4 py-2 text-xs font-medium rounded bg-green-600 text-white disabled:opacity-50"
                    >
                      Tôi đã rõ, tạo lộ trình
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      "Nên học ngôn ngữ nào đầu tiên?",
                      "Học bao lâu mỗi ngày?",
                      "Có cần học toán nhiều?",
                      "Frontend hay Backend trước?",
                      "Cách duy trì động lực?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setBeginnerInput(s)}
                        className="px-2 py-1 rounded border border-blue-300 bg-white text-[11px] hover:bg-blue-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-blue-600/70">
                    Khi bạn hài lòng với phần hỏi đáp, nhấn "Tôi đã rõ, tạo lộ
                    trình" để sinh các khóa học đề xuất.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Experienced Section */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-emerald-800">
                Đã có kiến thức cơ bản
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("guided")}
                  className={`text-xs px-3 py-1 rounded border ${
                    mode === "guided"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-emerald-700 border-emerald-300"
                  }`}
                >
                  Hướng dẫn
                </button>
                <button
                  onClick={() => setMode("direct")}
                  className={`text-xs px-3 py-1 rounded border ${
                    mode === "direct"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-emerald-700 border-emerald-300"
                  }`}
                >
                  Nhanh
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Mục tiêu cụ thể (VD: Học chuyên sâu React hiệu năng)"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option>Mới bắt đầu</option>
                  <option>Trung cấp</option>
                  <option>Nâng cao</option>
                </select>
                <label className="inline-flex items-center gap-2 text-xs text-emerald-700">
                  <input
                    type="checkbox"
                    checked={chatMode}
                    onChange={(e) => setChatMode(e.target.checked)}
                  />
                  Chế độ chat
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-emerald-700">
                  Thẻ sở thích
                </label>
                <div className="border rounded p-2 flex flex-wrap gap-2 bg-white">
                  {prefTags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1"
                    >
                      {t}
                      <button
                        onClick={() =>
                          setPrefTags((s) => s.filter((x) => x !== t))
                        }
                        className="text-emerald-500 hover:text-emerald-700"
                      >
                        ×
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
                    placeholder="Nhập thẻ và Enter"
                    className="flex-1 min-w-[120px] text-xs outline-none"
                  />
                </div>
              </div>
              <input
                value={prefs}
                onChange={(e) => setPrefs(e.target.value)}
                placeholder="Hoặc nhập CSV: react,performance,testing"
                className="w-full border rounded px-3 py-2 text-xs"
              />

              <div className="space-y-2">
                <div className="text-xs font-medium text-emerald-700">
                  Gợi ý nâng cao:
                </div>
                <div className="flex flex-wrap gap-2">
                  {advancedHints.map((h) => (
                    <button
                      key={h}
                      onClick={() => setGoal(h)}
                      className="px-2 py-1 text-xs rounded border border-emerald-300 bg-white hover:bg-emerald-50"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={generate}
                  disabled={loading || !goal.trim()}
                  className="flex-1 px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? "Đang tạo..." : "Tạo lộ trình"}
                </button>
                {chatMode && rec && (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      placeholder="Hỏi thêm (VD: Thêm DevOps?)"
                      className="flex-1 border rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={async () => {
                        if (!followUp.trim() || !rec?.id) return;
                        const res = await apiService.followUpRecommendation(
                          rec.id,
                          followUp
                        );
                        setAnswer(res?.answer || "");
                      }}
                      className="px-3 py-1 text-xs rounded bg-emerald-500 text-white"
                      disabled={!followUp.trim()}
                    >
                      Hỏi
                    </button>
                  </div>
                )}
              </div>
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="p-6 space-y-6 relative min-h-[600px]">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <div className="text-sm text-gray-700">
                  Đang tạo lộ trình...
                </div>
              </div>
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">
            Kết quả & Gợi ý
          </h3>
          {answer && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-gray-700">
              {answer}
            </div>
          )}
          {!rec && !loading && !beginnerFlow && (
            <div className="text-gray-500 text-sm bg-gray-50 border rounded p-6 text-center">
              Chưa có dữ liệu. Hãy tạo lộ trình ở panel bên trái.
            </div>
          )}
          {!rec && !loading && beginnerFlow && (
            <div className="space-y-4 bg-blue-50/40 border border-blue-200 rounded p-5 text-sm">
              <div className="font-semibold text-blue-800">
                Chế độ hỏi đáp dành cho người mới
              </div>
              {beginnerClarifications.length === 0 ? (
                <div className="text-blue-700/80">
                  Đặt một vài câu hỏi ở panel bên trái để hệ thống giúp bạn làm
                  rõ mục tiêu trước khi tạo lộ trình.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wide text-blue-600 font-medium">
                    Tóm tắt trao đổi ({beginnerClarifications.length} câu)
                  </div>
                  <ul className="space-y-2 max-h-64 overflow-auto pr-1">
                    {beginnerClarifications.map((c) => (
                      <li
                        key={c.id}
                        className="bg-white rounded border border-blue-100 p-2 text-xs"
                      >
                        <div className="font-medium text-blue-800">
                          Bạn: {c.question}
                        </div>
                        <div className="text-gray-700 mt-0.5 whitespace-pre-line">
                          Gợi ý: {c.answer}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-blue-700">
                    Khi cảm thấy đủ rõ, quay lại panel trái và nhấn "Tôi đã rõ,
                    tạo lộ trình".
                  </div>
                </div>
              )}
            </div>
          )}
          {rec && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Bạn có thể lưu lại lộ trình hiện tại để xem lại sau.
                </div>
                <button
                  onClick={async () => {
                    if (!rec?.id) return;
                    try {
                      // build selected list from "path" if any, else all suggested course ids by stage
                      const selected = path.length
                        ? path
                        : Object.values(grouped)
                            .flat()
                            .map((c: any) => c.id)
                            .filter(
                              (id, idx, arr) => id && arr.indexOf(id) === idx
                            );
                      if (!selected.length) {
                        setError("Chưa có khóa học nào để lưu trong lộ trình.");
                        return;
                      }
                      const defaultName = `${STAGE_LABELS.FOUNDATION} → ${
                        STAGE_LABELS.ADVANCED
                      } | ${new Date().toLocaleDateString()}`;
                      const res = await apiService.saveLearningPath(rec.id, {
                        name: `Lộ trình của tôi - ${defaultName}`,
                        selectedCourseIds: selected,
                      });
                      // Feedback: replace error with success info in 'answer' panel
                      setAnswer(
                        `Đã lưu lộ trình (#${
                          res?.id || ""
                        }). Bạn có thể xem lại trong mục Lộ trình đã lưu.`
                      );
                    } catch (e: any) {
                      setError(e?.message || "Không thể lưu lộ trình");
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  Lưu lộ trình
                </button>
              </div>
              {Array.isArray(rec.concepts) && rec.concepts.length > 0 && (
                <div className="bg-white border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Khái niệm cốt lõi</h4>
                    <span className="text-xs text-gray-500">
                      {rec.concepts.length} mục
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rec.concepts.slice(0, 6).map((c: any, i: number) => (
                      <div key={i} className="p-3 rounded bg-gray-50">
                        <div className="font-medium text-sm">{c.name}</div>
                        {c.short && (
                          <div className="text-xs text-gray-600 mt-1">
                            {c.short}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(rec.careers) && rec.careers.length > 0 && (
                <div className="bg-white border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Lộ trình nghề nghiệp</h4>
                    <button
                      onClick={() => setShowCareers((v) => !v)}
                      className="text-xs text-blue-600 underline"
                    >
                      {showCareers ? "Thu gọn" : "Xem chi tiết"}
                    </button>
                  </div>
                  {showCareers ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {rec.careers.slice(0, 9).map((c: any, i: number) => (
                        <div key={i} className="p-3 rounded bg-gray-50">
                          <div className="font-medium text-sm">{c.name}</div>
                          {c.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {c.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      Gợi ý các hướng: Web, Mobile, Data, DevOps... Nhấn "Xem
                      chi tiết".
                    </div>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {STAGES.map((s, idx) => (
                    <div key={s} className="flex-1 text-center">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">
                        Bước {idx + 1}
                      </div>
                      <div className="mt-1 font-semibold text-sm">
                        {STAGE_LABELS[s]}
                      </div>
                      <div className="h-1 bg-gray-200 mt-2 rounded" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowStages((v) => !v)}
                    className="text-xs text-blue-600 underline"
                  >
                    {showStages ? "Thu gọn lộ trình" : "Xem lộ trình"}
                  </button>
                </div>
                {showStages && (
                  <div className="space-y-5">
                    {STAGES.map((s) => (
                      <div
                        key={s}
                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-base text-gray-900">
                            {STAGE_LABELS[s]}
                          </h5>
                          <span className="text-xs text-gray-500">
                            {(grouped[s] || []).length} khóa học
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {(grouped[s] || []).map((c: any, idx: number) => {
                            const meta = coursesMeta[c.id] || c;
                            const key = `course-${c.id}-${idx}`;
                            const matchCount = c.matchCount || 0;
                            const matchPct = Number.isFinite(c.matchScore)
                              ? Math.max(
                                  0,
                                  Math.min(100, Math.round(c.matchScore))
                                )
                              : matchCount > 0
                              ? Math.min(
                                  100,
                                  Math.round((matchCount / 3) * 100)
                                )
                              : 0;
                            const title = meta?.title || `Khóa học #${c.id}`;
                            const subtitle =
                              meta?.subtitle || meta?.short_description || "";
                            const tags: string[] = Array.isArray(
                              c.matchedTopics
                            )
                              ? c.matchedTopics
                              : Array.isArray(meta?.tags)
                              ? meta.tags
                              : Array.isArray(meta?.topics)
                              ? meta.topics
                              : [];
                            return (
                              <div
                                key={key}
                                className="group h-full flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition"
                              >
                                <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                                  {meta?.thumbnail_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={meta.thumbnail_url}
                                      alt={title}
                                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                                      Không có ảnh
                                    </div>
                                  )}
                                  <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                    {STAGE_LABELS[s]}
                                  </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                  <div className="min-h-[52px]">
                                    <div
                                      className="font-semibold text-base text-gray-900 leading-snug line-clamp-2"
                                      title={title}
                                    >
                                      {title}
                                    </div>
                                    {subtitle && (
                                      <div className="mt-1 text-sm text-gray-600 line-clamp-2">
                                        {subtitle}
                                      </div>
                                    )}
                                  </div>
                                  {tags && tags.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {tags
                                        .slice(0, 3)
                                        .map((t: string, i: number) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                  {matchCount > 0 && (
                                    <div className="mt-4">
                                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                        <span>
                                          Phù hợp: {matchCount} chủ đề
                                        </span>
                                        <span>{matchPct}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600"
                                          style={{ width: `${matchPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-4 flex items-center gap-2 pt-1">
                                    <Link
                                      href={`/courses/${c.id}`}
                                      className="flex-1 text-center rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-2.5 hover:bg-blue-700 shadow-sm"
                                    >
                                      View Details
                                    </Link>
                                    <button
                                      onClick={() => handleAddToPath(c.id)}
                                      className="px-2.5 py-1.5 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600"
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {(grouped[s] || []).length === 0 && (
                            <div className="text-xs text-gray-500">
                              Chưa có gợi ý ở bước này.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Saved path */}
              <div className="bg-white border rounded p-4">
                <h4 className="font-semibold text-sm mb-2">
                  Lộ trình đã lưu {path.length ? `(${path.length})` : ""}
                </h4>
                {path.length === 0 ? (
                  <div className="text-xs text-gray-600">
                    Chưa có khóa học nào. Nhấn "Lưu" trên khóa học.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {path.map((id) => {
                      const c = coursesMeta[id];
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between border rounded px-2 py-2 bg-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            {c?.thumbnail_url ? (
                              <img
                                src={c.thumbnail_url}
                                alt={c?.title || `Course ${id}`}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-white rounded border text-[10px] flex items-center justify-center text-gray-400">
                                {id}
                              </div>
                            )}
                            <div className="text-[11px] font-medium line-clamp-2 max-w-[140px]">
                              {c?.title || `Khóa học #${id}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={c ? `/courses/${id}` : `#`}
                              className="px-2 py-0.5 text-[11px] border rounded"
                            >
                              Xem
                            </a>
                            <button
                              onClick={() => handleRemoveFromPath(id)}
                              className="px-2 py-0.5 text-[11px] border rounded text-red-600"
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
          )}
        </div>
      </div>

      {/* Explain Modal */}
      {explain && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl">
            <h3 className="font-semibold text-lg mb-2">Vì sao khóa học này?</h3>
            <p className="text-sm text-gray-700 mb-3">
              {explain.rationale || "N/A"}
            </p>
            {explain.matchedTopics && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">
                  Chủ đề phù hợp:
                </div>
                <div className="flex flex-wrap gap-1">
                  {explain.matchedTopics.map((t: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setExplain(null)}
                className="px-4 py-2 text-sm border rounded"
              >
                Đóng
              </button>
              {explain?.id && (
                <button
                  onClick={() => {
                    handleNotInterested(explain.id);
                    setExplain(null);
                  }}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded"
                >
                  Ẩn gợi ý này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
