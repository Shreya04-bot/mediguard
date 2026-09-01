import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginApi, registerApi, getCurrentUserApi, logoutApi } from "@/services/authService";

export type UserRole = "admin" | "doctor" | "patient";

export type Gender = "female" | "male" | "neutral";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  specialty?: string;
  // UI/avatar system. `gender` here is display-only (drives which
  // avatar/hero illustration set applies) and is separate from any
  // clinical gender field on a patient's medical profile.
  gender?: Gender | null;
  avatar_key?: string | null;
  profile_photo_url?: string | null;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{ pending: boolean }>;
  // Merges a partial user update (from a profile/avatar/gender save)
  // into context + localStorage, so every consumer (Sidebar, Navbar,
  // dashboards, profile pages) re-renders with the new value
  // immediately — no logout/login required.
  updateUser: (patch: Partial<User>) => void;
};

type RegisterData = {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
  verificationToken: string;
  medicalLicenseNumber?: string;
  hospitalAffiliation?: string;
  gender?: Gender;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "mediguard_token";
const USER_KEY = "mediguard_user";

function persistSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on load: if a token exists, verify it against
  // GET /auth/me rather than trusting the cached user object, so a
  // revoked/expired token doesn't leave the UI in a stale logged-in state.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    getCurrentUserApi()
      .then(({ user: restoredUser }) => {
        setUser(restoredUser);
        localStorage.setItem(USER_KEY, JSON.stringify(restoredUser));
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    const { token, user: loggedInUser } = await loginApi(email, password, role);
    persistSession(token, loggedInUser);
    setUser(loggedInUser);
  };

  const logout = () => {
    // Best-effort server-side invalidation; local logout proceeds
    // regardless so the user is never stuck signed in on the client.
    logoutApi().catch(() => {});
    clearSession();
    setUser(null);
  };

  const register = async (data: RegisterData) => {
    const result = await registerApi(data);
    if ("pending" in result && result.pending) {
      // e.g. doctor registrations awaiting admin verification — no
      // session is issued yet, so leave the user logged out.
      return { pending: true };
    }
    const { token, user: newUser } = result as { token: string; user: User };
    persistSession(token, newUser);
    setUser(newUser);
    return { pending: false };
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
