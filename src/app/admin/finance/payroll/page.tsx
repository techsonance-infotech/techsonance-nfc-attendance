"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, DollarSign, Download, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

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
  createdAt: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
  salary: number | null;
}

export default function PayrollSystemPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
  }, [session, isPending, router, selectedMonth, selectedYear]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const [payrollRes, employeesRes] = await Promise.all([
        fetch(`/api/payroll?month=${selectedMonth}&year=${selectedYear}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/employees?limit=100"),
      ]);

      if (payrollRes.ok) {
        const data = await payrollRes.json();
        setPayrollRecords(data);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load payroll data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate payroll");
      }

      const result = await response.json();
      toast.success(`Payroll generated for ${result.count} employees`);
      loadData();
    } catch (error: any) {
      console.error("Error generating payroll:", error);
      toast.error(error.message || "Failed to generate payroll");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportToCSV = () => {
    if (payrollRecords.length === 0) {
      toast.error("No payroll records to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Month",
      "Year",
      "Basic Salary",
      "Allowances",
      "Deductions",
      "Gross Salary",
      "PF",
      "ESIC",
      "TDS",
      "Net Salary",
      "Status",
      "Payment Date",
    ];

    const rows = payrollRecords.map((record) => {
      const employee = employees.find((e) => e.id === record.employeeId);
      return [
        record.employeeId,
        employee?.name || "Unknown",
        record.month,
        record.year,
        record.basicSalary,
        record.allowances,
        record.deductions,
        record.grossSalary,
        record.pfAmount,
        record.esicAmount,
        record.tdsAmount,
        record.netSalary,
        record.status,
        record.paymentDate || "-",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Payroll exported successfully");
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "processed": return "secondary";
      case "draft": return "outline";
      default: return "secondary";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month - 1];
  };

  const totalGrossSalary = payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0);
  const totalNetSalary = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);
  const totalPF = payrollRecords.reduce((sum, r) => sum + r.pfAmount, 0);
  const totalESIC = payrollRecords.reduce((sum, r) => sum + r.esicAmount, 0);
  const totalTDS = payrollRecords.reduce((sum, r) => sum + r.tdsAmount, 0);

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Payroll System</h2>
            <p className="text-muted-foreground">
              Manage salary components, generate slips, and calculate statutory deductions
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportToCSV} disabled={payrollRecords.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleGeneratePayroll} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Payroll
            </Button>
          </div>
        </div>

        {/* Month/Year Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Period</CardTitle>
            <CardDescription>Choose month and year to view payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Salary</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalGrossSalary)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PF Deduction</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPF)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ESIC</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalESIC)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TDS</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalTDS)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Salary</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalNetSalary)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Records */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Records - {getMonthName(selectedMonth)} {selectedYear}</CardTitle>
            <CardDescription>
              {payrollRecords.length} employee{payrollRecords.length !== 1 ? "s" : ""} • Total payout: {formatCurrency(totalNetSalary)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payrollRecords.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No payroll records found for this period
                </p>
                <Button onClick={handleGeneratePayroll} disabled={isGenerating}>
                  {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Payroll for {getMonthName(selectedMonth)} {selectedYear}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-lg">{getEmployeeName(record.employeeId)}</p>
                          <Badge variant={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Employee ID: {record.employeeId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net Salary</p>
                        <p className="text-2xl font-bold">{formatCurrency(record.netSalary)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Basic Salary</p>
                        <p className="font-medium">{formatCurrency(record.basicSalary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Allowances</p>
                        <p className="font-medium text-green-600">+{formatCurrency(record.allowances)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Gross Salary</p>
                        <p className="font-medium">{formatCurrency(record.grossSalary)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Deductions</p>
                        <p className="font-medium text-red-600">-{formatCurrency(record.deductions)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-3 border-t mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">PF (12%)</p>
                        <p className="font-medium">{formatCurrency(record.pfAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ESIC (0.75%)</p>
                        <p className="font-medium">{formatCurrency(record.esicAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">TDS</p>
                        <p className="font-medium">{formatCurrency(record.tdsAmount)}</p>
                      </div>
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
