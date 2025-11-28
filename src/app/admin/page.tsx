"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, TrendingUp, AlertCircle, Loader2, IndianRupee } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
  nfcCardId: string | null;
  salary: number | null;
  hourlyRate: number | null;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  timeIn: string;
  timeOut: string | null;
  duration: number | null;
  status: string;
  checkInMethod: string;
}

interface DashboardStats {
  totalEmployees: number;
  employeesWithNFC: number;
  todayPresent: number;
  todayAbsent: number;
  avgWorkHours: number;
  totalLeaves: number;
  missingCheckouts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    employeesWithNFC: 0,
    todayPresent: 0,
    todayAbsent: 0,
    avgWorkHours: 0,
    totalLeaves: 0,
    missingCheckouts: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }

    if (!isPending && (session?.user as any)?.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/");
      return;
    }

    if (session?.user) {
      loadDashboardData();
    }
  }, [session, isPending, router]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load employees
      const empResponse = await fetch("/api/employees?limit=1000");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const empData = await empResponse.json();
      setEmployees(empData);

      // Get today's date
      const today = new Date().toISOString().split("T")[0];

      // Load today's attendance records only
      const todayAttResponse = await fetch(`/api/attendance?date=${today}&limit=1000`);
      if (!todayAttResponse.ok) throw new Error("Failed to load today's attendance");
      const todayAttData = await todayAttResponse.json();
      setRecentAttendance(todayAttData);

      // Load all attendance for average calculation
      const allAttResponse = await fetch("/api/attendance?limit=1000");
      if (!allAttResponse.ok) throw new Error("Failed to load attendance");
      const allAttData = await allAttResponse.json();

      // Calculate stats
      const presentToday = todayAttData.filter((r: AttendanceRecord) => r.status === "present").length;
      const leavesToday = todayAttData.filter((r: AttendanceRecord) => r.status === "leave").length;
      
      // Count records without checkout (timeOut is null and status is present)
      const missingCheckouts = todayAttData.filter(
        (r: AttendanceRecord) => r.status === "present" && r.timeOut === null
      ).length;
      
      // Calculate average work hours from completed records (with duration)
      const completedRecords = allAttData.filter((r: AttendanceRecord) => r.duration && r.duration > 0);
      const avgMinutes = completedRecords.length > 0
        ? completedRecords.reduce((sum: number, r: AttendanceRecord) => sum + (r.duration || 0), 0) / completedRecords.length
        : 0;
      
      // Count total leaves across all time
      const totalLeaves = allAttData.filter((r: AttendanceRecord) => r.status === "leave").length;
      
      setStats({
        totalEmployees: empData.length,
        employeesWithNFC: empData.filter((e: Employee) => e.nfcCardId).length,
        todayPresent: presentToday,
        todayAbsent: empData.length - presentToday - leavesToday,
        avgWorkHours: avgMinutes / 60,
        totalLeaves,
        missingCheckouts,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || (session?.user as any)?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Welcome Header */}
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {session.user.name}!</h2>
          <p className="text-muted-foreground">Here's what's happening with your team today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.employeesWithNFC} with NFC cards
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayPresent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.todayAbsent} absent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Work Hours</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgWorkHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground mt-1">Per employee per day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leaves</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.missingCheckouts} missing check-outs today</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Manage your team efficiently</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => router.push("/admin/employees")}
                >
                  Manage Employees
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => router.push("/admin/finance/payroll")}
                >
                  View Payroll
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => router.push("/admin/manual-attendance")}
                >
                  Manual Entry
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => router.push("/admin/attendance-report")}
                >
                  Attendance Report
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance</CardTitle>
            <CardDescription>Today's check-ins and check-outs</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance records for today</p>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{getEmployeeName(record.employeeId)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(record.timeIn)}
                        {record.timeOut && ` - ${formatTime(record.timeOut)}`}
                        {record.duration && ` (${(record.duration / 60).toFixed(1)}h)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={record.status === "present" ? "default" : "destructive"}>
                        {record.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {record.checkInMethod}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}