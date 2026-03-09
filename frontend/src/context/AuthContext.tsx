/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api, { getAccessToken, setAccessToken } from "@/lib/axios";

type User = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  roles: string[];
  permissions: string[];
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const buildFullName = (
    firstName?: string | null,
    lastName?: string | null,
    email?: string,
  ) => {
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    return name || email || "";
  };

  const fetchProfile = async () => {
    const res = await api.get("/users/me/profile");
    const profile = res.data?.profile as any;
    console.log(res.data);
    const roles = profile?.roles?.map((r: any) => r.name) || [];

    setUser({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      fullName: buildFullName(
        profile.firstName,
        profile.lastName,
        profile.email,
      ),
      roles,
      permissions: profile.permissions || [],
    });
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data?.accessToken ?? null;
    setAccessToken(token);
    await fetchProfile();
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const bootstrap = async () => {
    try {
      if (getAccessToken()) {
        await fetchProfile();
        return;
      }

      const res = await api.post("/auth/refresh");
      const token = res.data?.accessToken ?? null;
      setAccessToken(token);
      if (token) {
        await fetchProfile();
      } else {
        setUser(null);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
