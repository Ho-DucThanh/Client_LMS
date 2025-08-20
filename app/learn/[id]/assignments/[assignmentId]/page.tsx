"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Heading from "../../../../utils/Heading";
import Header from "../../../../components/Header";
import { assignmentService } from "../../../../services/api-assignment";
import { lessonService } from "../../../../services/api-lessons";
import { uploadService } from "../../../../services/api-upload";
import { toast } from "react-hot-toast";

export default function AssignmentPage() {
  const params = useParams() as any;
  const router = useRouter();
  const courseId = Number(params.id);
  const assignmentId = Number(
    params.assignmentId || params.assignment_id || params.assignmentId
  );

  const [assignment, setAssignment] = useState<any | null>(null);
  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await assignmentService.getAssignment(assignmentId);
        const a = (res as any).data || res;
        setAssignment(a);
        if (a?.lesson_id) {
          try {
            const lr = await lessonService.getLesson(a.lesson_id);
            const l = (lr as any).data || lr;
            setLesson(l);
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load assignment", err);
        toast.error("Failed to load assignment");
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    try {
      // for file upload submissions, upload file first and send file_url
      if (assignment.type === "FILE_UPLOAD") {
        if (!file) {
          toast.error("Please attach a file");
          setSubmitting(false);
          return;
        }
        const upl = await uploadService.uploadAssignmentFile(file);
        const fileUrl =
          (upl && (upl as any).url) ||
          (upl as any).file_url ||
          (upl as any)?.data?.url ||
          upl;
        await assignmentService.submitAssignment(assignment.id, {
          file_url: fileUrl,
        });
      } else {
        // ESSAY, CODE, MULTIPLE_CHOICE (for MCQ we send content string or JSON?)
        // For simplicity, send answer in 'content' field as string
        await assignmentService.submitAssignment(assignment.id, {
          content: answerText,
        });
      }
      toast.success("Submission uploaded successfully");
      router.back();
    } catch (err) {
      console.error("Failed to submit assignment", err);
      toast.error(
        "Failed to submit assignment: " + ((err as any)?.message || err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!assignment) return <div className="p-6">Assignment not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title={assignment.title || "Assignment"}
        description="Submit your work"
        keywords="assignment"
      />
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-md shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">{assignment.title}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {assignment.description}
            </p>
            <div className="mb-4">
              <div className="text-xs text-gray-500">Due date</div>
              <div className="text-sm">
                {assignment.due_date
                  ? new Date(assignment.due_date).toLocaleString()
                  : "No due date"}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500">Max points</div>
              <div className="text-sm">{assignment.max_points}</div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-2">Instructions</h3>
              {assignment.type === "ESSAY" && (
                <div>
                  <div className="prose max-w-none">
                    {assignment.content?.text || "Write your essay here."}
                  </div>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className="w-full border rounded p-2 mt-3"
                    rows={8}
                    placeholder="Type your answer here..."
                  />
                </div>
              )}

              {assignment.type === "CODE" && (
                <div>
                  <div className="text-sm text-gray-600">
                    Language: {assignment.content?.language || "code"}
                  </div>
                  <pre className="bg-gray-100 p-3 rounded mt-2 whitespace-pre-wrap">
                    {assignment.content?.template || ""}
                  </pre>
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    className="w-full border rounded p-2 mt-3"
                    rows={12}
                    placeholder="Paste your code or provide a link to your repository..."
                  />
                </div>
              )}

              {assignment.type === "MULTIPLE_CHOICE" && (
                <div>
                  {(assignment.content?.questions || []).map(
                    (q: any, qi: number) => (
                      <div key={qi} className="mb-3">
                        <div className="font-medium">
                          {q.question || `Question ${qi + 1}`}
                        </div>
                        <div className="mt-1 space-y-1">
                          {(q.options || []).map((opt: string, oi: number) => (
                            <label key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`mcq-${qi}`}
                                value={opt}
                                onChange={() =>
                                  setAnswerText(
                                    JSON.stringify({
                                      questionIndex: qi,
                                      selected: opt,
                                    })
                                  )
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {assignment.type === "FILE_UPLOAD" && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">
                    Attach a file
                  </div>
                  <input type="file" onChange={handleFileChange} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {submitting ? "Submitting..." : "Submit Assignment"}
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>

          <aside className="bg-white rounded-md shadow-md p-6">
            <h4 className="font-medium mb-2">Lesson</h4>
            {lesson ? (
              <div>
                <div className="font-semibold">{lesson.title}</div>
                <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                  {lesson.content}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Lesson not found</div>
            )}

            <div className="mt-4">
              <h4 className="font-medium mb-2">Students</h4>
              <div className="text-sm text-gray-500">
                All enrolled students can submit here.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
