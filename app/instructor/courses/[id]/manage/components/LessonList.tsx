import React from "react";

interface LessonListProps {
  lessons: any[];
  completedByLesson: Record<number, boolean>;
  assignmentsByLesson: Record<number, any[]>;
  onAddAssignment: (lessonId: number) => void;
  onEditAssignment?: (assignment: any, lessonId: number) => void;
  onDeleteAssignment?: (assignmentId: number, lessonId: number) => void;
  moveLesson: (lessonId: number, dir: "up" | "down") => void;
  editLesson: (lesson: any) => void;
  deleteLesson: (lessonId: number) => void;
}

const LessonList: React.FC<LessonListProps> = ({
  lessons,
  completedByLesson,
  assignmentsByLesson,
  onAddAssignment,
  onEditAssignment,
  onDeleteAssignment,
  moveLesson,
  editLesson,
  deleteLesson,
}) => (
  <>
    {lessons.length === 0 ? (
      <div className="text-gray-600">Chưa có bài học</div>
    ) : (
      <ul className="space-y-4">
        {lessons.map((l: any, i: number) => (
          <li
            key={l.id}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center font-semibold">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-lg">
                      {l.title}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                      <span className="uppercase text-xs tracking-wide text-gray-600">
                        {l.type}
                      </span>
                      {completedByLesson[l.id] && (
                        <span className="text-green-700 text-xs">
                          • học viên đã hoàn thành
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={() => moveLesson(l.id, "up")}
                    disabled={i === 0}
                    className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Di chuyển lên"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveLesson(l.id, "down")}
                    disabled={i === lessons.length - 1}
                    className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Di chuyển xuống"
                  >
                    ↓
                  </button>
                </div>
                <button
                  onClick={() => onAddAssignment(l.id)}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm"
                >
                  Thêm bài tập
                </button>
                <button
                  onClick={() => editLesson(l)}
                  className="px-3 py-1 text-sm rounded-md border bg-white hover:bg-gray-50"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => deleteLesson(l.id)}
                  className="px-3 py-1 text-sm rounded-md border text-red-600 bg-white hover:bg-gray-50"
                >
                  Xóa
                </button>
              </div>
            </div>

            <div className="mt-4">
              {(assignmentsByLesson[l.id] || []).length === 0 ? (
                <div className="text-sm text-gray-500">Chưa có bài tập</div>
              ) : (
                <ul className="space-y-2">
                  {(assignmentsByLesson[l.id] || []).map((a: any) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-md"
                    >
                      <div>
                        <div className="font-medium text-gray-800">
                          {a.title}
                        </div>
                        <div className="text-gray-500">
                          Tối đa: {a.max_score} • Hạn: {""}
                          {new Date(a.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            onEditAssignment && onEditAssignment(a, l.id)
                          }
                          className="px-3 py-1 text-sm rounded-md border bg-white hover:bg-gray-50"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() =>
                            onDeleteAssignment && onDeleteAssignment(a.id, l.id)
                          }
                          className="px-3 py-1 text-sm rounded-md border text-red-600 bg-white hover:bg-gray-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </>
);

export default LessonList;
