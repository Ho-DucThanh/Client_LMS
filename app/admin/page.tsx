"use client";
import React, { useEffect, useState } from "react";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import Heading from "../utils/Heading";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { RoleGuard } from "../components/RoleGuard";
import AdminStats from "../components/admin/AdminStats";
import AdminUsers from "../components/admin/AdminUsers";
import AdminCourses from "../components/admin/AdminCourses";
import { courseService } from "../services/api-course";

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
  const [showCreateUserModal, setShowCreateUserModal] =
    useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "ROLE_STUDENT",
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [u, cGlobal, cFiltered] = await Promise.all([
        apiService.get("/admin/users"),
        apiService.get(`/admin/courses?page=1&limit=1`), // minimal fetch to get global total
        apiService.get(
          `/admin/courses?page=${coursePage}&limit=${courseLimit}&approval_status=${encodeURIComponent(
            selectedApprovalStatus
          )}`
        ),
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

      // Compute stats locally
      const totalUsers = (u as any)?.total ?? usersList.length;
      const totalCourses = Number(globalCoursesTotal || gTotal || 0);
      const totalEnrollments = coursesList.reduce((sum, course: any) => {
        const enrollments = Array.isArray(course.enrollments)
          ? course.enrollments.length
          : Number(course.total_enrolled || 0);
        return sum + enrollments;
      }, 0);
      const totalRevenue = coursesList.reduce((sum, course: any) => {
        const price = Number(course.price || 0);
        const enrollments = Array.isArray(course.enrollments)
          ? course.enrollments.length
          : Number(course.total_enrolled || 0);
        return sum + price * enrollments;
      }, 0);

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
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
        role: "ROLE_STUDENT",
      });
      loadDashboardData();
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
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
          title="Admin Dashboard - EduPlatform"
          description="System administration and management"
          keywords="admin, dashboard, users, system"
        />
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard roles={["ROLE_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <Heading
          title="Admin Dashboard - EduPlatform"
          description="System administration and management"
          keywords="admin, dashboard, users, system"
        />
        <Header />

        <div className="container mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage users, courses, and system settings. Monitor platform
              performance and security.
            </p>
          </div>

          {/* Stats Cards */}
          <AdminStats stats={stats} />

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "users", label: "Users" },
                  { key: "courses", label: "Courses" },
                  { key: "analytics", label: "Analytics" },
                  { key: "settings", label: "Settings" },
                  { key: "security", label: "Security" },
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
                  System Health
                </h3>
                <div className="text-sm text-gray-600">
                  All systems operational. No incidents reported.
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="border border-gray-200 rounded-lg p-3">
                    New user registrations processed.
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    Courses published and updated.
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

          {activeTab === "analytics" && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Advanced analytics dashboard coming soon.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Track user engagement, course performance, revenue, and system
                metrics.
              </p>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  General Settings
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      defaultValue="EduPlatform"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Course Price
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
                <h4 className="font-semibold text-gray-900 mb-4">
                  Email Settings
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email
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
                  Authentication Settings
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Two-Factor Authentication
                    </span>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                      Enable
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Password Complexity Requirements
                    </span>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                      Enabled
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Session Timeout (minutes)
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
                  System Logs
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Failed login attempts (last 24h)</span>
                    <span className="text-red-600 font-semibold">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful logins (last 24h)</span>
                    <span className="text-green-600 font-semibold">1,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API requests (last hour)</span>
                    <span className="text-blue-600 font-semibold">2,156</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New User
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, firstName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, lastName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="ROLE_STUDENT">Student</option>
                    <option value="ROLE_TEACHER">Teacher</option>
                    <option value="ROLE_ADMIN">Admin</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default AdminDashboard;
