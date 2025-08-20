"use client";
import React from "react";
import { PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import { UserProfile, EditForm } from "../types";

interface ProfileFormProps {
  profile: UserProfile;
  editing: boolean;
  editForm: EditForm;
  loading: boolean;
  onEdit: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  formatDate: (dateString: string) => string;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  editing,
  editForm,
  loading,
  onEdit,
  onSave,
  onCancel,
  onInputChange,
  formatDate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">
          Thông tin chi tiết
        </h3>
        {!editing && (
          <button
            onClick={onEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Chỉnh sửa</span>
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ
              </label>
              <input
                type="text"
                name="firstName"
                value={editForm.firstName}
                onChange={onInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Nhập họ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên
              </label>
              <input
                type="text"
                name="lastName"
                value={editForm.lastName}
                onChange={onInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Nhập tên"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                value={editForm.phone}
                onChange={onInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ
              </label>
              <input
                type="text"
                name="address"
                value={editForm.address}
                onChange={onInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Nhập địa chỉ"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giới thiệu bản thân
            </label>
            <textarea
              name="bio"
              value={editForm.bio}
              onChange={onInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              placeholder="Viết vài dòng giới thiệu về bản thân..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <CheckIcon className="h-4 w-4" />
              <span>{loading ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Giới thiệu bản thân
            </h4>
            <p className="text-lg text-gray-900 leading-relaxed">
              {profile?.bio || "Chưa có thông tin giới thiệu"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Họ và tên
                </h4>
                <p className="text-lg text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Email
                </h4>
                <p className="text-lg text-gray-900">{profile?.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </h4>
                <p className="text-lg text-gray-900">
                  {profile?.phone || "Chưa cập nhật"}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Ngày tham gia
                </h4>
                <p className="text-lg text-gray-900">
                  {profile?.created_at ? formatDate(profile.created_at) : "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ
                </h4>
                <p className="text-lg text-gray-900">
                  {profile?.address || "Chưa cập nhật"}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Vai trò
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile?.userRoles?.map((userRole, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {userRole.role.role_name === "ROLE_ADMIN"
                        ? "Quản trị viên"
                        : userRole.role.role_name === "ROLE_TEACHER"
                        ? "Giảng viên"
                        : userRole.role.role_name === "ROLE_STUDENT"
                        ? "Học viên"
                        : userRole.role.role_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileForm;
