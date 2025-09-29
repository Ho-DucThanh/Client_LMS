"use client";
import React, { useEffect, useState } from "react";
import {
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { reportsService } from "../services/api-reports";
import { RoleGuard } from "../components/RoleGuard";
import AdminStats from "../components/admin/AdminStats";
import AdminUsers from "../components/admin/AdminUsers";
import AdminCourses from "../components/admin/AdminCourses";
import AdminReports from "../components/admin/AdminReports";
import { courseService } from "../services/api-course";
import toast from "react-hot-toast";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  userRoles?: { role?: { role_name?: string } }[];
}

interface Course {
  id: number;
  title: string;
  instructor?: string;
  instructor_name?: string;
  enrollmentCount?: number;
  total_enrolled?: number;
  enrollments?: any[];
  isPublished?: boolean;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

interface SystemStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  activeUsers: number;
  newUsersThisMonth: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursePage, setCoursePage] = useState<number>(1);
  const [courseLimit, setCourseLimit] = useState<number>(10);
  const [courseTotal, setCourseTotal] = useState<number>(0);
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [globalCoursesTotal, setGlobalCoursesTotal] = useState<number>(0);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingTag, setSavingTag] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [tagError, setTagError] = useState("");
  const [showCreateUserModal, setShowCreateUserModal] =
    useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "ROLE_TEACHER",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [u, cGlobal, cFiltered, overview] = await Promise.all([
        apiService.get("/admin/users"),
        apiService.get(`/admin/courses?page=1&limit=1`), // minimal fetch to get global total
        apiService.get(
          `/admin/courses?page=${coursePage}&limit=${courseLimit}&approval_status=${encodeURIComponent(
            selectedApprovalStatus
          )}`
        ),
        reportsService.getAdminOverview().catch(() => null),
      ]);

      const usersArr = (u as any)?.data || u || [];
      const coursesArr =
        (cFiltered as any)?.data || (cFiltered as any)?.data || cFiltered || [];
      const cTotal =
        (cFiltered as any)?.total ??
        (cFiltered as any)?.total ??
        (Array.isArray(coursesArr) ? coursesArr.length : 0);
      setCourseTotal(Number(cTotal || 0));
      const gTotal = (cGlobal as any)?.total ?? cGlobal?.total ?? 0;
      setGlobalCoursesTotal(Number(gTotal || 0));

      const usersList: any[] = Array.isArray(usersArr) ? usersArr : [];
      const coursesList: any[] = Array.isArray(coursesArr) ? coursesArr : [];

      setUsers(usersList as any);
      setCourses(coursesList as any);

      // Stats from overview (preferred) with local fallbacks
      const oTotals = (overview as any)?.totals || {};
      const totalUsers = Number(
        oTotals.users ?? (u as any)?.total ?? usersList.length ?? 0
      );
      const totalCourses = Number(
        oTotals.courses ?? (globalCoursesTotal || gTotal || 0) ?? 0
      );
      const totalEnrollments = Number(
        oTotals.enrollments ??
          (usersList.reduce((acc) => acc, 0) ||
            coursesList.reduce((sum, course: any) => {
              const enrollments = Array.isArray(course.enrollments)
                ? course.enrollments.length
                : Number(course.total_enrolled || 0);
              return sum + enrollments;
            }, 0))
      );
      const totalRevenue = Number(
        oTotals.revenue ??
          coursesList.reduce((sum, course: any) => {
            const price = Number(course.price || 0);
            const enrollments = Array.isArray(course.enrollments)
              ? course.enrollments.length
              : Number(course.total_enrolled || 0);
            return sum + price * enrollments;
          }, 0)
      );

      const now = new Date();
      const newUsersThisMonth = usersList.filter((usr: any) => {
        const created = new Date(usr.created_at || usr.createdAt || 0);
        return (
          created.getFullYear() === now.getFullYear() &&
          created.getMonth() === now.getMonth()
        );
      }).length;
      const activeUsers = usersList.filter(
        (usr: any) => (usr.status || "").toUpperCase() === "ACTIVE"
      ).length;

      setStats({
        totalUsers: Number(totalUsers || 0),
        totalCourses: Number(totalCourses || 0),
        totalEnrollments: Number(totalEnrollments || 0),
        totalRevenue: Number(totalRevenue || 0),
        activeUsers: Number(activeUsers || 0),
        newUsersThisMonth: Number(newUsersThisMonth || 0),
      });
      // load categories and tags for settings
      try {
        const cats = await apiService.getAdminCategories();
        const tgs = await apiService.getAdminTags();
        setCategories((cats as any)?.data || cats || []);
        setTags((tgs as any)?.data || tgs || []);
      } catch (err) {
        console.error("Failed to load categories/tags", err);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setCategoryError("");
    if (!newCategoryName.trim()) {
      setCategoryError("Danh mục đã tồn tại hoặc không được để trống");
      return;
    }
    setSavingCategory(true);
    try {
      await apiService.createAdminCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
      });
      setShowAddCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryDesc("");
      const res = await apiService.getAdminCategories();
      setCategories((res as any)?.data || res || []);
      toast.success("Tạo danh mục thành công");
    } catch (err: any) {
      // Friendly message for duplicates or validation
      setCategoryError("Danh mục đã tồn tại hoặc không được để trống");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Xóa danh mục này?")) return;
    try {
      await apiService.deleteAdminCategory(id);
      setCategories((cats) => cats.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete category failed", err);
    }
  };

  const handleCreateTag = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setTagError("");
    if (!newTagName.trim()) {
      setTagError("Thẻ đã tồn tại hoặc không được để trống");
      return;
    }
    setSavingTag(true);
    try {
      await apiService.createAdminTag({ name: newTagName.trim() });
      setShowAddTagModal(false);
      setNewTagName("");
      const res = await apiService.getAdminTags();
      setTags((res as any)?.data || res || []);
      toast.success("Tạo thẻ thành công");
    } catch (err: any) {
      setTagError("Thẻ đã tồn tại hoặc không được để trống");
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm("Xóa thẻ này?")) return;
    try {
      await apiService.deleteAdminTag(id);
      setTags((t) => t.filter((tg) => tg.id !== id));
    } catch (err) {
      console.error("Delete tag failed", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const payload = {
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
      } as any;
      await apiService.createUser(payload);
      setShowCreateUserModal(false);
      setNewUser({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "ROLE_TEACHER",
      });
      toast.success("Tạo người dùng thành công");
      loadDashboardData();
    } catch (error: any) {
      const msg = error?.message;
      setCreateError(msg || "Tạo người dùng thất bại");
      toast.error("Tạo người dùng thất bại");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Bạn có chắc muốn xóa người dùng này?")) {
      try {
        await apiService.deleteUser(userId);
        loadDashboardData();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      await apiService.assignRole(userId, newRole);
      loadDashboardData();
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Bảng điều khiển quản trị - EduPlatform"
          description="Quản trị và quản lý hệ thống"
          keywords="quản trị, bảng điều khiển, người dùng, hệ thống"
        />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={["ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Bảng điều khiển quản trị - EduPlatform"
          description="Quản trị và quản lý hệ thống"
          keywords="quản trị, bảng điều khiển, người dùng, hệ thống"
        />
        <Header />

        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bảng điều khiển Quản trị
            </h1>
            <p className="text-gray-600">
              Quản lý người dùng, khóa học và cài đặt hệ thống. Theo dõi hiệu
              suất và bảo mật của nền tảng.
            </p>
          </div>

          {/* Stats Cards */}
          <AdminStats stats={stats} />

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: "overview", label: "Tổng quan" },
                  { key: "users", label: "Người dùng" },
                  { key: "courses", label: "Khóa học" },
                  { key: "reports", label: "Báo cáo" },
                  { key: "analytics", label: "Phân tích" },
                  { key: "settings", label: "Cài đặt" },
                  { key: "security", label: "Bảo mật" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tình trạng hệ thống
                </h3>
                <div className="text-sm text-gray-600">
                  Tất cả hệ thống hoạt động bình thường. Không có sự cố được ghi
                  nhận.
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Hoạt động gần đây
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="border border-gray-200 rounded-lg p-3">
                    Đã xử lý đăng ký người dùng mới.
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    Khóa học đã được xuất bản và cập nhật.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <AdminUsers
              users={users as any}
              onCreateClick={() => setShowCreateUserModal(true)}
              onDelete={handleDeleteUser}
              onRefresh={loadDashboardData}
            />
          )}

          {activeTab === "courses" && (
            <AdminCourses
              courses={courses as any}
              total={courseTotal}
              page={coursePage}
              limit={courseLimit}
              onStatusChange={(status) => {
                setCoursePage(1);
                setSelectedApprovalStatus(status);
                (async () => {
                  try {
                    const c = await apiService.get(
                      `/admin/courses?page=1&limit=${courseLimit}&approval_status=${encodeURIComponent(
                        status
                      )}`
                    );
                    const coursesArr = (c as any)?.data || c?.data || c || [];
                    setCourses(Array.isArray(coursesArr) ? coursesArr : []);
                    const cTotal =
                      (c as any)?.total ??
                      c?.total ??
                      (Array.isArray(coursesArr) ? coursesArr.length : 0);
                    setCourseTotal(Number(cTotal || 0));
                  } catch (err) {
                    console.error("Error filtering courses:", err);
                  }
                })();
              }}
              onPageChange={(p: number) => {
                setCoursePage(p);
                // reload courses page only
                (async () => {
                  try {
                    const c = await apiService.get(
                      `/admin/courses?page=${p}&limit=${courseLimit}&approval_status=${encodeURIComponent(
                        selectedApprovalStatus
                      )}`
                    );
                    const coursesArr = (c as any)?.data || c?.data || c || [];
                    setCourses(Array.isArray(coursesArr) ? coursesArr : []);
                    const cTotal =
                      (c as any)?.total ??
                      c?.total ??
                      (Array.isArray(coursesArr) ? coursesArr.length : 0);
                    setCourseTotal(Number(cTotal || 0));
                  } catch (err) {
                    console.error("Error loading courses page:", err);
                  }
                })();
              }}
              onApprove={(id: number) => {
                // fire-and-forget to satisfy void return; errors are logged
                (async () => {
                  try {
                    await courseService.approveCourse(id);
                    await loadDashboardData();
                  } catch (err) {
                    console.error("Approve course failed", err);
                  }
                })();
              }}
              onReject={(id: number) => {
                (async () => {
                  try {
                    await courseService.rejectCourse(id);
                    await loadDashboardData();
                  } catch (err) {
                    console.error("Reject course failed", err);
                  }
                })();
              }}
            />
          )}

          {activeTab === "reports" && <AdminReports />}

          {activeTab === "analytics" && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Bảng điều khiển phân tích nâng cao sẽ sớm có.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Theo dõi mức độ tương tác, hiệu quả khóa học, doanh thu và các
                chỉ số hệ thống.
              </p>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Cài đặt chung
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên nền tảng
                    </label>
                    <input
                      type="text"
                      defaultValue="EduPlatform"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá khóa học mặc định
                    </label>
                    <input
                      type="number"
                      defaultValue="99"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">
                    Danh mục & Thẻ khóa học
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCategoryError("");
                        setNewCategoryName("");
                        setNewCategoryDesc("");
                        setShowAddCategoryModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                      Thêm danh mục
                    </button>
                    <button
                      onClick={() => {
                        setTagError("");
                        setNewTagName("");
                        setShowAddTagModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                    >
                      Thêm thẻ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium mb-3">Danh mục</h5>
                    <div className="grid gap-2">
                      {(categories || []).map((c: any) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {c.name}
                            </div>
                            {c.description && (
                              <div className="text-xs text-gray-500">
                                {c.description}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                      {(!categories || categories.length === 0) && (
                        <div className="text-sm text-gray-500">
                          Chưa có danh mục.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-3">Thẻ</h5>
                    <div className="grid gap-2">
                      {(tags || []).map((t: any) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                        >
                          <div className="font-medium text-gray-900">
                            {t.name}
                          </div>
                          <button
                            onClick={() => handleDeleteTag(t.id)}
                            className="text-red-600 text-sm hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                      {(!tags || tags.length === 0) && (
                        <div className="text-sm text-gray-500">
                          Chưa có thẻ.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Cài đặt Email
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máy chủ SMTP
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email người gửi
                    </label>
                    <input
                      type="email"
                      placeholder="noreply@eduplatform.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Cài đặt xác thực
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Xác thực hai yếu tố</span>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                      Bật
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Yêu cầu độ phức tạp mật khẩu
                    </span>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                      Đã bật
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Thời gian hết hạn phiên (phút)
                    </span>
                    <input
                      type="number"
                      defaultValue="60"
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Nhật ký hệ thống
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Lần đăng nhập thất bại (24h qua)</span>
                    <span className="text-red-600 font-semibold">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lần đăng nhập thành công (24h qua)</span>
                    <span className="text-green-600 font-semibold">1,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yêu cầu API (1 giờ qua)</span>
                    <span className="text-blue-600 font-semibold">2,156</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create User Modal - Enhanced UI */}
        {showCreateUserModal && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateUserModal(false)}
            />
            {/* Dialog */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tạo người dùng mới
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Thêm người dùng và gán vai trò. Khuyến nghị sử dụng mật
                      khẩu mạnh.
                    </p>
                  </div>
                  <button
                    aria-label="Close"
                    className="p-2 rounded-lg hover:bg-gray-100"
                    onClick={() => setShowCreateUserModal(false)}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form
                  onSubmit={handleCreateUser}
                  className="px-6 py-5 space-y-4"
                >
                  {createError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                      {createError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Thanh"
                        value={newUser.firstName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, firstName: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Họ
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Hồ Đức"
                        value={newUser.lastName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, lastName: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Tối thiểu 6 ký tự"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Sử dụng ít nhất 6 ký tự. Tránh mật khẩu phổ biến hoặc tái
                      sử dụng.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vai trò
                    </label>
                    <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                      {[
                        { key: "ROLE_STUDENT", label: "Học viên" },
                        { key: "ROLE_TEACHER", label: "Giảng viên" },
                        { key: "ROLE_ADMIN", label: "Quản trị viên" },
                      ].map((r) => {
                        const active = newUser.role === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() =>
                              setNewUser({ ...newUser, role: r.key })
                            }
                            className={`${
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            } px-4 py-2 text-sm font-medium border-r last:border-r-0 border-gray-300`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {creating && (
                        <svg
                          className="h-4 w-4 animate-spin"
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
                      )}
                      Tạo người dùng
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddCategoryModal(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Thêm danh mục
                  </h3>
                  <button
                    aria-label="Close"
                    className="p-2 rounded-lg hover:bg-gray-100"
                    onClick={() => setShowAddCategoryModal(false)}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <form
                  onSubmit={handleCreateCategory}
                  className="px-6 py-5 space-y-4"
                >
                  {categoryError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                      {categoryError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên
                    </label>
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Tên danh mục"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <input
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      placeholder="Mô tả ngắn"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingCategory}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingCategory && (
                        <svg
                          className="h-4 w-4 animate-spin"
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
                      )}
                      Tạo danh mục
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Tag Modal */}
        {showAddTagModal && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddTagModal(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Thêm thẻ
                  </h3>
                  <button
                    aria-label="Close"
                    className="p-2 rounded-lg hover:bg-gray-100"
                    onClick={() => setShowAddTagModal(false)}
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <form
                  onSubmit={handleCreateTag}
                  className="px-6 py-5 space-y-4"
                >
                  {tagError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                      {tagError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên thẻ
                    </label>
                    <input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="ví dụ: React"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTagModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={savingTag}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {savingTag && (
                        <svg
                          className="h-4 w-4 animate-spin"
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
                      )}
                      Tạo thẻ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default AdminDashboard;
