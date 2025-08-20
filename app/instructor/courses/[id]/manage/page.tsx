"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import AssignmentModal from "./components/AssignmentModal";
import ModuleList from "./components/ModuleList";
import LessonForm from "./components/LessonForm";
import LessonList from "./components/LessonList";
import { RoleGuard } from "../../../../components/RoleGuard";
import Heading from "../../../../utils/Heading";
import Header from "../../../../components/Header";
import { moduleService } from "../../../../services/api-modules";
import { lessonService } from "../../../../services/api-lessons";
import { assignmentService } from "../../../../services/api-assignment";
import { useParams } from "next/navigation";
import { progressService } from "../../../../services/api-progress";
import { uploadService } from "../../../../services/api-upload";
import { courseService } from "../../../../services/api-course";

export default function ManageCoursePage() {
  const { id } = useParams() as { id: string };
  const courseId = Number(id);

  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [assignmentsByLesson, setAssignmentsByLesson] = useState<
    Record<number, any[]>
  >({});
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [completedByLesson, setCompletedByLesson] = useState<
    Record<number, boolean>
  >({});
  // UI form states
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState("TEXT");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideo, setLessonVideo] = useState<File | null>(null);
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string>("");
  const [lessonDuration, setLessonDuration] = useState<number>(0);
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState<number | null>(null);
  // Assignment form state
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentLessonId, setAssignmentLessonId] = useState<number | null>(
    null
  );
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [assignmentMaxPoints, setAssignmentMaxPoints] = useState<number>(100);
  const [assignmentType, setAssignmentType] = useState<string>("ESSAY");
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  // Enhanced assignment states
  const [assignmentContentText, setAssignmentContentText] = useState("");
  const [mcqQuestions, setMcqQuestions] = useState<
    { question: string; options: string[]; correct_index: number | null }[]
  >([{ question: "", options: ["", ""], correct_index: null }]);
  const [assignmentFiles, setAssignmentFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<string[]>([]);
  const [codeLanguage, setCodeLanguage] = useState<string>("javascript");
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (courseId) loadModules();
  }, [courseId]);

  useEffect(() => {
    if (selectedModuleId) loadLessons(selectedModuleId);
  }, [selectedModuleId]);

  const loadModules = async () => {
    const res = await moduleService.getModules(courseId);
    let data = ((res as any).data || res || []) as any[];
    // sort by order_index then id for stability
    data = [...data].sort((a, b) => {
      const ai = a.order_index ?? 0;
      const bi = b.order_index ?? 0;
      if (ai !== bi) return ai - bi;
      return a.id - b.id;
    });
    setModules(data);
    // load lesson progress for all enrollments, aggregate by lesson id -> completed if every student completed? or any?
    try {
      const lp = await progressService.getLessonProgress();
      const list = (((lp as any).data || lp) ?? []) as any[];
      const map: Record<number, boolean> = {};
      for (const p of list) {
        if (p.lesson_id) {
          map[p.lesson_id] = map[p.lesson_id] || !!p.is_completed;
        }
      }
      setCompletedByLesson(map);
    } catch {}
    // preserve selected if still exists; otherwise pick first
    if (!selectedModuleId || !data.some((m) => m.id === selectedModuleId)) {
      setSelectedModuleId(data[0]?.id ?? null);
    }
    // clear lessons if no module
    if (data.length === 0) {
      setLessons([]);
    }
  };

  // handle lesson video selection in the form
  const handleLessonVideoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLessonVideo(file);
    try {
      const url = URL.createObjectURL(file);
      setLessonVideoUrl(url);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        setLessonDuration(Math.ceil(video.duration / 60));
        URL.revokeObjectURL(url);
      };
    } catch {
      setLessonDuration(0);
    }
  };

  const handleVideoUpload = async (
    lesson: any,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setVideoUploading(lesson.id);
      const res = await uploadService.uploadLessonVideo(file, lesson.id);
      await loadLessons(lesson.module_id || selectedModuleId!);
    } catch (err) {
      console.error("Video upload failed", err);
      toast.error("Video upload failed");
    } finally {
      setVideoUploading(null);
      try {
        (e.target as HTMLInputElement).value = "";
      } catch {}
    }
  };

  // Basic create actions
  const createModule = async () => {
    if (!moduleTitle.trim()) return;
    await moduleService.createModule({
      course_id: courseId,
      title: moduleTitle.trim(),
    });
    setModuleTitle("");
    setShowModuleForm(false);
    await loadModules();
  };

  const loadLessons = async (moduleId: number) => {
    const res = await lessonService.getLessons(moduleId);
    let lessonList = ((res as any).data || res || []) as any[];
    lessonList = [...lessonList].sort((a, b) => {
      const ai = a.order_index ?? 0;
      const bi = b.order_index ?? 0;
      if (ai !== bi) return ai - bi;
      return a.id - b.id;
    });
    setLessons(lessonList);
    // load assignments for these lessons
    const map: Record<number, any[]> = {};
    for (const l of lessonList) {
      try {
        const ar = await assignmentService.getByLesson(l.id);
        map[l.id] = (ar as any).data || ar || [];
      } catch (e) {
        console.error("Failed to load assignments for lesson", l.id, e);
        map[l.id] = [];
      }
    }
    setAssignmentsByLesson(map);
  };

  const createLesson = async () => {
    if (!selectedModuleId || !lessonTitle.trim()) return;
    setCreatingLesson(true);
    let videoUrl = "";
    let createdLessonId: number | null = null;
    const isEdit = !!editingLessonId;
    try {
      if (isEdit) {
        // update flow
        if (lessonType === "VIDEO" && lessonVideo) {
          const upl = await uploadService.uploadLessonVideo(
            lessonVideo,
            editingLessonId!
          );
          if (upl && typeof upl === "object") {
            videoUrl =
              upl.url ||
              upl.file_url ||
              upl.data?.url ||
              upl.data?.file_url ||
              "";
          } else if (typeof upl === "string") videoUrl = upl;
        }
        await lessonService.updateLesson(editingLessonId!, {
          title: lessonTitle.trim(),
          description: lessonDescription,
          type: lessonType as any,
          content: lessonContent,
          video_url: videoUrl || undefined,
          duration_minutes: lessonDuration,
          is_free: lessonIsFree,
        });
      } else {
        // create flow (try one-step upload)
        if (lessonType === "VIDEO" && lessonVideo) {
          try {
            const upl = await uploadService.uploadLessonVideo(lessonVideo);
            if (upl && typeof upl === "object")
              videoUrl =
                upl.url ||
                upl.file_url ||
                upl.data?.url ||
                upl.data?.file_url ||
                "";
            else if (typeof upl === "string") videoUrl = upl;
          } catch (err) {
            console.warn(
              "Initial upload attempt failed, will fallback to create-then-upload",
              err
            );
          }
        }
        if (lessonType === "VIDEO" && lessonVideo && !videoUrl) {
          const created = await lessonService.createLesson({
            module_id: selectedModuleId,
            title: lessonTitle.trim(),
            description: lessonDescription,
            type: lessonType as any,
            content: lessonContent,
            duration_minutes: lessonDuration,
            is_free: lessonIsFree,
          });
          createdLessonId =
            (created as any).data?.id || (created as any)?.id || null;
          if (!createdLessonId)
            throw new Error("Failed to create lesson for upload fallback");
          const upl2 = await uploadService.uploadLessonVideo(
            lessonVideo,
            createdLessonId
          );
          if (upl2 && typeof upl2 === "object")
            videoUrl =
              upl2.url ||
              upl2.file_url ||
              upl2.data?.url ||
              upl2.data?.file_url ||
              "";
          else if (typeof upl2 === "string") videoUrl = upl2;
          await lessonService.updateLesson(createdLessonId, {
            video_url: videoUrl,
            duration_minutes: lessonDuration,
          });
        }
        if (!createdLessonId) {
          await lessonService.createLesson({
            module_id: selectedModuleId,
            title: lessonTitle.trim(),
            description: lessonDescription,
            type: lessonType as any,
            content: lessonContent,
            video_url: videoUrl,
            duration_minutes: lessonDuration,
            is_free: lessonIsFree,
          });
        }
      }

      // success
      const msg = isEdit
        ? "Lesson updated successfully"
        : "Lesson created successfully";
      setSuccessMessage(msg);
      toast.success(msg);
      // auto-hide after 3s
      window.setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Failed to create/update lesson", err);
      const msg = (err as any)?.message || String(err) || "Unknown error";
      toast.error("Failed to save lesson: " + msg);
      // if we created fallback lesson, reload to show it
      if (createdLessonId) await loadLessons(selectedModuleId);
      return;
    } finally {
      setCreatingLesson(false);
    }

    // reset form and reload
    setLessonTitle("");
    setLessonDescription("");
    setLessonType("TEXT");
    setLessonContent("");
    setLessonVideo(null);
    setLessonVideoUrl("");
    setLessonDuration(0);
    setLessonIsFree(false);
    setEditingLessonId(null);
    setShowLessonForm(false);
    await loadLessons(selectedModuleId);
  };

  // Edit/Delete/Move for modules
  const editModule = async (mod: any) => {
    const title = window.prompt("Edit module title", mod.title);
    if (!title || title === mod.title) return;
    await moduleService.updateModule(mod.id, { title });
    await loadModules();
  };

  const deleteModule = async (moduleId: number) => {
    if (!confirm("Delete this module and its lessons?")) return;
    await moduleService.deleteModule(moduleId);
    // if deleted was selected, reset selection in loadModules
    await loadModules();
  };

  const moveModule = async (moduleId: number, direction: "up" | "down") => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= modules.length) return;
    const a = modules[idx];
    const b = modules[targetIdx];
    const aIdx = (a.order_index ?? idx + 1) as number;
    const bIdx = (b.order_index ?? targetIdx + 1) as number;
    await Promise.all([
      moduleService.updateModule(a.id, { order_index: bIdx }),
      moduleService.updateModule(b.id, { order_index: aIdx }),
    ]);
    await loadModules();
  };

  // Edit/Delete/Move for lessons
  const editLesson = async (lesson: any) => {
    // open form with lesson data populated
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title || "");
    setLessonDescription(lesson.description || "");
    setLessonType(lesson.type || "TEXT");
    setLessonContent(lesson.content || "");
    setLessonDuration(lesson.duration_minutes || 0);
    setLessonIsFree(!!lesson.is_free);
    setLessonVideoUrl(lesson.video_url || "");
    setLessonVideo(null);
    setShowLessonForm(true);
    // scroll to form on page (optional)
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLesson = async (lessonId: number) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      // try deleting associated cloud video first (best-effort)
      await uploadService.deleteLessonVideo(lessonId);
    } catch (err) {
      console.warn("Failed to delete lesson video from cloud", err);
      // ask user whether to continue deleting lesson record
      const cont = confirm(
        "Failed to remove video from cloud. Continue deleting lesson record anyway?"
      );
      if (!cont) return;
    }
    await lessonService.deleteLesson(lessonId);
    if (selectedModuleId) await loadLessons(selectedModuleId);
  };

  const moveLesson = async (lessonId: number, direction: "up" | "down") => {
    const idx = lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;
    const a = lessons[idx];
    const b = lessons[targetIdx];
    const aIdx = (a.order_index ?? idx + 1) as number;
    const bIdx = (b.order_index ?? targetIdx + 1) as number;
    await Promise.all([
      lessonService.updateLesson(a.id, { order_index: bIdx }),
      lessonService.updateLesson(b.id, { order_index: aIdx }),
    ]);
    if (selectedModuleId) await loadLessons(selectedModuleId);
  };

  const createAssignment = async (lessonId: number) => {
    // Deprecated inline prompt; use modal-based flow instead
    setAssignmentLessonId(lessonId);
    setAssignmentTitle("");
    setAssignmentDescription("");
    setAssignmentDueDate(new Date().toISOString().slice(0, 10));
    setAssignmentMaxPoints(100);
    setAssignmentType("ESSAY");
    setCodeLanguage("javascript");
    setMcqQuestions([{ question: "", options: ["", ""], correct_index: null }]);
    setShowAssignmentForm(true);
  };
  const handleEditAssignment = (assignment: any, lessonId: number) => {
    setAssignmentLessonId(lessonId);
    setEditingAssignmentId(assignment.id);
    setAssignmentTitle(assignment.title || "");
    setAssignmentDescription(assignment.description || "");
    setAssignmentDueDate(
      assignment.due_date
        ? new Date(assignment.due_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setAssignmentMaxPoints(assignment.max_score || 100);
    setAssignmentType(assignment.type || "ESSAY");
    setCodeLanguage(assignment.content?.language || "javascript");
    // populate content based on type
    if (assignment.type === "ESSAY") {
      setAssignmentContentText(assignment.content?.text || "");
    } else if (assignment.type === "MULTIPLE_CHOICE") {
      // populate questions array if present
      const qs = (assignment.content?.questions || []).map((q: any) => ({
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        correct_index: q.options ? q.options.indexOf(q.correct_answer) : null,
      }));
      setMcqQuestions(
        qs.length
          ? qs
          : [{ question: "", options: ["", ""], correct_index: null }]
      );
    } else if (assignment.type === "FILE_UPLOAD") {
      setUploadedAttachments(assignment.content?.attachments || []);
    }
    setShowAssignmentForm(true);
  };

  const handleDeleteAssignment = async (
    assignmentId: number,
    lessonId: number
  ) => {
    if (!confirm("Delete this assignment?")) return;
    await assignmentService.deleteAssignment(assignmentId);
    const ar = await assignmentService.getByLesson(lessonId);
    setAssignmentsByLesson((prev) => ({
      ...prev,
      [lessonId]: (ar as any).data || ar || [],
    }));
  };
  const submitAssignment = async () => {
    if (!assignmentLessonId) return;
    if (!assignmentTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    // type-specific validation
    if (assignmentType === "MULTIPLE_CHOICE") {
      // ensure at least one question with 2+ filled options and a correct option
      const valid = (mcqQuestions || []).some(
        (q) =>
          (q.options || []).filter((o) => o && o.trim() !== "").length >= 2 &&
          typeof q.correct_index === "number" &&
          q.correct_index >= 0
      );
      if (!valid) {
        toast.error(
          "MULTIPLE_CHOICE requires at least one question with 2 choices and a selected correct answer"
        );
        return;
      }
    }

    setCreatingAssignment(true);
    try {
      const isEdit = !!editingAssignmentId;

      const buildContent = () => {
        if (assignmentType === "ESSAY") return { text: assignmentContentText };
        if (assignmentType === "MULTIPLE_CHOICE") {
          const questions = (mcqQuestions || []).map((q) => ({
            question: q.question || assignmentTitle,
            options: (q.options || []).map((o) => o || ""),
            correct_answer:
              typeof q.correct_index === "number" && q.correct_index >= 0
                ? (q.options || [])[q.correct_index]
                : null,
          }));
          return { questions };
        }
        if (assignmentType === "FILE_UPLOAD")
          return { attachments: uploadedAttachments || [] };
        if (assignmentType === "CODE")
          return { language: codeLanguage, template: assignmentContentText };
        return undefined;
      };

      if (isEdit && editingAssignmentId) {
        // update existing assignment
        const updatedContent = buildContent();
        await assignmentService.updateAssignment(editingAssignmentId, {
          title: assignmentTitle.trim(),
          description: assignmentDescription,
          due_date: new Date(assignmentDueDate).toISOString(),
          max_points: assignmentMaxPoints,
          type: assignmentType,
          content: updatedContent,
        });

        // if FILE_UPLOAD type and files selected, upload and append/update
        if (assignmentType === "FILE_UPLOAD" && assignmentFiles.length > 0) {
          setUploadingFiles(true);
          const urls: string[] = [];
          for (const f of assignmentFiles) {
            try {
              const upl = await uploadService.uploadAssignmentFile(
                f,
                editingAssignmentId
              );
              if (upl && typeof upl === "object")
                urls.push(
                  upl.url ||
                    upl.file_url ||
                    upl.data?.url ||
                    upl.data?.file_url ||
                    ""
                );
              else if (typeof upl === "string") urls.push(upl);
            } catch (err) {
              console.error("Failed to upload assignment file", err);
            }
          }
          setUploadedAttachments((prev) => [
            ...(prev || []),
            ...urls.filter(Boolean),
          ]);
          setUploadingFiles(false);
          try {
            await assignmentService.updateAssignment(editingAssignmentId, {
              content: {
                attachments: [
                  ...(uploadedAttachments || []),
                  ...urls.filter(Boolean),
                ],
              },
            });
          } catch (err) {
            console.warn("Failed to update assignment with attachments", err);
          }
        }
      } else {
        // create new assignment first
        const created = await assignmentService.createAssignment({
          lesson_id: assignmentLessonId,
          title: assignmentTitle.trim(),
          description: assignmentDescription,
          due_date: new Date(assignmentDueDate).toISOString(),
          max_points: assignmentMaxPoints,
          type: assignmentType,
          content: buildContent(),
        });
        const createdAssignment = (created as any).data || created;
        const assignmentId =
          createdAssignment?.id ||
          createdAssignment?.data?.id ||
          createdAssignment?.id;

        if (
          assignmentType === "FILE_UPLOAD" &&
          assignmentFiles.length > 0 &&
          assignmentId
        ) {
          setUploadingFiles(true);
          const urls: string[] = [];
          for (const f of assignmentFiles) {
            try {
              const upl = await uploadService.uploadAssignmentFile(
                f,
                assignmentId
              );
              if (upl && typeof upl === "object")
                urls.push(
                  upl.url ||
                    upl.file_url ||
                    upl.data?.url ||
                    upl.data?.file_url ||
                    ""
                );
              else if (typeof upl === "string") urls.push(upl);
            } catch (err) {
              console.error("Failed to upload assignment file", err);
            }
          }
          setUploadedAttachments(urls.filter(Boolean));
          setUploadingFiles(false);
          try {
            await assignmentService.updateAssignment(assignmentId, {
              content: { attachments: urls.filter(Boolean) },
            });
          } catch (err) {
            console.warn("Failed to update assignment with attachments", err);
          }
        }
      }

      const ar = await assignmentService.getByLesson(assignmentLessonId);
      setAssignmentsByLesson((prev) => ({
        ...prev,
        [assignmentLessonId]: (ar as any).data || ar || [],
      }));

      // reset modal state
      setShowAssignmentForm(false);
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentContentText("");
      setMcqQuestions([
        { question: "", options: ["", ""], correct_index: null },
      ]);
      setAssignmentFiles([]);
      setUploadedAttachments([]);
      setEditingAssignmentId(null);
      // notify success
      toast.success(
        isEdit
          ? "Assignment updated successfully"
          : "Assignment created successfully"
      );
    } catch (e) {
      console.error("Failed to create assignment", e);
      toast.error("Failed to create assignment: " + ((e as any)?.message || e));
    } finally {
      setCreatingAssignment(false);
      setUploadingFiles(false);
    }
  };

  const toggleAssignmentStatus = async (
    assignmentId: number,
    lessonId: number,
    is_active: boolean
  ) => {
    await assignmentService.updateStatus(assignmentId, is_active);
    const ar = await assignmentService.getByLesson(lessonId);
    setAssignmentsByLesson((prev) => ({
      ...prev,
      [lessonId]: (ar as any).data || ar || [],
    }));
  };

  const deleteAssignment = async (assignmentId: number, lessonId: number) => {
    if (!confirm("Delete this assignment?")) return;
    await assignmentService.deleteAssignment(assignmentId);
    const ar = await assignmentService.getByLesson(lessonId);
    setAssignmentsByLesson((prev) => ({
      ...prev,
      [lessonId]: (ar as any).data || ar || [],
    }));
  };

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Manage Course"
          description="Modules, lessons, assignments"
          keywords="course,manage"
        />
        <Header />
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ModuleList
            modules={modules}
            selectedModuleId={selectedModuleId}
            setSelectedModuleId={setSelectedModuleId}
            showModuleForm={showModuleForm}
            setShowModuleForm={setShowModuleForm}
            moduleTitle={moduleTitle}
            setModuleTitle={setModuleTitle}
            createModule={createModule}
            editModule={editModule}
            deleteModule={deleteModule}
            moveModule={moveModule}
          />
          <div className="bg-white rounded-md shadow-md p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Lessons</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!showLessonForm) {
                      setEditingLessonId(null);
                      setLessonTitle("");
                      setLessonDescription("");
                      setLessonType("TEXT");
                      setLessonContent("");
                      setLessonVideo(null);
                      setLessonVideoUrl("");
                      setLessonDuration(0);
                      setLessonIsFree(false);
                    }
                    setShowLessonForm((s) => !s);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm"
                >
                  {showLessonForm ? "Close" : "Add"}
                </button>
              </div>
            </div>
            <LessonForm
              show={showLessonForm}
              onClose={() => setShowLessonForm(false)}
              onSubmit={createLesson}
              creating={creatingLesson}
              lessonTitle={lessonTitle}
              setLessonTitle={setLessonTitle}
              lessonDescription={lessonDescription}
              setLessonDescription={setLessonDescription}
              lessonType={lessonType}
              setLessonType={setLessonType}
              lessonContent={lessonContent}
              setLessonContent={setLessonContent}
              lessonVideo={lessonVideo}
              setLessonVideo={setLessonVideo}
              lessonVideoUrl={lessonVideoUrl}
              setLessonVideoUrl={setLessonVideoUrl}
              lessonDuration={lessonDuration}
              setLessonDuration={setLessonDuration}
              lessonIsFree={lessonIsFree}
              setLessonIsFree={setLessonIsFree}
              handleLessonVideoChange={handleLessonVideoChange}
              successMessage={successMessage}
            />
            <LessonList
              lessons={lessons}
              completedByLesson={completedByLesson}
              assignmentsByLesson={assignmentsByLesson}
              onAddAssignment={(lessonId) => {
                setAssignmentLessonId(lessonId);
                setAssignmentTitle("");
                setAssignmentDescription("");
                setAssignmentDueDate(new Date().toISOString().slice(0, 10));
                setAssignmentMaxPoints(100);
                setAssignmentType("ESSAY");
                setShowAssignmentForm(true);
              }}
              onEditAssignment={handleEditAssignment}
              onDeleteAssignment={handleDeleteAssignment}
              moveLesson={moveLesson}
              editLesson={editLesson}
              deleteLesson={deleteLesson}
            />
          </div>
        </div>
      </div>
      <AssignmentModal
        show={showAssignmentForm}
        onClose={() => setShowAssignmentForm(false)}
        onSubmit={submitAssignment}
        creating={creatingAssignment}
        uploadingFiles={uploadingFiles}
        assignmentTitle={assignmentTitle}
        setAssignmentTitle={setAssignmentTitle}
        assignmentDescription={assignmentDescription}
        setAssignmentDescription={setAssignmentDescription}
        assignmentDueDate={assignmentDueDate}
        setAssignmentDueDate={setAssignmentDueDate}
        assignmentMaxPoints={assignmentMaxPoints}
        setAssignmentMaxPoints={setAssignmentMaxPoints}
        assignmentType={assignmentType}
        setAssignmentType={setAssignmentType}
        assignmentContentText={assignmentContentText}
        setAssignmentContentText={setAssignmentContentText}
        mcqQuestions={mcqQuestions}
        setMcqQuestions={setMcqQuestions}
        assignmentFiles={assignmentFiles}
        setAssignmentFiles={setAssignmentFiles}
        uploadedAttachments={uploadedAttachments}
        codeLanguage={codeLanguage}
        setCodeLanguage={setCodeLanguage}
        editingAssignmentId={editingAssignmentId}
      />
      <Toaster position="top-right" />
    </RoleGuard>
  );
}
