"use client";
import React from "react";
import { RoleGuard } from "../../../components/RoleGuard";
import Heading from "../../../utils/Heading";
import Header from "../../../components/Header";
import { CourseForm } from "../../../components/course/CourseForm";
import {
  courseService,
  CreateCourseDto,
  UpdateCourseDto,
} from "../../../services/api-course";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function NewCoursePage() {
  const router = useRouter();

  const handleCreate = async (data: CreateCourseDto | UpdateCourseDto) => {
    try {
      const res = await courseService.createCourse(data as CreateCourseDto);
      const ok =
        (res as any)?.success !== undefined
          ? (res as any).success
          : !!(res as any)?.id;
      if (ok) {
        toast.success("Thêm khóa học thành công");
        router.replace("/instructor/courses");
      } else {
        toast.error("Tạo khóa học thất bại");
      }
    } catch (e: any) {
      toast.error(e?.message || "Có lỗi xảy ra khi tạo khóa học");
    }
  };

  return (
    <RoleGuard roles={["ROLE_TEACHER", "ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Tạo khóa học"
          description="Xây dựng một khóa học mới"
          keywords="khoa hoc,tao moi"
        />
        <Header />
        <div className="container mx-auto px-4 py-8">
          <CourseForm onSubmit={handleCreate} onCancel={() => router.back()} />
        </div>
      </div>
    </RoleGuard>
  );
}
