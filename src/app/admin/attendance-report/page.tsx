"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Filter, Loader2, Download, Edit, Clock, UserCheck } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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

export default function AttendanceReportPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  
  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  
  // Dialog states
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [updateTimeIn, setUpdateTimeIn] = useState("");
  const [updateTimeOut, setUpdateTimeOut] = useState("");

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
      loadData();
    }
  }, [session, isPending, router]);

  useEffect(() => {
    applyFilters();
  }, [selectedEmployee, selectedStatus, dateFrom, dateTo, selectedMonth, attendanceRecords]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load employees
      const empResponse = await fetch("/api/employees?limit=1000");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const empData = await empResponse.json();
      setEmployees(empData);

      // Load all attendance records
      const attResponse = await fetch("/api/attendance?limit=1000");
      if (!attResponse.ok) throw new Error("Failed to load attendance");
      const attData = await attResponse.json();
      setAttendanceRecords(attData);
      setFilteredRecords(attData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendanceRecords];

    // Filter by employee
    if (selectedEmployee !== "all") {
      filtered = filtered.filter((r) => r.employeeId === parseInt(selectedEmployee));
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((r) => r.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((r) => r.date <= dateTo);
    }

    // Filter by month
    if (selectedMonth) {
      filtered = filtered.filter((r) => r.date.startsWith(selectedMonth));
    }

    setFilteredRecords(filtered);
  };

  const clearFilters = () => {
    setSelectedEmployee("all");
    setSelectedStatus("all");
    setDateFrom("");
    setDateTo("");
    setSelectedMonth("");
  };

  const openUpdateDialog = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setUpdateTimeIn(record.timeIn);
    setUpdateTimeOut(record.timeOut || "");
    setIsUpdateDialogOpen(true);
  };

  const handleUpdateAttendance = async () => {
    if (!selectedRecord) return;

    if (!updateTimeIn) {
      toast.error("Time in is required");
      return;
    }

    try {
      const timeInDate = new Date(updateTimeIn);
      const timeOutDate = updateTimeOut ? new Date(updateTimeOut) : null;

      // Calculate duration if both times are provided
      let duration = null;
      if (timeOutDate && timeInDate) {
        duration = Math.floor((timeOutDate.getTime() - timeInDate.getTime()) / (1000 * 60));
        
        if (duration < 0) {
          toast.error("Time out must be after time in");
          return;
        }
      }

      const response = await fetch(`/api/attendance?id=${selectedRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_in: timeInDate.toISOString(),
          time_out: timeOutDate ? timeOutDate.toISOString() : null,
          duration,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      toast.success("Attendance updated successfully");
      setIsUpdateDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error updating attendance:", error);
      toast.error(error.message || "Failed to update attendance");
    }
  };

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = ["Employee", "Date", "Time In", "Time Out", "Duration (hours)", "Status", "Method"];
    const rows = filteredRecords.map((record) => {
      const employee = employees.find((e) => e.id === record.employeeId);
      return [
        employee?.name || "Unknown",
        record.date,
        new Date(record.timeIn).toLocaleString(),
        record.timeOut ? new Date(record.timeOut).toLocaleString() : "N/A",
        record.duration ? (record.duration / 60).toFixed(2) : "N/A",
        record.status,
        record.checkInMethod,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  };

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      months.push({ value, label });
    }
    return months;
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Attendance Report</h2>
            <p className="text-muted-foreground">
              View and manage employee attendance records
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Employee Filter */}
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Months</SelectItem>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {attendanceRecords.length} records
          </p>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardContent className="p-0">
            {filteredRecords.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(record.employeeId)}
                        </TableCell>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatTime(record.timeIn)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.timeOut ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatTime(record.timeOut)}
                            </div>
                          ) : (
                            <Badge variant="secondary">Missing</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.duration ? (
                            `${(record.duration / 60).toFixed(1)}h`
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "present" ? "default" : "destructive"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {record.checkInMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUpdateDialog(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Attendance Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
            <DialogDescription>
              Update check-in and check-out times for {selectedRecord && getEmployeeName(selectedRecord.employeeId)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timeIn">Time In *</Label>
              <Input
                id="timeIn"
                type="datetime-local"
                value={updateTimeIn.slice(0, 16)}
                onChange={(e) => setUpdateTimeIn(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeOut">Time Out</Label>
              <Input
                id="timeOut"
                type="datetime-local"
                value={updateTimeOut ? updateTimeOut.slice(0, 16) : ""}
                onChange={(e) => setUpdateTimeOut(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if employee hasn't checked out yet
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAttendance}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
