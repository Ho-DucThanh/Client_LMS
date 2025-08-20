export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatar?: string;
  status: string;
  created_at: string;
  userRoles: Array<{
    role: {
      id: number;
      role_name: string;
    };
  }>;
}

// Form interfaces
export interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  bio: string;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

