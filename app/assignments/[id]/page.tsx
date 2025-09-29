"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import Heading from "../../utils/Heading";
import Header from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { uploadService } from "../../services/api-upload";

interface Assignment {
  id: number;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  maxPoints: number;
  courseTitle: string;
  courseId: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  overdue?: boolean;
}

interface Submission {
  id: number;
  assignmentId: number;
  content: string;
  files: SubmissionFile[];
  submittedAt: string;
  grade?: number;
  feedback?: string;
  isLate: boolean;
}

interface SubmissionFile {
  id: number;
  filename: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
}

const AssignmentSubmissionPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    files: [] as File[],
  });

  useEffect(() => {
    if (params.id) {
      loadAssignmentData();
    }
  }, [params.id]);

  const loadAssignmentData = async () => {
    try {
      setLoading(true);
      const assignmentData = await apiService.get(`/assignments/${params.id}`);
      // Normalize API response (snake_case) to the UI shape expected here
      const normalized: Assignment = {
        id: assignmentData.id,
        title: assignmentData.title,
        description: assignmentData.description ?? "",
        instructions:
          assignmentData.content?.instructions ??
          assignmentData.description ??
          "",
        dueDate:
          assignmentData.dueDate ??
          assignmentData.due_date ??
          assignmentData.due_at ??
          "",
        maxPoints: Number(
          assignmentData.maxPoints ?? assignmentData.max_points ?? 100
        ),
        courseTitle:
          assignmentData.lesson?.module?.course?.title ??
          assignmentData.lesson?.title ??
          "",
        courseId:
          assignmentData.lesson?.module?.course?.id ??
          assignmentData.lesson?.module?.course_id ??
          assignmentData.lesson?.course_id ??
          0,
        allowedFileTypes:
          assignmentData.content?.allowedFileTypes ??
          assignmentData.content?.allowed_types ??
          [],
        maxFileSize:
          assignmentData.content?.maxFileSize ??
          assignmentData.content?.max_file_size ??
          25,
        overdue: Boolean(
          assignmentData.overdue ??
            ((): boolean => {
              const d =
                assignmentData.dueDate ??
                assignmentData.due_date ??
                assignmentData.due_at;
              const ms = d ? Date.parse(d) : NaN;
              return Number.isFinite(ms) && Date.now() > ms;
            })()
        ),
      };
      setAssignment(normalized);

      if (isAuthenticated) {
        try {
          const submissions = await apiService.getMySubmissions();
          const currentSubmission = submissions.find(
            (s: any) =>
              s.assignmentId === Number(params.id) ||
              s.assignment_id === Number(params.id)
          );
          setSubmission(currentSubmission || null);

          if (currentSubmission) {
            // Try to parse content as JSON to extract text and attachments
            let parsedText = currentSubmission.content || "";
            try {
              const maybe = JSON.parse(currentSubmission.content || "");
              if (maybe && (maybe.text || maybe.attachments)) {
                parsedText = maybe.text || "";
                if (
                  (!currentSubmission.files ||
                    currentSubmission.files.length === 0) &&
                  Array.isArray(maybe.attachments)
                ) {
                  currentSubmission.files = maybe.attachments.map(
                    (a: any, idx: number) => ({
                      id: idx,
                      filename: a.url?.split("/").pop() || "attachment",
                      originalName: a.url?.split("/").pop() || "attachment",
                      fileUrl: a.url,
                      fileSize: 0,
                    })
                  );
                }
              }
            } catch (e) {
              // content not JSON, leave as-is
            }

            setFormData({ content: parsedText, files: [] });
          }
        } catch (error) {
          console.error("Error loading submission data:", error);
        }
      }
    } catch (error) {
      console.error("Error loading assignment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData({ ...formData, files });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (assignment && isOverdue(assignment.dueDate)) {
      toast.error("Bài tập đã quá hạn, không thể nộp.");
      return;
    }

    try {
      setSubmitting(true);

      // Upload files first if any
      let uploadedFiles: any[] = [];
      if (formData.files.length > 0) {
        const results: any[] = [];
        for (const f of formData.files) {
          const data = await uploadService.uploadAssignmentFile(
            f,
            Number(params.id)
          );
          results.push(data);
        }
        uploadedFiles = results.map((r) => ({
          url: r.url,
          public_id: r.public_id,
        }));
      }

      // Submit assignment
      // Include uploaded attachments in the content as JSON so the server
      // (which stores content as text) keeps the full attachment list without
      // changing server DTOs. Keep file_url for compatibility (first file).
      let contentPayload: any = formData.content || null;
      if (uploadedFiles.length > 0) {
        contentPayload = JSON.stringify({
          text: formData.content,
          attachments: uploadedFiles.map((r) => ({
            url: r.url,
            public_id: r.public_id,
          })),
        });
      }

      const submissionData = {
        content: contentPayload,
        file_url: uploadedFiles[0]?.url,
      } as any;

      const resp = await apiService.submitAssignment(
        Number(params.id),
        submissionData
      );
      if (resp && resp.success === false && resp.canSubmit === false) {
        // graceful non-error response from server for non-submittable cases
        toast.error(resp.message || "Bài tập đã quá hạn, không thể nộp.");
        return;
      }
      loadAssignmentData(); // Refresh data
    } catch (error: any) {
      const status = error?.status;
      const serverMsg = error?.response?.message || error?.message;
      if (status === 422 || /quá hạn|deadline|overdue/i.test(serverMsg || "")) {
        // Expected case: just inform user, no console noise
        toast.error("Bài tập đã quá hạn, không thể nộp.");
      } else {
        console.error("Error submitting assignment:", error);
        toast.error(serverMsg || "Submit thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (dueDate: string) => {
    if (assignment?.overdue) return true;
    if (!dueDate) return false;
    const dueMs = Date.parse(dueDate);
    if (Number.isNaN(dueMs)) return false;
    return Date.now() > dueMs;
  };

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();

    if (diff <= 0) return "Overdue";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days, ${hours} hours remaining`;
    return `${hours} hours remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading title="Loading Assignment..." description="" keywords="" />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading assignment...</div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading title="Assignment Not Found" description="" keywords="" />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Assignment not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Heading
        title={`${assignment.title} - Assignment Submission`}
        description={assignment.description}
        keywords="assignment, submission, education"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Assignment Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {assignment.title}
                </h1>
                <p className="text-gray-600 mb-4">{assignment.description}</p>
                <div className="text-sm text-gray-500">
                  Course:{" "}
                  <span className="font-medium">{assignment.courseTitle}</span>
                </div>
              </div>

              <div className="ml-6 text-right">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {assignment.maxPoints} points
                </div>
                <div
                  className={`text-sm font-medium ${
                    isOverdue(assignment.dueDate)
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {getTimeRemaining(assignment.dueDate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Due: {new Date(assignment.dueDate).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Status Banner */}
            {submission && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center text-green-800">
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Submitted</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Submitted on{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                  {submission.isLate && (
                    <span className="text-red-600 ml-2">(Late Submission)</span>
                  )}
                </div>
                {submission.grade !== undefined && (
                  <div className="mt-2">
                    <span className="text-green-800 font-semibold">
                      Grade: {submission.grade}/{assignment.maxPoints}
                    </span>
                  </div>
                )}
              </div>
            )}

            {isOverdue(assignment.dueDate) && !submission && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center text-red-800">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  <span className="font-semibold">Assignment Overdue</span>
                </div>
                <div className="text-sm text-red-700 mt-1">
                  This assignment was due on{" "}
                  {new Date(assignment.dueDate).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Instructions */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Instructions
                </h3>
                <div className="prose max-w-none text-gray-700">
                  {assignment.instructions
                    .split("\n")
                    .map((paragraph, index) => (
                      <p key={index} className="mb-3">
                        {paragraph}
                      </p>
                    ))}
                </div>
              </div>

              {/* Submission Form */}
              {!submission && !isOverdue(assignment.dueDate) && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Submit Assignment
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Text Response */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Written Response
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) =>
                          setFormData({ ...formData, content: e.target.value })
                        }
                        rows={8}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your response here..."
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attach Files (Optional)
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <div className="text-sm text-gray-600 mb-2">
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer text-blue-600 hover:text-blue-800"
                          >
                            Click to upload files
                          </label>
                          <span> or drag and drop</span>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          accept={assignment.allowedFileTypes?.join(",")}
                        />
                        <div className="text-xs text-gray-500">
                          Allowed types:{" "}
                          {assignment.allowedFileTypes?.join(", ")}
                        </div>
                        <div className="text-xs text-gray-500">
                          Max file size: {assignment.maxFileSize}MB each
                        </div>
                      </div>

                      {/* Selected Files */}
                      {formData.files.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Selected Files:
                          </h4>
                          <div className="space-y-2">
                            {formData.files.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center p-2 bg-gray-50 rounded"
                              >
                                <PaperClipIcon className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-700">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          isOverdue(assignment.dueDate) ||
                          (!formData.content.trim() &&
                            formData.files.length === 0)
                        }
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Submitting..." : "Submit Assignment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Previous Submission */}
              {submission && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Submission
                  </h3>

                  {submission.content && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Written Response:
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="prose max-w-none text-gray-700">
                          {submission.content
                            .split("\n")
                            .map((paragraph, index) => (
                              <p key={index} className="mb-3">
                                {paragraph}
                              </p>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.files && submission.files.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Attached Files:
                      </h4>
                      <div className="space-y-2">
                        {submission.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <PaperClipIcon className="h-4 w-4 text-gray-400 mr-3" />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {file.originalName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {submission.feedback && (
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Instructor Feedback:
                      </h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-gray-700">
                          {submission.feedback}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Assignment Details */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Assignment Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Points:</span>
                    <span className="font-medium">{assignment.maxPoints}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">
                      {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Due Time:</span>
                    <span className="font-medium">
                      {new Date(assignment.dueDate).toLocaleTimeString()}
                    </span>
                  </div>
                  {assignment.allowedFileTypes && (
                    <div>
                      <span className="text-gray-600">Allowed File Types:</span>
                      <div className="mt-1">
                        {assignment.allowedFileTypes.map((type, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Status */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Submission Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    {submission ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        submission ? "text-green-800" : "text-yellow-800"
                      }`}
                    >
                      {submission ? "Submitted" : "Not Submitted"}
                    </span>
                  </div>

                  {submission && (
                    <>
                      <div className="text-sm text-gray-600">
                        Submitted:{" "}
                        {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                      {submission.grade !== undefined ? (
                        <div className="text-sm">
                          <span className="text-gray-600">Grade: </span>
                          <span className="font-semibold text-green-600">
                            {submission.grade}/{assignment.maxPoints}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          Status: Awaiting Grade
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmissionPage;
