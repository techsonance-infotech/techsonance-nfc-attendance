"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, LayoutDashboard, LogOut, Home, ClipboardEdit, Receipt, Wallet, BarChart3, IndianRupee } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { refetch } = useSession();

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

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/employees", label: "Employees", icon: Users },
    { href: "/admin/manual-attendance", label: "Manual Entry", icon: ClipboardEdit },
  ];

  const financeMenuItems = [
    { href: "/admin/finance/invoices", label: "Invoices & Payments", icon: Receipt },
    { href: "/admin/finance/expenses", label: "Expenses", icon: Wallet },
    { href: "/admin/finance/payroll", label: "Payroll System", icon: IndianRupee },
    { href: "/admin/finance/reports", label: "Reports", icon: BarChart3 },
  ];

  const isFinanceActive = pathname?.startsWith("/admin/finance");

  return (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Admin Portal</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Employee View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            );
          })}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isFinanceActive ? "default" : "ghost"}
                size="sm"
                className="whitespace-nowrap"
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Finance
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {financeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={isActive ? "bg-accent" : ""}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, LayoutDashboard, LogOut, Home, ClipboardEdit, Receipt, Wallet, BarChart3, DollarSign, IndianRupee } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { refetch } = useSession();

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

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/employees", label: "Employees", icon: Users },
    { href: "/admin/manual-attendance", label: "Manual Entry", icon: ClipboardEdit },
  ];

  const financeMenuItems = [
    { href: "/admin/finance/invoices", label: "Invoices & Payments", icon: Receipt },
    { href: "/admin/finance/expenses", label: "Expenses", icon: Wallet },
    { href: "/admin/finance/payroll", label: "Payroll System", icon: DollarSign },
    { href: "/admin/finance/reports", label: "Reports", icon: BarChart3 },
  ];

  const isFinanceActive = pathname?.startsWith("/admin/finance");

  return (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Admin Portal</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Employee View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            );
          })}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isFinanceActive ? "default" : "ghost"}
                size="sm"
                className="whitespace-nowrap"
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Finance
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {financeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={isActive ? "bg-accent" : ""}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}