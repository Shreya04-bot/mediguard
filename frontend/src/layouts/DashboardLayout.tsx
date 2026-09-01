import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <DashboardNavbar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
