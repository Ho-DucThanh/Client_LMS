"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { baseApi } from "../services";
import { apiService } from "../services/api";
import { User, AuthContextType } from "../types";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      baseApi.setAuthToken(savedToken);
      apiService.setAuthToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await baseApi.post("/auth/login", {
        email,
        password,
      });
      console.log("Login response:", response);

      // Backend trả về response.data.result
      const result = response?.data?.result || response?.result || response;

      if (result?.token && result?.user) {
        const apiUser = result.user as any;
        const normalizedUser = {
          ...apiUser,
          // ensure both forms exist for compatibility
          roles: Array.isArray(apiUser.roles)
            ? (apiUser.roles as string[])
            : apiUser.role
            ? [apiUser.role]
            : [],
          role:
            apiUser.role ||
            (Array.isArray(apiUser.roles) ? apiUser.roles[0] : undefined),
        } as User as any;

        setToken(result.token);
        setUser(normalizedUser as any);
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
        baseApi.setAuthToken(result.token);
        apiService.setAuthToken(result.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await baseApi.post("/auth/register", userData);
      const result = response?.data;

      if (result?.id && result?.email) {
        console.log("Registration successful:", result);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    baseApi.setAuthToken(null);
    apiService.setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
