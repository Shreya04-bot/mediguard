import { Link, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  FileText,
  Brain,
  Activity,
  Settings,
  LogOut,
  Heart,
  Stethoscope,
  Shield,
  TrendingUp,
  Bell,
  MessageSquare,
  Mic,
  GitBranch,
  Leaf,
  BarChart3,
  Calendar,
  Database,
  Cpu,
  ClipboardList,
  UserRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/lib/utils";
import ProfileAvatar from "@/components/profile/ProfileAvatar";


/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const adminNav = [
  {
    title: "Overview",
    url: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Doctors",
    url: "/dashboard/admin/doctors",
    icon: Stethoscope,
  },
  {
    title: "Patients",
    url: "/dashboard/admin/patients",
    icon: Users,
  },
  {
    title: "Appointments",
    url: "/dashboard/admin/appointments",
    icon: Calendar,
  },
  {
    title: "Analytics",
    url: "/dashboard/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Disease Trends",
    url: "/dashboard/admin/trends",
    icon: TrendingUp,
  },
  {
    title: "ML Ops",
    url: "/dashboard/admin/mlops",
    icon: Cpu,
  },
  {
    title: "System Logs",
    url: "/dashboard/admin/logs",
    icon: Database,
  },
  {
    title: "Settings",
    url: "/dashboard/admin/settings",
    icon: Settings,
  },
];


/* =========================================================
   DOCTOR NAVIGATION
========================================================= */

const doctorNav = [
  {
    title: "Dashboard",
    url: "/dashboard/doctor",
    icon: LayoutDashboard,
  },
  {
    title: "My Patients",
    url: "/dashboard/doctor/patients",
    icon: Users,
  },
  {
    title: "Appointments",
    url: "/dashboard/doctor/appointments",
    icon: Calendar,
  },
  {
    title: "Predictions",
    url: "/dashboard/doctor/predictions",
    icon: Brain,
  },
  {
    title: "Reports & OCR",
    url: "/dashboard/doctor/reports",
    icon: FileText,
  },
  {
    title: "AI Assistant",
    url: "/dashboard/doctor/assistant",
    icon: MessageSquare,
  },
  {
    title: "Risk Analytics",
    url: "/dashboard/doctor/analytics",
    icon: Activity,
  },
];


/* =========================================================
   PATIENT NAVIGATION
========================================================= */

const patientNav = [
  {
    title: "My Health",
    url: "/dashboard/patient",
    icon: Heart,
  },
  {
    title: "Predict Disease",
    url: "/dashboard/patient/predict",
    icon: Brain,
  },
  {
    title: "Appointments",
    url: "/dashboard/patient/appointments",
    icon: Calendar,
  },
  {
    title: "My Reports",
    url: "/dashboard/patient/reports",
    icon: FileText,
  },
  {
    title: "Timeline",
    url: "/dashboard/patient/timeline",
    icon: GitBranch,
  },
  {
    title: "Symptom Chat",
    url: "/dashboard/patient/chat",
    icon: MessageSquare,
  },
  {
    title: "Voice Assistant",
    url: "/dashboard/patient/voice",
    icon: Mic,
  },
  {
    title: "Family Cluster",
    url: "/dashboard/patient/family",
    icon: Users,
  },
  {
    title: "Notifications",
    url: "/dashboard/patient/notifications",
    icon: Bell,
  },
];


/* =========================================================
   AYURVEDA NAVIGATION
========================================================= */

const ayurvedaNav = [
  {
    title: "Wellness Hub",
    url: "/ayurveda",
    icon: Leaf,
  },
  {
    title: "Prakriti Quiz",
    url: "/ayurveda/quiz",
    icon: ClipboardList,
  },
  {
    title: "Diet Plan",
    url: "/ayurveda/diet",
    icon: Heart,
  },
  {
    title: "Yoga Plan",
    url: "/ayurveda/yoga",
    icon: Activity,
  },
  {
    title: "Herbal Guide",
    url: "/ayurveda/herbs",
    icon: Leaf,
  },
];


/* =========================================================
   ROLE → NAVIGATION
========================================================= */

const navByRole = {
  admin: adminNav,
  doctor: doctorNav,
  patient: patientNav,
};


/* =========================================================
   MAIN SIDEBAR
========================================================= */

export function AppSidebar() {
  const { user, logout } = useAuth();

  const location = useLocation();

  const { state } = useSidebar();

  const collapsed = state === "collapsed";


  /* -------------------------------------------------------
     Role navigation
  ------------------------------------------------------- */

  const navItems = user
    ? navByRole[user.role] ?? patientNav
    : patientNav;


  /* -------------------------------------------------------
     Role labels
  ------------------------------------------------------- */

  const roleLabel = {
    admin: "Admin Portal",
    doctor: "Doctor Portal",
    patient: "Patient Portal",
  };


  /* -------------------------------------------------------
     Role colors
  ------------------------------------------------------- */

  const roleColors = {
    admin: "from-violet-500 to-purple-600",
    doctor: "from-blue-500 to-cyan-600",
    patient: "from-emerald-500 to-teal-600",
  };


  const roleColor = user
    ? roleColors[user.role] ?? roleColors.patient
    : roleColors.patient;


  /* -------------------------------------------------------
     Profile route
  ------------------------------------------------------- */

  const profileRoute = user
    ? `/dashboard/${user.role}/profile`
    : "/dashboard";


  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <SidebarHeader className="border-b border-sidebar-border pb-2">

        <SidebarMenu>

          <SidebarMenuItem>

            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent cursor-default"
            >

              <div className="flex items-center gap-3">

                {/* Logo */}
                <div
                  className={`
                    size-8
                    rounded-xl
                    bg-gradient-to-br
                    ${roleColor}
                    flex
                    items-center
                    justify-center
                    shrink-0
                  `}
                >
                  <Shield className="size-4 text-white" />
                </div>


                {/* Brand */}
                {!collapsed && (
                  <div className="flex flex-col">

                    <span className="font-bold text-sm leading-none">
                      MediGuard AI
                    </span>

                    <span className="text-xs text-muted-foreground mt-0.5">
                      {user
                        ? roleLabel[user.role]
                        : "Healthcare"}
                    </span>

                  </div>
                )}

              </div>

            </SidebarMenuButton>

          </SidebarMenuItem>

        </SidebarMenu>

      </SidebarHeader>


      {/* =====================================================
          PROFILE CARD
          
          THIS IS THE IMPORTANT NEW PART
      ===================================================== */}

      {user && (
        <div
          className={`
            px-3
            py-4
            ${collapsed ? "px-2" : ""}
          `}
        >

          <Link
            to={profileRoute}
            className={`
              group
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-sidebar-border
              bg-sidebar-accent/40
              p-2.5
              transition-all
              duration-200
              hover:bg-sidebar-accent
              hover:shadow-sm
              ${collapsed ? "justify-center" : ""}
            `}
          >

            {/* =================================================
                PROFILE AVATAR

                Uploaded photo →
                gender avatar fallback
            ================================================= */}

            <ProfileAvatar
              user={user}
              className={`
                shrink-0
                border-2
                border-background
                shadow-sm
                transition-transform
                duration-200
                group-hover:scale-105
                ${collapsed
                  ? "h-10 w-10"
                  : "h-11 w-11"}
              `}
            />


            {/* =================================================
                USER DETAILS
            ================================================= */}

            {!collapsed && (

              <div className="min-w-0 flex-1">

                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  {user?.name || "User"}
                </p>

                <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
                  {user?.role || "Patient"}
                </p>

              </div>

            )}

          </Link>

        </div>
      )}


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <SidebarContent>

        {/* ===================================================
            MAIN NAVIGATION
        =================================================== */}

        <SidebarGroup>

          <SidebarGroupLabel>
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>

            <SidebarMenu>

              {navItems.map((item) => {

                const isActive =
                  location.pathname === item.url;

                return (

                  <SidebarMenuItem key={item.url}>

                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >

                      <Link
                        to={item.url}
                        className="flex items-center gap-2"
                      >

                        <item.icon className="size-4" />

                        <span>
                          {item.title}
                        </span>

                      </Link>

                    </SidebarMenuButton>

                  </SidebarMenuItem>

                );

              })}

            </SidebarMenu>

          </SidebarGroupContent>

        </SidebarGroup>


        {/* ===================================================
            AYURVEDA
        =================================================== */}

        <SidebarGroup>

          <SidebarGroupLabel>
            Ayurveda
          </SidebarGroupLabel>

          <SidebarGroupContent>

            <SidebarMenu>

              {ayurvedaNav.slice(0, 2).map((item) => {

                const isActive =
                  location.pathname === item.url;

                return (

                  <SidebarMenuItem key={item.url}>

                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >

                      <Link
                        to={item.url}
                        className="flex items-center gap-2"
                      >

                        <item.icon className="size-4" />

                        <span>
                          {item.title}
                        </span>

                      </Link>

                    </SidebarMenuButton>

                  </SidebarMenuItem>

                );

              })}

            </SidebarMenu>

          </SidebarGroupContent>

        </SidebarGroup>

      </SidebarContent>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <SidebarSeparator />

      <SidebarFooter className="border-t border-sidebar-border pt-2">

        <SidebarMenu>

          {/* =================================================
              PROFILE
          ================================================= */}

          <SidebarMenuItem>

            <SidebarMenuButton
              asChild
              tooltip="Profile"
            >

              <Link
                to={profileRoute}
                className="flex items-center gap-2"
              >

                <UserRound className="size-4" />

                <span>
                  Profile
                </span>

              </Link>

            </SidebarMenuButton>

          </SidebarMenuItem>


          {/* =================================================
              SIGN OUT
          ================================================= */}

          <SidebarMenuItem>

            <SidebarMenuButton
              onClick={logout}
              tooltip="Sign Out"
              className="
                text-destructive
                hover:text-destructive
                hover:bg-destructive/10
              "
            >

              <LogOut className="size-4" />

              <span>
                Sign Out
              </span>

            </SidebarMenuButton>

          </SidebarMenuItem>

        </SidebarMenu>

      </SidebarFooter>


      {/* =====================================================
          COLLAPSE RAIL
      ===================================================== */}

      <SidebarRail />

    </Sidebar>
  );
}