"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface TodaySummary {
  date: string;
  summary: {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    onTime: number;
    checkedOut: number;
    stillWorking: number;
  };
  records: AttendanceRecord[];
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  employee: {
    name: string;
    email: string;
    department: string;
    photoUrl: string | null;
  };
  date: string;
  timeIn: string;
  timeOut: string | null;
  duration: number | null;
  status: string;
  checkInMethod: string;
  location: string | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaySummary();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTodaySummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaySummary = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/attendance/today", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch today's summary");
      }

      const data = await response.json();
      setTodaySummary(data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load today's attendance summary");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      present: { variant: "default", label: "Present" },
      late: { variant: "destructive", label: "Late" },
      half_day: { variant: "secondary", label: "Half Day" },
      absent: { variant: "outline", label: "Absent" },
    };

    const config = variants[status] || variants.present;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role || "employee";
  const canViewSummary = ["admin", "hr"].includes(userRole);

  if (!canViewSummary) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to view the dashboard. Please contact an administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Today's attendance overview - {new Date().toLocaleDateString("en-US", { 
            weekday: "long", 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          })}
        </p>
      </div>

      {/* Statistics Cards */}
      {todaySummary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySummary.summary.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySummary.summary.present}</div>
                <p className="text-xs text-muted-foreground">
                  {todaySummary.summary.onTime} on time, {todaySummary.summary.late} late
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySummary.summary.absent}</div>
                <p className="text-xs text-muted-foreground">Not checked in</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Still Working</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaySummary.summary.stillWorking}</div>
                <p className="text-xs text-muted-foreground">
                  {todaySummary.summary.checkedOut} checked out
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Check-ins */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Check-ins</CardTitle>
                  <CardDescription>Latest employee check-ins</CardDescription>
                </div>
                <Badge variant="secondary">
                  Last updated: {new Date().toLocaleTimeString("en-US", { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {todaySummary.records.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No check-ins recorded today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySummary.records.slice(0, 10).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {record.employee.name.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{record.employee.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.employee.department || "No department"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{formatTime(record.timeIn)}</span>
                          </div>
                          {record.timeOut && (
                            <p className="text-xs text-muted-foreground">
                              Out: {formatTime(record.timeOut)}
                            </p>
                          )}
                          {record.duration && (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(record.duration)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(record.status)}
                          <Badge variant="outline" className="text-xs">
                            {record.checkInMethod.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Rate</CardTitle>
              <CardDescription>Today's attendance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Attendance Rate</span>
                    <span className="text-sm font-bold">
                      {todaySummary.summary.totalEmployees > 0
                        ? Math.round((todaySummary.summary.present / todaySummary.summary.totalEmployees) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${todaySummary.summary.totalEmployees > 0
                          ? (todaySummary.summary.present / todaySummary.summary.totalEmployees) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">On-Time Rate</span>
                    <span className="text-sm font-bold">
                      {todaySummary.summary.present > 0
                        ? Math.round((todaySummary.summary.onTime / todaySummary.summary.present) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{
                        width: `${todaySummary.summary.present > 0
                          ? (todaySummary.summary.onTime / todaySummary.summary.present) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
