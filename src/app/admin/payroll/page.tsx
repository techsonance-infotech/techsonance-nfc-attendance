"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, DollarSign, Loader2, TrendingUp, TrendingDown, FileText, Download } from "lucide-react";
import { toast } from "sonner";

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

export default function PayrollPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState("");

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
    } catch (error) {
      console.error("Error loading payroll data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
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

  if (isPending || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
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
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
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
              {filteredPayrollData.map((data) => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
