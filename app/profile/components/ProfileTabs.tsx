"use client";
import React from "react";
import { UserIcon, KeyIcon } from "@heroicons/react/24/outline";

interface ProfileTabsProps {
  activeTab: "profile" | "security";
  onTabChange: (tab: "profile" | "security") => void;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6">
        <button
          onClick={() => onTabChange("profile")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
            activeTab === "profile"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>Thông tin cá nhân</span>
          </div>
        </button>
        <button
          onClick={() => onTabChange("security")}
          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
            activeTab === "security"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <KeyIcon className="h-5 w-5" />
            <span>Bảo mật</span>
          </div>
        </button>
      </nav>
    </div>
  );
};

export default ProfileTabs;
