"use client";
import React, { useMemo, useState } from "react";
import {
  TrashIcon,
  PlusIcon,
  ArrowUturnLeftIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

export interface AdminUserItem {
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

export type AdminUsersProps = {
  users: AdminUserItem[];
  onCreateClick: () => void;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
};

const AdminUsers: React.FC<AdminUsersProps> = ({
  users,
  onCreateClick,
  onDelete,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"students" | "teachers">(
    "students"
  );

  const getRole = (u: AdminUserItem) =>
    (u.role as any) || u.userRoles?.[0]?.role?.role_name || "ROLE_STUDENT";
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const role = (getRole(u) || "").toString().toUpperCase();
      if (activeSubTab === "students") return role === "ROLE_STUDENT";
      if (activeSubTab === "teachers") return role === "ROLE_TEACHER";
      return false;
    });
  }, [users, activeSubTab]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Quản lý người dùng
        </h3>
        <button
          onClick={onCreateClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Tạo người dùng
        </button>
      </div>

      {/* Sub-tabs for Students / Teachers */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: "students", label: "Học viên" },
              { key: "teachers", label: "Giảng viên" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === tab.key
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

      <div className="space-y-4">
        {filteredUsers.length === 0 && (
          <div className="text-sm text-gray-500">
            Không tìm thấy người dùng.
          </div>
        )}
        {filteredUsers.map((user) => (
          <div key={user.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {(user.firstName || "").toString()}{" "}
                  {(user.lastName || "").toString()}
                </h4>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {getRole(user).replace("ROLE_", "")}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      (user.status || "").toUpperCase() === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Tham gia ngày {""}
                    {new Date(
                      user.created_at || (user.createdAt as any)
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {(user.status || "").toUpperCase() === "BLOCKED" ? (
                  <button
                    onClick={async () => {
                      try {
                        await apiService.unblockUser(user.id);
                        toast.success("Khôi phục tài khoản thành công");
                        onRefresh && onRefresh();
                      } catch (e) {
                        toast.error("Khôi phục thất bại");
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                    title="Khôi phục tài khoản"
                  >
                    <ArrowUturnLeftIcon className="h-4 w-4" /> Khôi phục
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!confirm("Chặn người dùng này?")) return;
                      try {
                        await apiService.blockUser(user.id);
                        toast.success("Đã chặn tài khoản");
                        onRefresh && onRefresh();
                      } catch (e) {
                        toast.error("Chặn thất bại");
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                    title="Chặn người dùng"
                  >
                    <NoSymbolIcon className="h-4 w-4" /> Chặn
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
