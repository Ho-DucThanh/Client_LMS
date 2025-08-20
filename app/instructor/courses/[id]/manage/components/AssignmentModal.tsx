"use client";

import React from "react";

interface AssignmentModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  creating: boolean;
  uploadingFiles: boolean;
  assignmentTitle: string;
  setAssignmentTitle: (v: string) => void;
  assignmentDescription: string;
  setAssignmentDescription: (v: string) => void;
  assignmentDueDate: string;
  setAssignmentDueDate: (v: string) => void;
  assignmentMaxPoints: number;
  setAssignmentMaxPoints: (v: number) => void;
  assignmentType: string;
  setAssignmentType: (v: string) => void;
  codeLanguage: string;
  setCodeLanguage: (v: string) => void;
  assignmentContentText: string;
  setAssignmentContentText: (v: string) => void;
  mcqQuestions: {
    question: string;
    options: string[];
    correct_index: number | null;
  }[];
  setMcqQuestions: (
    v: { question: string; options: string[]; correct_index: number | null }[]
  ) => void;
  assignmentFiles: File[];
  setAssignmentFiles: (v: File[]) => void;
  uploadedAttachments: string[];
  editingAssignmentId?: number | null;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  show,
  onClose,
  onSubmit,
  creating,
  uploadingFiles,
  assignmentTitle,
  setAssignmentTitle,
  assignmentDescription,
  setAssignmentDescription,
  assignmentDueDate,
  setAssignmentDueDate,
  assignmentMaxPoints,
  setAssignmentMaxPoints,
  assignmentType,
  setAssignmentType,
  assignmentContentText,
  setAssignmentContentText,
  codeLanguage,
  setCodeLanguage,
  mcqQuestions,
  setMcqQuestions,
  assignmentFiles,
  setAssignmentFiles,
  uploadedAttachments,
  editingAssignmentId,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-2xl ring-1 ring-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {editingAssignmentId ? "Edit Assignment" : "Create Assignment"}
            </h3>
            <p className="text-sm text-gray-500">
              {editingAssignmentId
                ? "Update assignment details"
                : "Add an assignment to the selected lesson"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md bg-gray-100 hover:bg-gray-200 p-2 text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <input
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                placeholder="Title"
                className="border border-gray-200 rounded-md px-3 py-2 w-full bg-white"
              />

              <textarea
                value={assignmentDescription}
                onChange={(e) => setAssignmentDescription(e.target.value)}
                placeholder="Description"
                className="border border-gray-200 rounded-md px-3 py-2 w-full bg-white"
                rows={3}
              />

              {assignmentType === "ESSAY" && (
                <textarea
                  value={assignmentContentText}
                  onChange={(e) => setAssignmentContentText(e.target.value)}
                  placeholder="Essay prompt / instructions"
                  className="border border-gray-200 rounded-md px-3 py-2 w-full bg-white"
                  rows={6}
                />
              )}

              {assignmentType === "MULTIPLE_CHOICE" && (
                <div className="space-y-4">
                  {(mcqQuestions || []).map((q, qIdx) => (
                    <div key={qIdx} className="border rounded-md p-3">
                      <div className="mb-2">
                        <label className="block text-sm text-gray-600 mb-1">
                          Question
                        </label>
                        <input
                          value={q.question}
                          onChange={(e) => {
                            const copy = (mcqQuestions || []).map((x) => ({
                              ...x,
                            }));
                            copy[qIdx].question = e.target.value;
                            setMcqQuestions(copy);
                          }}
                          placeholder={`Question ${qIdx + 1}`}
                          className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Options</div>
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`mcq-correct-${qIdx}`}
                              checked={q.correct_index === oIdx}
                              onChange={() => {
                                const copy = (mcqQuestions || []).map((x) => ({
                                  ...x,
                                }));
                                copy[qIdx].correct_index = oIdx;
                                setMcqQuestions(copy);
                              }}
                            />
                            <input
                              value={opt}
                              onChange={(e) => {
                                const copy = (mcqQuestions || []).map((x) => ({
                                  ...x,
                                }));
                                copy[qIdx].options[oIdx] = e.target.value;
                                setMcqQuestions(copy);
                              }}
                              placeholder={`Option ${oIdx + 1}`}
                              className="flex-1 border border-gray-200 rounded-md px-3 py-2 bg-white"
                            />
                            <button
                              onClick={() => {
                                const copy = (mcqQuestions || []).map((x) => ({
                                  ...x,
                                }));
                                copy[qIdx].options = copy[qIdx].options.filter(
                                  (_, i) => i !== oIdx
                                );
                                // If removed option was the correct index, clear it
                                if (copy[qIdx].correct_index === oIdx)
                                  copy[qIdx].correct_index = null;
                                setMcqQuestions(copy);
                              }}
                              className="px-3 py-1 rounded-md bg-red-600 text-white"
                              title="Remove option"
                            >
                              −
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              const copy = (mcqQuestions || []).map((x) => ({
                                ...x,
                              }));
                              copy[qIdx].options.push("");
                              setMcqQuestions(copy);
                            }}
                            className="px-3 py-1 rounded-md bg-green-600 text-white"
                          >
                            Add option
                          </button>
                          <button
                            onClick={() => {
                              const copy = (mcqQuestions || []).map((x) => ({
                                ...x,
                              }));
                              copy.splice(qIdx, 1);
                              setMcqQuestions(copy);
                            }}
                            className="px-3 py-1 rounded-md bg-red-600 text-white"
                          >
                            Remove question
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <button
                      onClick={() =>
                        setMcqQuestions([
                          ...(mcqQuestions || []),
                          {
                            question: "",
                            options: ["", ""],
                            correct_index: null,
                          },
                        ])
                      }
                      className="px-3 py-1 rounded-md bg-green-600 text-white"
                    >
                      Add question
                    </button>
                    <div className="text-sm text-gray-500 inline-block ml-3">
                      For each question, set options and select the correct
                      option.
                    </div>
                  </div>
                </div>
              )}

              {assignmentType === "FILE_UPLOAD" && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">Attachments</div>
                  <div
                    className="border-2 border-dashed border-gray-200 bg-white rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-gray-300"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const el = document.getElementById(
                          "assignment-file-input"
                        );
                        (el as HTMLInputElement | null)?.click();
                      }
                    }}
                    onClick={() => {
                      const el = document.getElementById(
                        "assignment-file-input"
                      );
                      (el as HTMLInputElement | null)?.click();
                    }}
                  >
                    <input
                      id="assignment-file-input"
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setAssignmentFiles([...assignmentFiles, ...files]);
                        try {
                          (e.target as HTMLInputElement).value = "";
                        } catch {}
                      }}
                      className="hidden"
                    />
                    <div className="text-gray-500">
                      Drop files here or click to upload
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Supported: any common document or archive
                    </div>
                  </div>

                  <div className="space-y-1">
                    {assignmentFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="text-sm text-gray-700">{f.name}</div>
                        <button
                          onClick={() => {
                            const updated = assignmentFiles.filter(
                              (_, j) => j !== i
                            );
                            setAssignmentFiles(updated);
                          }}
                          className="text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {uploadedAttachments.length > 0 && (
                      <div className="text-sm text-green-700">
                        Uploaded: {uploadedAttachments.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {assignmentType === "CODE" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Language
                    </label>
                    <input
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      placeholder="javascript, python, java ..."
                      className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Code template / instructions
                    </label>
                    <textarea
                      value={assignmentContentText}
                      onChange={(e) => setAssignmentContentText(e.target.value)}
                      placeholder="Starter code, instructions or tests"
                      className="border border-gray-200 rounded-md px-3 py-2 w-full bg-white"
                      rows={8}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Due date
                </label>
                <input
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Max points
                </label>
                <input
                  type="number"
                  value={assignmentMaxPoints}
                  onChange={(e) =>
                    setAssignmentMaxPoints(Number(e.target.value))
                  }
                  className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  value={assignmentType}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white"
                >
                  <option value="ESSAY">ESSAY</option>
                  <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
                  <option value="FILE_UPLOAD">FILE_UPLOAD</option>
                  <option value="CODE">CODE</option>
                </select>
              </div>

              <div className="flex flex-col-reverse md:flex-col gap-3 mt-2">
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md"
                  disabled={creating || uploadingFiles}
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md"
                  disabled={creating || uploadingFiles}
                >
                  {creating || uploadingFiles
                    ? editingAssignmentId
                      ? "Saving..."
                      : "Creating..."
                    : editingAssignmentId
                    ? "Save"
                    : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
