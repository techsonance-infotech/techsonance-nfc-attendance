"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, IndianRupee, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">${totalDeductions.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">₹{totalNetPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">₹{data.netPay.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">₹{data.grossPay.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-₹{data.deductions.toFixed(2)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format currency function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">${totalDeductions.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">${totalNetPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{formatCurrency(data.netPay)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">{formatCurrency(data.grossPay)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-{formatCurrency(data.deductions)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, IndianRupee, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format currency function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">{formatCurrency(totalGrossPay)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">{formatCurrency(totalDeductions)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(totalNetPay)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{formatCurrency(data.netPay)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">{formatCurrency(data.grossPay)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-{formatCurrency(data.deductions)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">${totalDeductions.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">${totalNetPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">${data.netPay.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">${data.grossPay.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-${data.deductions.toFixed(2)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, IndianRupee, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">${totalDeductions.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">₹{totalNetPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">₹{data.netPay.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">₹{data.grossPay.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-₹{data.deductions.toFixed(2)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">{formatCurrency(totalGrossPay)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">{formatCurrency(totalDeductions)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{formatCurrency(totalNetPay)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{formatCurrency(data.netPay)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">{formatCurrency(data.grossPay)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-{formatCurrency(data.deductions)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Download, Edit, Trash2, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
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
}

interface PayrollData {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  leaveDays: number;
  totalHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfAmount: number;
  esicAmount: number;
  tdsAmount: number;
  status: string;
  paymentDate: string | null;
}

interface EditFormData {
  basicSalary: string;
  allowances: string;
  deductions: string;
  pfAmount: string;
  esicAmount: string;
  tdsAmount: string;
  status: string;
  paymentDate: string;
}

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    basicSalary: "",
    allowances: "",
    deductions: "",
    pfAmount: "",
    esicAmount: "",
    tdsAmount: "",
    status: "draft",
    paymentDate: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    } else if (!isPending && session?.user?.role !== "admin") {
      router.push("/");
      toast.error("Access denied. Admin only.");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      loadPayrollData();
    }
  }, [session, selectedMonth]);

  const loadPayrollData = async () => {
    try {
      setIsLoading(true);
      
      // Load employees
      const empResponse = await fetch("/api/employees");
      if (!empResponse.ok) throw new Error("Failed to load employees");
      const employeesData = await empResponse.json();
      setEmployees(employeesData);

      // Load attendance for selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const payrollResults: PayrollData[] = [];

      for (const employee of employeesData) {
        const attResponse = await fetch(
          `/api/attendance?employeeId=${employee.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );
        
        if (attResponse.ok) {
          const records: AttendanceRecord[] = await attResponse.json();
          
          const totalDays = records.length;
          const presentDays = records.filter(r => r.status === 'present').length;
          const leaveDays = records.filter(r => r.status === 'leave').length;
          const totalMinutes = records
            .filter(r => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0);
          const totalHours = totalMinutes / 60;

          // Calculate pay
          let grossPay = 0;
          if (employee.salary) {
            // Monthly salary
            const workingDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
            grossPay = (employee.salary / workingDays) * presentDays;
          } else if (employee.hourlyRate) {
            // Hourly rate
            grossPay = totalHours * employee.hourlyRate;
          }

          // Simple deductions (10% tax + 5% benefits)
          const deductions = grossPay * 0.15;
          const netPay = grossPay - deductions;

          payrollResults.push({
            employee,
            totalDays,
            presentDays,
            leaveDays,
            totalHours,
            grossPay,
            deductions,
            netPay
          });
        }
      }

      setPayrollData(payrollResults);

      // Load existing payroll records for the selected month
      const [year, month] = selectedMonth.split('-');
      const payrollResponse = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (payrollResponse.ok) {
        const records = await payrollResponse.json();
        setPayrollRecords(records);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setIsGenerating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      await loadPayrollData();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setEditingRecord(record);
      setEditFormData({
        basicSalary: record.basicSalary.toString(),
        allowances: record.allowances.toString(),
        deductions: record.deductions.toString(),
        pfAmount: record.pfAmount.toString(),
        esicAmount: record.esicAmount.toString(),
        tdsAmount: record.tdsAmount.toString(),
        status: record.status,
        paymentDate: record.paymentDate || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    try {
      setIsSubmitting(true);

      const basicSalary = parseFloat(editFormData.basicSalary);
      const allowances = parseFloat(editFormData.allowances);
      const deductions = parseFloat(editFormData.deductions);
      const pfAmount = parseFloat(editFormData.pfAmount);
      const esicAmount = parseFloat(editFormData.esicAmount);
      const tdsAmount = parseFloat(editFormData.tdsAmount);

      // Validation
      if (isNaN(basicSalary) || basicSalary < 0) {
        toast.error("Basic salary must be a valid positive number");
        return;
      }
      if (isNaN(allowances) || allowances < 0) {
        toast.error("Allowances must be a valid positive number");
        return;
      }
      if (isNaN(deductions) || deductions < 0) {
        toast.error("Deductions must be a valid positive number");
        return;
      }

      // Calculate gross and net salary
      const grossSalary = basicSalary + allowances;
      const netSalary = grossSalary - deductions - pfAmount - esicAmount - tdsAmount;

      const response = await fetch(`/api/payroll/${editingRecord.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        },
        body: JSON.stringify({
          basicSalary,
          allowances,
          deductions,
          grossSalary,
          netSalary,
          pfAmount,
          esicAmount,
          tdsAmount,
          status: editFormData.status,
          paymentDate: editFormData.paymentDate || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payroll");
      }

      toast.success("Payroll record updated successfully");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error updating payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update payroll");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeId: number) => {
    const record = payrollRecords.find(r => r.employeeId === employeeId);
    if (record) {
      setDeletingRecord(record);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/payroll/${deletingRecord.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete payroll");
      }

      toast.success("Payroll record deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadPayrollData();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete payroll");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Employee", "Email", "Department", "Present Days", "Leave Days", "Total Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = filteredPayrollData.map(data => [
      data.employee.name,
      data.employee.email,
      data.employee.department || "N/A",
      data.presentDays.toString(),
      data.leaveDays.toString(),
      data.totalHours.toFixed(2),
      data.grossPay.toFixed(2),
      data.deductions.toFixed(2),
      data.netPay.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  const filteredPayrollData = payrollData.filter(data =>
    data.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    data.employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGrossPay = filteredPayrollData.reduce((sum, data) => sum + data.grossPay, 0);
  const totalNetPay = filteredPayrollData.reduce((sum, data) => sum + data.netPay, 0);
  const totalDeductions = filteredPayrollData.reduce((sum, data) => sum + data.deductions, 0);

  const getEmployeeRecord = (employeeId: number) => {
    return payrollRecords.find(r => r.employeeId === employeeId);
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Calculate and manage employee payroll</p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleGeneratePayroll} 
              className="gap-2"
              disabled={isGenerating || payrollRecords.length > 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Payroll
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold">${totalGrossPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <p className="text-2xl font-bold">${totalDeductions.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">${totalNetPay.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input
          placeholder="Search by employee name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayrollData.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No payroll data for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayrollData.map((data) => {
                  const existingRecord = getEmployeeRecord(data.employee.id);
                  return (
                    <Card key={data.employee.id} className="border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{data.employee.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{data.employee.email}</p>
                            {data.employee.department && (
                              <Badge variant="outline" className="mt-2">
                                {data.employee.department}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">${data.netPay.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Net Pay</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Present Days</p>
                            <p className="text-lg font-semibold text-green-600">{data.presentDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Leave Days</p>
                            <p className="text-lg font-semibold text-orange-600">{data.leaveDays}</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                            <p className="text-lg font-semibold">{data.totalHours.toFixed(1)}h</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                            <p className="text-lg font-semibold">${data.grossPay.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Deductions (15%)</span>
                            <span className="font-semibold text-destructive">-${data.deductions.toFixed(2)}</span>
                          </div>
                        </div>
                        {existingRecord && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(data.employee.id)}
                              className="gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(data.employee.id)}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payroll Record</DialogTitle>
            <DialogDescription>
              Update payroll details for {employees.find(e => e.id === editingRecord?.employeeId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                value={editFormData.basicSalary}
                onChange={(e) => setEditFormData({ ...editFormData, basicSalary: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={editFormData.allowances}
                onChange={(e) => setEditFormData({ ...editFormData, allowances: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={editFormData.deductions}
                onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pfAmount">PF Amount</Label>
              <Input
                id="pfAmount"
                type="number"
                step="0.01"
                value={editFormData.pfAmount}
                onChange={(e) => setEditFormData({ ...editFormData, pfAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esicAmount">ESIC Amount</Label>
              <Input
                id="esicAmount"
                type="number"
                step="0.01"
                value={editFormData.esicAmount}
                onChange={(e) => setEditFormData({ ...editFormData, esicAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdsAmount">TDS Amount</Label>
              <Input
                id="tdsAmount"
                type="number"
                step="0.01"
                value={editFormData.tdsAmount}
                onChange={(e) => setEditFormData({ ...editFormData, tdsAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editFormData.paymentDate}
                onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Payroll Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the payroll record for {employees.find(e => e.id === deletingRecord?.employeeId)?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}