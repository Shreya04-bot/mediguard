import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-xl gradient-primary flex items-center justify-center">
            <Spinner className="size-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading MediGuard AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

  return <>{children}</>;
}
