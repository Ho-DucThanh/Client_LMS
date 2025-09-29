"use client";
import React, { useState } from "react";
import { apiService } from "../services/api";

const levels = ["Beginner", "Intermediate", "Advanced"];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [prefs, setPrefs] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const preferences = prefs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiService.generateRecommendation({
        goal,
        currentLevel: level,
        preferences,
      });
      setRecommendation(res);
      setStep(3);
    } catch (e: any) {
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1)
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Chào mừng! Cho chúng tôi biết mục tiêu của bạn</h2>
        <p className="text-gray-600 mb-6">Chọn cấp độ và nhập mục tiêu để nhận lộ trình học và khóa học phù hợp.</p>
        <label className="block mb-2 font-medium">Mục tiêu (goal)</label>
        <input value={goal} onChange={(e)=>setGoal(e.target.value)} className="w-full border p-3 rounded mb-4" placeholder="Ví dụ: Học Frontend để đi thực tập" />

        <label className="block mb-2 font-medium">Cấp độ</label>
        <div className="flex gap-3 mb-4">
          {levels.map(l => (
            <button key={l} onClick={()=>setLevel(l)} className={`px-4 py-2 rounded ${level===l? 'bg-blue-600 text-white':'border'}`}>{l}</button>
          ))}
        </div>

        <label className="block mb-2 font-medium">Sở thích / Công nghệ (phân cách bằng dấu phẩy)</label>
        <input value={prefs} onChange={(e)=>setPrefs(e.target.value)} className="w-full border p-3 rounded mb-6" placeholder="Ví dụ: React, Tailwind, Project-based" />

        <div className="flex justify-end">
          <button onClick={()=>setStep(2)} className="px-6 py-3 bg-gray-100 rounded">Tiếp</button>
        </div>
      </div>
    );

  if (step === 2)
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 mt-8">
        <h2 className="text-2xl font-bold mb-4">Xác nhận</h2>
        <p className="mb-4"><strong>Goal:</strong> {goal}</p>
        <p className="mb-4"><strong>Level:</strong> {level}</p>
        <p className="mb-6"><strong>Preferences:</strong> {prefs}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={()=>setStep(1)} className="px-6 py-3 border rounded">Quay lại</button>
          <button onClick={submit} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded">{loading? 'Đang xử lý...': 'Nhận lộ trình'}</button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-4">Gợi ý lộ trình & khóa học</h2>
        <p className="text-gray-600 mb-4">Dưới đây là các khóa học phù hợp được đề xuất:</p>

        {recommendation?.courses?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendation.courses.map((c: any) => (
              <div key={c.id} className="border rounded p-4 flex items-start gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded" />
                <div>
                  <h3 className="font-semibold">Khóa học {c.id}</h3>
                  <p className="text-sm text-gray-600">Stage: {c.stage} • Matches: {c.matchCount}</p>
                  <p className="mt-2 text-sm text-gray-700">{c.rationale}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded">Xem</button>
                    <button className="px-3 py-1 border rounded">Ghi danh</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Không tìm thấy khóa học phù hợp. Chúng tôi sẽ cập nhật sau.</p>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={()=>{setStep(1); setRecommendation(null);}} className="px-4 py-2 border rounded">Làm lại</button>
        </div>
      </div>
    </div>
  );
}
