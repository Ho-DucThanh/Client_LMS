"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  BellIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { notificationService } from "../services/api-notification";

const Header = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const toggleMenu = () => setIsMenuOpen((s) => !s);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    return "/dashboard";
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isAuthenticated) return;
      try {
        const res = await notificationService.getNotifications();
        const body = res?.data || res;
        const list = body?.data || body;
        if (mounted) {
          setNotifications(list || []);
          setUnreadCount(body?.unreadCount ?? body?.unread_count ?? 0);
        }
      } catch (err) {
        console.debug("Failed to load notifications", err);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const openNotifications = async () => {
    const next = !isNotifOpen;
    setIsNotifOpen(next);
    try {
      // if opening, mark all as read on server and clear badge locally
      if (next) {
        await notificationService.markAllAsRead();
        setUnreadCount(0);
      }

      const res = await notificationService.getNotifications();
      const body = res?.data || res;
      const list = body?.data || body;
      setNotifications(list || []);
    } catch (err) {
      console.debug("Failed to refresh notifications", err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.debug("Failed to mark read", err);
    }
  };

  return (
    <div className="sticky top-0 z-50">
      {unreadCount > 0 && notifications[0] && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm px-4 py-2 flex items-center justify-center">
          <div className="max-w-7xl w-full flex items-center justify-between">
            <div>
              New activity: <strong>{notifications[0].title}</strong> —{" "}
              {notifications[0].message}
            </div>
            <div>
              <button
                onClick={openNotifications}
                className="underline text-blue-600 text-sm"
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                ELearning
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/courses"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Courses
              </Link>
              <Link
                href="/forum"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Forum
              </Link>
              {isAuthenticated && user?.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Admin
                </Link>
              )}
              {isAuthenticated && user?.role === "LECTURER" && (
                <Link
                  href="/instructor"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Instructor
                </Link>
              )}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <button
                      onClick={openNotifications}
                      className="text-gray-700 hover:text-blue-600 transition-colors relative"
                      aria-label="Notifications"
                    >
                      <BellIcon className="h-6 w-6" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {isNotifOpen && (
                      <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white rounded-md shadow-lg border border-gray-200 z-20">
                        <div className="px-4 py-2 border-b flex items-center justify-between">
                          <span className="font-medium">Notifications</span>
                          <button
                            onClick={() => {
                              setNotifications([]);
                              setUnreadCount(0);
                            }}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Clear
                          </button>
                        </div>

                        {notifications.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          <div className="divide-y">
                            {notifications.map((n) => (
                              <div
                                key={n.id}
                                className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm">
                                      {n.title}
                                    </div>
                                    <div className="text-xs text-gray-400 ml-2">
                                      {n.created_at || n.createdAt
                                        ? new Date(
                                            n.created_at || n.createdAt
                                          ).toLocaleString()
                                        : ""}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {n.message}
                                  </div>
                                  {n.action_url && (
                                    <a
                                      href={n.action_url}
                                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                    >
                                      Open
                                    </a>
                                  )}
                                </div>
                                {!n.is_read && (
                                  <button
                                    onClick={() => markAsRead(n.id)}
                                    className="text-xs text-blue-600 ml-2"
                                  >
                                    Mark
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={getDashboardLink()}
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsProfileDropdownOpen(!isProfileDropdownOpen)
                      }
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <UserIcon className="h-6 w-6" />
                      <span>{user?.firstName}</span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>

                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            Profile
                          </Link>
                          <Link
                            href="/settings"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            Settings
                          </Link>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              handleLogout();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <nav className="flex flex-col space-y-4">
                <Link
                  href="/"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/courses"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Courses
                </Link>
                <Link
                  href="/forum"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Forum
                </Link>

                {/* Mobile Auth */}
                {isAuthenticated ? (
                  <>
                    <Link
                      href={getDashboardLink()}
                      className="text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <div className="flex items-center space-x-2 text-gray-700">
                      <UserIcon className="h-6 w-6" />
                      <span>{user?.firstName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                      className="text-left text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-gray-700 hover:text-blue-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default Header;
