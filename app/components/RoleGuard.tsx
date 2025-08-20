"use client";
import React from "react";
import { useAuth } from "../contexts/AuthContext";

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  children,
  fallback,
}) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  const userRole = (user as any)?.role as string | undefined;
  const userRoles: string[] = Array.isArray((user as any)?.roles)
    ? ((user as any).roles as string[])
    : userRole
    ? [userRole]
    : [];

  const allowed = userRoles.some((r) => roles.includes(r));

  if (!user || !allowed) {
    return (
      fallback || (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You do not have permission to view this page.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};
