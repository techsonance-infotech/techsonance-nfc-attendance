"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Clock, 
  Radio, 
  Settings, 
  LogOut,
  Menu,
  Building2
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { useState } from "react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "hr", "employee"]
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: Users,
    roles: ["admin", "hr"]
  },
  {
    name: "NFC Enrollments",
    href: "/dashboard/enrollments",
    icon: CreditCard,
    roles: ["admin", "hr"]
  },
  {
    name: "Attendance",
    href: "/dashboard/attendance",
    icon: Clock,
    roles: ["admin", "hr"]
  },
  {
    name: "Reader Devices",
    href: "/dashboard/readers",
    icon: Radio,
    roles: ["admin", "hr"]
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["admin"]
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, refetch } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = (session?.user as any)?.role || "employee";

  const filteredNav = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      toast.success("Signed out successfully");
      router.push("/");
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          <div>
            <h1 className="text-xl font-bold">NFC Attendance</h1>
            <p className="text-xs text-muted-foreground">Management Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            Role: {userRole}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r flex-col">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <h1 className="text-lg font-semibold">NFC Attendance</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
