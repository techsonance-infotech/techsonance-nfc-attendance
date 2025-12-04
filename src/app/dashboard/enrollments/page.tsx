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
import CardScanner from "@/components/CardScanner";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  nfcCardId?: string;
}

interface Enrollment {
  id: number;
  tagUid: string;
  employeeId: number;
  status: string;
  enrolledAt: string;
  lastUsedAt?: string;
  readerId?: string;
  employee: {
    id: number;
    name: string;
    email: string;
    department: string;
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
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load enrollments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees (not enrolled)
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
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
      const availableEmployees = (data.employees || []).filter(
        (emp: Employee) => !enrolledEmployeeIds.includes(emp.id)
      );
      
      setEmployees(availableEmployees);
      
      if (availableEmployees.length === 0) {
        toast.info("All employees are already enrolled");
      }
    } catch (error) {
      toast.error("Failed to load employees");
      console.error("Failed to load employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  useEffect(() => {
    if (enrollDialogOpen && enrollments.length >= 0) {
      fetchEmployees();
    }
  }, [enrollDialogOpen, enrollments.length]);

  // Handle card detected from scanner
  const handleCardDetected = (cardId: string) => {
    setScannedTagUid(cardId);
    setIsScanning(false);
    toast.success("NFC card detected!");
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
      setIsScanning(false);
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
      enrollment.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.tagUid.toLowerCase().includes(searchTerm.toLowerCase())
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
              {enrollments.filter(e => e.status === "active").length}
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
              placeholder="Search by name, email, or tag UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Email</TableHead>
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
                      <TableCell className="font-medium">
                        {enrollment.employee.name}
                      </TableCell>
                      <TableCell>{enrollment.employee.email}</TableCell>
                      <TableCell>{enrollment.employee.department || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {enrollment.tagUid}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={enrollment.status === "active" ? "default" : "secondary"}
                        >
                          {enrollment.status}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Enroll Employee with NFC Tag</DialogTitle>
            <DialogDescription>
              Select an employee and scan their NFC card for attendance tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select 
                value={selectedEmployee} 
                onValueChange={setSelectedEmployee}
                disabled={loadingEmployees}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder={
                    loadingEmployees ? "Loading employees..." : "Choose an employee"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {loadingEmployees ? "Loading..." : "No available employees"}
                    </div>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.name} - {employee.department || "No Department"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* NFC Scanner */}
            {!isScanning ? (
              <div className="space-y-2">
                <Label>NFC Tag UID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan or enter NFC tag UID"
                    value={scannedTagUid}
                    onChange={(e) => setScannedTagUid(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsScanning(true)}
                  >
                    <Scan className="mr-2 h-4 w-4" />
                    Scan
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Click "Scan" to use NFC reader or enter card UID manually
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <CardScanner
                  onCardDetected={handleCardDetected}
                  onCancel={() => setIsScanning(false)}
                  employeeName={
                    employees.find(e => e.id.toString() === selectedEmployee)?.name
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEnrollDialogOpen(false);
                setSelectedEmployee("");
                setScannedTagUid("");
                setIsScanning(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEnroll} 
              disabled={enrolling || !selectedEmployee || !scannedTagUid || isScanning}
            >
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