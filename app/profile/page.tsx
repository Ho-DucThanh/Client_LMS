"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { userService, baseApi, uploadService } from "../services";
import { UserProfile, EditForm, PasswordForm } from "./types";
import ProfileHeader from "./components/ProfileHeader";
import ProfileTabs from "./components/ProfileTabs";
import ProfileForm from "./components/ProfileForm";
import SecurityTab from "./components/SecurityTab";

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    bio: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (token) {
        baseApi.setAuthToken(token);
      }

      const response = await userService.getUserProfile();
      console.log("Profile response:", response);

      setProfile(response);
      setEditForm({
        firstName: response.first_name || "",
        lastName: response.last_name || "",
        phone: response.phone || "",
        address: response.address || "",
        bio: response.bio || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Không thể tải thông tin profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await userService.updateUserProfile(editForm);
      setProfile(response);
      setEditing(false);
      toast.success("Cập nhật profile thành công!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Không thể cập nhật profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setLoading(true);
      await userService.changeUserPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordChange(false);
      toast.success("Đổi mật khẩu thành công!");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.response?.data?.message || "Không thể đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;

    try {
      setLoading(true);
      const result = await uploadService.uploadAvatar(avatarFile);

      // Update profile with new avatar URL
      if (profile) {
        // Persist to backend if userService supports it
        try {
          await userService.updateUserProfile({ avatar: result.url } as any);
        } catch {}
        setProfile({ ...profile, avatar: result.url });
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Cập nhật avatar thành công!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Không thể tải lên avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarCancel = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vui lòng đăng nhập
          </h2>
          <p className="text-gray-600">
            Bạn cần đăng nhập để xem thông tin profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Lỗi</h2>
          <p className="text-gray-600">Không thể tải thông tin profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="font-medium">Trang chủ</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">
                Thông tin cá nhân
              </h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          avatarFile={avatarFile}
          avatarPreview={avatarPreview}
          loading={loading}
          onAvatarClick={handleAvatarClick}
          onAvatarUpload={uploadAvatar}
          onAvatarCancel={handleAvatarCancel}
          formatDate={formatDate}
        />

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6">
            {activeTab === "profile" && (
              <ProfileForm
                profile={profile}
                editing={editing}
                editForm={editForm}
                loading={loading}
                onEdit={() => setEditing(true)}
                onSave={handleUpdateProfile}
                onCancel={() => setEditing(false)}
                onInputChange={handleInputChange}
                formatDate={formatDate}
              />
            )}

            {activeTab === "security" && (
              <SecurityTab
                showPasswordChange={showPasswordChange}
                passwordForm={passwordForm}
                showCurrentPassword={showCurrentPassword}
                showNewPassword={showNewPassword}
                showConfirmPassword={showConfirmPassword}
                loading={loading}
                onShowPasswordChange={setShowPasswordChange}
                onPasswordFormChange={setPasswordForm}
                onToggleCurrentPassword={() =>
                  setShowCurrentPassword(!showCurrentPassword)
                }
                onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
                onToggleConfirmPassword={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                onPasswordSubmit={handlePasswordChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
