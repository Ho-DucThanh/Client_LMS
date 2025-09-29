"use client";
import React from "react";
import {
  UsersIcon,
  BookOpenIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export type AdminStatsProps = {
  stats: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    activeUsers: number;
    newUsersThisMonth: number;
  };
};

const AdminStats: React.FC<AdminStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng người dùng</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalUsers}
            </p>
          </div>
          <UsersIcon className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng khóa học</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalCourses}
            </p>
          </div>
          <BookOpenIcon className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Lượt ghi danh</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalEnrollments}
            </p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-yellow-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.totalRevenue.toLocaleString()}
            </p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Người dùng hoạt động</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.activeUsers}
            </p>
          </div>
          <UsersIcon className="h-8 w-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Người dùng mới</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.newUsersThisMonth}
            </p>
          </div>
          <UsersIcon className="h-8 w-8 text-blue-500" />
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
