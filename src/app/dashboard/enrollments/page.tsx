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
import { Search, Scan, Trash2, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
}

interface NfcTag {
  id: number;
  tagUid: string;
  status: string;
}

interface Enrollment {
  id: number;
  employeeId: number;
  tagId: number;
  enrolledAt: string;
  employee: {
    fullName: string;
    employeeId: string;
    department: string;
    email: string;
  };
  tag: {
    tagUid: string;
    status: string;
  };
}

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Enrollment dialog state
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [scannedTagUid, setScannedTagUid] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Fetch enrollments
  const fetchEnrollments = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/enrollments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch enrollments");
      const data = await response.json();
      setEnrollments(data.enrollments || []);
    } catch (error) {
      toast.error("Failed to load enrollments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees (not enrolled)
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
      
      // Filter out already enrolled employees
      const enrolledEmployeeIds = enrollments.map(e => e.employeeId);
      const availableEmployees = data.employees.filter(
        (emp: Employee) => !enrolledEmployeeIds.includes(emp.id)
      );
      
      setEmployees(availableEmployees);
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    if (enrollDialogOpen) {
      fetchEmployees();
    }
  }, [enrollDialogOpen, enrollments]);

  // Mock NFC scanner simulation
  const simulateNfcScan = () => {
    setIsScanning(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      // Generate random NFC UID
      const randomUid = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16).toUpperCase()
      ).join("");
      
      setScannedTagUid(randomUid);
      setIsScanning(false);
      toast.success("NFC Tag Scanned!");
    }, 2500);
  };

  // Handle enrollment
  const handleEnroll = async () => {
    if (!selectedEmployee || !scannedTagUid) {
      toast.error("Please select an employee and scan an NFC tag");
      return;
    }

    setEnrolling(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: parseInt(selectedEmployee),
          tagUid: scannedTagUid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enroll");
      }

      toast.success("Employee enrolled successfully!");
      setEnrollDialogOpen(false);
      setSelectedEmployee("");
      setScannedTagUid("");
      fetchEnrollments();
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll employee");
    } finally {
      setEnrolling(false);
    }
  };

  // Handle delete enrollment
  const handleDelete = async (enrollmentId: number) => {
    if (!confirm("Are you sure you want to remove this enrollment?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete enrollment");

      toast.success("Enrollment removed successfully");
      fetchEnrollments();
    } catch (error) {
      toast.error("Failed to remove enrollment");
      console.error(error);
    }
  };

  // Filter enrollments
  const filteredEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.tag.tagUid.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold">NFC Enrollments</h1>
          <p className="text-muted-foreground mt-1">
            Bind NFC tags to employees for attendance tracking
          </p>
        </div>
        <Button onClick={() => setEnrollDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          New Enrollment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">Active enrollments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Employees</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Not yet enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
            <Scan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.filter(e => e.tag.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Employees</CardTitle>
          <CardDescription>View and manage NFC tag enrollments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, employee ID, or tag UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>NFC Tag UID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-mono">
                        {enrollment.employee.employeeId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {enrollment.employee.fullName}
                      </TableCell>
                      <TableCell>{enrollment.employee.department}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {enrollment.tag.tagUid}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={enrollment.tag.status === "active" ? "default" : "secondary"}
                        >
                          {enrollment.tag.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(enrollment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enroll Employee with NFC Tag</DialogTitle>
            <DialogDescription>
              Scan an NFC tag and assign it to an employee for attendance tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.fullName} ({employee.employeeId}) - {employee.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* NFC Scanner */}
            <div className="space-y-2">
              <Label>NFC Tag UID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter NFC tag UID"
                  value={scannedTagUid}
                  onChange={(e) => setScannedTagUid(e.target.value.toUpperCase())}
                  disabled={isScanning}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={simulateNfcScan}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" />
                      Scan
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click "Scan" to simulate NFC tag reading (for testing)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEnrollDialogOpen(false);
                setSelectedEmployee("");
                setScannedTagUid("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEnroll} disabled={enrolling || !selectedEmployee || !scannedTagUid}>
              {enrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                "Enroll"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
