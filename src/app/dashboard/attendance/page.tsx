"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search,
  Download,
  Filter,
  Calendar as CalendarIcon,
  Loader2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NFCAttendanceToggle from "@/components/NFCAttendanceToggle";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  timeIn: string;
  timeOut: string | null;
  status: string;
  readerId: string | null;
  location: string | null;
  tagUid: string | null;
  duration: number | null;
  checkInMethod: string;
  employee: {
    name: string;
    email: string;
    department: string;
    photoUrl?: string | null;
  };
}

interface Employee {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
}

interface Reader {
  id: number;
  readerId: string;
  location: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedReader, setSelectedReader] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  // Manual Entry Dialog
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    employeeId: "",
    checkIn: "",
    checkOut: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch attendance records
  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const params = new URLSearchParams();

      if (dateFrom) {
        params.append("start_date", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        params.append("end_date", format(dateTo, "yyyy-MM-dd"));
      }
      if (selectedDepartment && selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }
      if (selectedReader && selectedReader !== "all") {
        params.append("reader_id", selectedReader);
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      const response = await fetch(`/api/attendance?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch attendance");
      const data = await response.json();
      
      // Handle both array response and object with records property
      const recordsArray = Array.isArray(data) ? data : (data.records || []);
      setRecords(recordsArray);
      setLastSync(new Date());
    } catch (error) {
      toast.error("Failed to load attendance records");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      
      // Handle both array and object response
      const employeesArray = Array.isArray(data) ? data : (data.employees || []);
      setEmployees(employeesArray);
    } catch (error) {
      console.error("Failed to load employees:", error);
      toast.error("Failed to load employees");
    }
  };

  // Fetch readers
  const fetchReaders = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/readers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch readers");
      const data = await response.json();
      
      // Handle both array and object response
      const readersArray = Array.isArray(data) ? data : (data.readers || []);
      setReaders(readersArray);
    } catch (error) {
      console.error("Failed to load readers:", error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
    fetchReaders();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAttendance();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateFrom, dateTo, selectedDepartment, selectedReader, selectedStatus]);

  // Filter and search records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || record.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee Name",
      "Email",
      "Department",
      "Check In",
      "Check Out",
      "Duration (min)",
      "Status",
      "Location",
      "Reader ID",
      "Check-in Method",
    ];

    const rows = filteredRecords.map((record) => [
      record.date,
      record.employee?.name || "N/A",
      record.employee?.email || "N/A",
      record.employee?.department || "N/A",
      format(new Date(record.timeIn), "yyyy-MM-dd HH:mm:ss"),
      record.timeOut ? format(new Date(record.timeOut), "yyyy-MM-dd HH:mm:ss") : "—",
      record.duration?.toString() || "—",
      record.status,
      record.location || "—",
      record.readerId || "—",
      record.checkInMethod || "manual",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Attendance report exported successfully");
  };

  // Handle manual attendance entry
  const handleManualEntry = async () => {
    if (!manualEntry.employeeId || !manualEntry.checkIn) {
      toast.error("Please select an employee and provide check-in time");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: parseInt(manualEntry.employeeId),
          checkIn: new Date(manualEntry.checkIn).toISOString(),
          checkOut: manualEntry.checkOut ? new Date(manualEntry.checkOut).toISOString() : null,
          notes: manualEntry.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add manual entry");
      }

      toast.success("Manual attendance entry added successfully");
      setManualDialogOpen(false);
      setManualEntry({ employeeId: "", checkIn: "", checkOut: "", notes: "" });
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.message || "Failed to add manual entry");
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique departments
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort();

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "default";
      case "late":
        return "destructive";
      case "on_leave":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Single NFC reader for Time In and Time Out
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setManualDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* NFC Attendance Toggle */}
      <NFCAttendanceToggle 
        readerId={readers[0]?.readerId || "MAIN_READER"}
        location={readers[0]?.location || "Main Entrance"}
        onSuccess={() => {
          fetchAttendance();
        }}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRecords.length}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((r) => r.status === "present").length}
            </div>
            <p className="text-xs text-muted-foreground">On time arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((r) => r.status === "late").length}
            </div>
            <p className="text-xs text-muted-foreground">Tardy check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
            <LogOut className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRecords.filter((r) => r.timeOut !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">Completed records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Last synced: {format(lastSync, "PPpp")} • Auto-refresh every 30s
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reader */}
            <div className="space-y-2">
              <Label>Reader</Label>
              <Select value={selectedReader} onValueChange={setSelectedReader}>
                <SelectTrigger>
                  <SelectValue placeholder="All Readers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Readers</SelectItem>
                  {readers.map((reader) => (
                    <SelectItem key={reader.id} value={reader.readerId}>
                      {reader.readerId} - {reader.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <Label className="opacity-0">Clear</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm("");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSelectedDepartment("all");
                  setSelectedReader("all");
                  setSelectedStatus("all");
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Attendance Records ({startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of{" "}
            {filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.employee?.name || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.employee?.email || ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.employee?.department || "N/A"}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(record.timeIn), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.timeOut
                          ? format(new Date(record.timeOut), "HH:mm:ss")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.duration ? `${record.duration} min` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline">
                          {record.checkInMethod === "nfc" ? "NFC" : "Manual"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
            <DialogDescription>
              Add attendance record manually for HR adjustments or corrections
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="manual-employee">Employee</Label>
              <Select
                value={manualEntry.employeeId}
                onValueChange={(value) =>
                  setManualEntry((prev) => ({ ...prev, employeeId: value }))
                }
              >
                <SelectTrigger id="manual-employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} ({employee.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check In Time */}
            <div className="space-y-2">
              <Label htmlFor="check-in">Check In Time</Label>
              <Input
                id="check-in"
                type="datetime-local"
                value={manualEntry.checkIn}
                onChange={(e) =>
                  setManualEntry((prev) => ({ ...prev, checkIn: e.target.value }))
                }
              />
            </div>

            {/* Check Out Time */}
            <div className="space-y-2">
              <Label htmlFor="check-out">Check Out Time (Optional)</Label>
              <Input
                id="check-out"
                type="datetime-local"
                value={manualEntry.checkOut}
                onChange={(e) =>
                  setManualEntry((prev) => ({ ...prev, checkOut: e.target.value }))
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="Reason for manual entry..."
                value={manualEntry.notes}
                onChange={(e) => setManualEntry((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManualDialogOpen(false);
                setManualEntry({ employeeId: "", checkIn: "", checkOut: "", notes: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleManualEntry} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}