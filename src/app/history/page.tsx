"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

interface AttendanceWithEmployee extends AttendanceRecord {
  employee?: Employee;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<AttendanceWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/attendance?limit=100");
      if (!response.ok) throw new Error("Failed to load attendance records");
      
      const data = await response.json();
      
      // Fetch employee details for each record
      const recordsWithEmployees = await Promise.all(
        data.map(async (record: AttendanceRecord) => {
          try {
            const empResponse = await fetch(`/api/employees?id=${record.employeeId}`);
            if (empResponse.ok) {
              const employee = await empResponse.json();
              return { ...record, employee };
            }
          } catch (error) {
            console.error("Error loading employee:", error);
          }
          return record;
        })
      );
      
      setRecords(recordsWithEmployees);
    } catch (error) {
      console.error("Error loading attendance records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;
  const totalMinutes = records
    .filter(r => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0);
  const avgHours = totalMinutes > 0 && presentDays > 0 ? (totalMinutes / 60 / presentDays).toFixed(1) : '0';

  const getCheckInMethodBadge = (method: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      nfc: { label: "NFC", variant: "default" },
      geolocation: { label: "Location", variant: "secondary" },
      manual: { label: "Manual", variant: "outline" },
    };
    return badges[method] || { label: method, variant: "outline" };
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground">View all attendance records</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{totalDays}</p>
                  <p className="text-xs text-muted-foreground">Total Days</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{presentDays}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                  <p className="text-2xl font-bold">{avgHours}h</p>
                  <p className="text-xs text-muted-foreground">Avg/Day</p>
                </CardContent>
              </Card>
            </div>

            {leaveDays > 0 && (
              <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                <CardContent className="pt-6">
                  <p className="text-sm">
                    <span className="font-semibold text-orange-700 dark:text-orange-400">
                      {leaveDays} day{leaveDays !== 1 ? 's' : ''}
                    </span>{' '}
                    marked as leave due to missing check-out
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Records List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Records</h2>
              
              {records.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No attendance records yet</p>
                  </CardContent>
                </Card>
              ) : (
                records.map((record) => {
                  const methodBadge = getCheckInMethodBadge(record.checkInMethod);
                  return (
                    <Card key={record.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{formatDate(record.date)}</CardTitle>
                            {record.employee && (
                              <p className="text-sm text-muted-foreground mt-1">{record.employee.name}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                              {record.status === 'present' ? 'Present' : 'Leave'}
                            </Badge>
                            <Badge variant={methodBadge.variant} className="text-xs">
                              {methodBadge.label}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Time In</p>
                            <p className="font-semibold">{formatTime(record.timeIn)}</p>
                          </div>

                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Time Out</p>
                            <p className="font-semibold">
                              {record.timeOut ? formatTime(record.timeOut) : (
                                <span className="text-orange-600">Not checked out</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {record.duration && (
                          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                            <Clock className="h-4 w-4 text-primary" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="font-semibold">{formatDuration(record.duration)}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}