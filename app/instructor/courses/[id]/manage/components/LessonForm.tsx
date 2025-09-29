import React from "react";

interface LessonFormProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  creating: boolean;
  lessonTitle: string;
  setLessonTitle: (v: string) => void;
  lessonDescription: string;
  setLessonDescription: (v: string) => void;
  lessonType: string;
  setLessonType: (v: string) => void;
  lessonContent: string;
  setLessonContent: (v: string) => void;
  lessonVideo: File | null;
  setLessonVideo: (v: File | null) => void;
  lessonVideoUrl: string;
  setLessonVideoUrl: (v: string) => void;
  lessonDuration: number;
  setLessonDuration: (v: number) => void;
  lessonIsFree: boolean;
  setLessonIsFree: (v: boolean) => void;
  handleLessonVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  successMessage: string;
}

const LessonForm: React.FC<LessonFormProps> = ({
  show,
  onClose,
  onSubmit,
  creating,
  lessonTitle,
  setLessonTitle,
  lessonDescription,
  setLessonDescription,
  lessonType,
  setLessonType,
  lessonContent,
  setLessonContent,
  lessonVideo,
  setLessonVideo,
  lessonVideoUrl,
  setLessonVideoUrl,
  lessonDuration,
  setLessonDuration,
  lessonIsFree,
  setLessonIsFree,
  handleLessonVideoChange,
  successMessage,
}) => {
  if (!show) return null;
  return (
    <div className="mb-4 bg-white border border-gray-100 rounded-lg p-5 relative shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Tạo / Chỉnh sửa bài học
          </h3>
          <p className="text-sm text-gray-500">
            Thêm thông tin bài học và tùy chọn tải video
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Thời lượng: {lessonDuration || 0} phút
        </div>
      </div>
      {creating && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin h-6 w-6 text-gray-700"
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
            <span className="text-gray-700">Processing...</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input
          value={lessonTitle}
          onChange={(e) => setLessonTitle(e.target.value)}
          placeholder="Tiêu đề bài học"
          className="border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          disabled={creating}
        />
        <input
          value={lessonDescription}
          onChange={(e) => setLessonDescription(e.target.value)}
          placeholder="Mô tả bài học"
          className="border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          disabled={creating}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <select
          value={lessonType}
          onChange={(e) => setLessonType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={creating}
        >
          <option value="TEXT">TEXT</option>
          <option value="VIDEO">VIDEO</option>
          <option value="QUIZ">QUIZ</option>
          <option value="PDF">PDF</option>
          <option value="LINK">LINK</option>
        </select>
        <input
          type="number"
          value={lessonDuration}
          onChange={(e) => setLessonDuration(Number(e.target.value))}
          placeholder="Thời lượng (phút)"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100"
          disabled={creating}
        />
      </div>
      <div className="mb-3">
        <textarea
          value={lessonContent}
          onChange={(e) => setLessonContent(e.target.value)}
          placeholder="Nội dung bài học (markdown/html)"
          className="border border-gray-200 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          rows={4}
          disabled={creating}
        />
      </div>
      {lessonType === "VIDEO" && (
        <div className="mb-3">
          <label className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100">
            <input
              type="file"
              accept="video/*"
              onChange={handleLessonVideoChange}
              className="hidden"
              disabled={creating}
            />
            <span className="text-sm text-gray-700">Tải video</span>
          </label>
          {lessonVideoUrl && (
            <div className="mt-3">
              <video
                src={lessonVideoUrl}
                controls
                width={360}
                className="rounded-md shadow-sm"
              />
            </div>
          )}
        </div>
      )}
      {successMessage && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-green-800 rounded-md">
          {successMessage}
        </div>
      )}
      <div className="mb-2 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lessonIsFree}
            onChange={(e) => setLessonIsFree(e.target.checked)}
            className="rounded"
            disabled={creating}
          />
          <span className="text-gray-700">Bài học miễn phí</span>
        </label>
        <button
          onClick={onSubmit}
          disabled={creating}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-md shadow-sm flex items-center"
        >
          {creating ? (
            <>
              <svg
                className="animate-spin h-4 w-4 mr-2 text-white"
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
              Đang lưu...
            </>
          ) : (
            "Lưu"
          )}
        </button>
        <button
          onClick={onClose}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md"
          disabled={creating}
        >
          Hủy
        </button>
      </div>
    </div>
  );
};

export default LessonForm;
