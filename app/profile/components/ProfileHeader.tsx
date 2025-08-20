"use client";
import React from "react";
import { CameraIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { UserProfile } from "../types";

interface ProfileHeaderProps {
  profile: UserProfile;
  avatarFile: File | null;
  avatarPreview: string | null;
  loading: boolean;
  onAvatarClick: () => void;
  onAvatarUpload: () => void;
  onAvatarCancel: () => void;
  formatDate: (dateString: string) => string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  avatarFile,
  avatarPreview,
  loading,
  onAvatarClick,
  onAvatarUpload,
  onAvatarCancel,
  formatDate,
}) => {
  return (
    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Header Content */}
      <div className="relative">
        {/* Cover Area */}
        <div className="h-48 flex items-end justify-end p-6">
          <div className="flex space-x-3">
            <div
              className={`bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-2 ${
                profile?.status === "ACTIVE" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <span className="text-white text-sm font-medium">
                {profile?.status === "ACTIVE" ? "● Hoạt động" : "● Bị khóa"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="relative px-8 pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-6 sm:space-y-0 sm:space-x-8 -mt-20">
            {/* Avatar Section */}
            <div className="relative flex-shrink-0">
              <div className="relative">
                <div
                  className="relative group cursor-pointer"
                  onClick={onAvatarClick}
                >
                  <div className="w-36 h-36 rounded-full bg-white p-2 shadow-2xl">
                    <img
                      className="w-full h-full rounded-full object-cover"
                      src={
                        avatarPreview ||
                        profile?.avatar ||
                        `https://ui-avatars.com/api/?name=${profile?.first_name}+${profile?.last_name}&size=144&background=3b82f6&color=ffffff`
                      }
                      alt={`${profile?.first_name} ${profile?.last_name}`}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <CameraIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                {/* Online Status Indicator */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
              </div>

              {/* Avatar Upload Controls */}
              {avatarFile && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={onAvatarUpload}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Lưu</span>
                  </button>
                  <button
                    onClick={onAvatarCancel}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-lg"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>Hủy</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Info Section */}
            <div className="flex-1 text-white min-w-0">
              <div className="space-y-4">
                {/* Name and Title */}
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">
                    {profile?.first_name} {profile?.last_name}
                  </h1>
                  <p className="text-xl text-blue-100 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                    {profile?.email}
                  </p>
                  {/* Bio */}
                  {profile?.bio && (
                    <p className="text-lg text-blue-50 leading-relaxed max-w-2xl">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap gap-3">
                  {profile?.userRoles?.map((userRole, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-4 py-2 border border-white border-opacity-30"
                    >
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-sm font-medium text-black">
                        {userRole.role.role_name === "ROLE_ADMIN"
                          ? "Quản trị viên"
                          : userRole.role.role_name === "ROLE_TEACHER"
                          ? "Giảng viên"
                          : userRole.role.role_name === "ROLE_STUDENT"
                          ? "Học viên"
                          : userRole.role.role_name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center space-x-6 pt-2">
                  <div className="flex items-center space-x-2 text-blue-100">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <span className="text-sm">
                      Tham gia{" "}
                      {profile?.created_at
                        ? formatDate(profile.created_at)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
