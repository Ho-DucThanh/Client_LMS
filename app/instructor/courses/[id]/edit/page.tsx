"use client";
import React, { useEffect, useState } from "react";
import { RoleGuard } from "../../../../components/RoleGuard";
import Heading from "../../../../utils/Heading";
import Header from "../../../../components/Header";
import { CourseForm } from "../../../../components/course/CourseForm";
import {
  courseService,
  UpdateCourseDto,
} from "../../../../services/api-course";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);

  const id = Number(params?.id);

  useEffect(() => {
    if (id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    const res = await courseService.getCourse(id);
    setCourse((res as any).data || res);
  };

  const handleUpdate = async (data: UpdateCourseDto) => {
    try {
      const res = await courseService.updateCourse(id, data);
      toast.success("Cập nhật khóa học thành công!");
      router.push("/instructor/courses");
    } catch (error: any) {
      toast.error(error?.message || "Cập nhật khóa học thất bại!");
    }
  };

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Edit Course"
          description="Update your course"
          keywords="course,edit"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          {course ? (
            <CourseForm
              course={course}
              isEditing
              onSubmit={handleUpdate}
              onCancel={() => router.back()}
            />
          ) : (
            <div className="text-gray-600">Loading...</div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
