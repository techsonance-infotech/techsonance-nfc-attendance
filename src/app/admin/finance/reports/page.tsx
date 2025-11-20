"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, DollarSign, FileText, Download } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

export default function ReportsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profit-loss");

  // Date ranges
  const [plDateRange, setPlDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const [cashFlowDateRange, setCashFlowDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const [salaryDateRange, setSalaryDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const [taxYear, setTaxYear] = useState(`${new Date().getFullYear() - 1}-${new Date().getFullYear().toString().slice(-2)}`);

  // Report data
  const [plData, setPlData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [taxData, setTaxData] = useState<any>(null);

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
      setIsLoading(false);
    }
  }, [session, isPending, router]);

  const loadProfitLoss = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(
        `/api/reports/profit-loss?start_date=${plDateRange.startDate}&end_date=${plDateRange.endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to load P&L report");
      const data = await response.json();
      setPlData(data);
    } catch (error) {
      console.error("Error loading P&L:", error);
      toast.error("Failed to load Profit & Loss report");
    }
  };

  const loadCashFlow = async () => {
    try {
      const response = await fetch(
        `/api/reports/cash-flow?start_date=${cashFlowDateRange.startDate}&end_date=${cashFlowDateRange.endDate}`
      );

      if (!response.ok) throw new Error("Failed to load cash flow report");
      const data = await response.json();
      setCashFlowData(data);
    } catch (error) {
      console.error("Error loading cash flow:", error);
      toast.error("Failed to load Cash Flow report");
    }
  };

  const loadSalaryReport = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(
        `/api/reports/salary-report?start_date=${salaryDateRange.startDate}&end_date=${salaryDateRange.endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to load salary report");
      const data = await response.json();
      setSalaryData(data);
    } catch (error) {
      console.error("Error loading salary report:", error);
      toast.error("Failed to load Salary Report");
    }
  };

  const loadTaxReport = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(
        `/api/reports/tax-report?financial_year=${taxYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to load tax report");
      const data = await response.json();
      setTaxData(data);
    } catch (error) {
      console.error("Error loading tax report:", error);
      toast.error("Failed to load Tax Report");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((header) => row[header]));

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Report exported successfully");
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
        <div>
          <h2 className="text-3xl font-bold">Financial Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive financial reports and analytics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profit-loss">P&L</TabsTrigger>
            <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
            <TabsTrigger value="salary">Salary Report</TabsTrigger>
            <TabsTrigger value="tax">Tax Report</TabsTrigger>
          </TabsList>

          {/* Profit & Loss Report */}
          <TabsContent value="profit-loss" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
                <CardDescription>
                  Revenue, expenses, and net profit/loss analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={plDateRange.startDate}
                      onChange={(e) =>
                        setPlDateRange({ ...plDateRange, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={plDateRange.endDate}
                      onChange={(e) =>
                        setPlDateRange({ ...plDateRange, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadProfitLoss}>Generate Report</Button>
                  {plData && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        exportToCSV(
                          [
                            {
                              type: "Revenue",
                              amount: plData.totalRevenue,
                            },
                            {
                              type: "Expenses",
                              amount: plData.totalExpenses,
                            },
                            {
                              type: "Profit/Loss",
                              amount: plData.profitLoss,
                            },
                          ],
                          "profit_loss_report"
                        )
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {plData && (
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Total Revenue
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(plData.totalRevenue)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Total Expenses
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(plData.totalExpenses)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            {plData.profitLoss >= 0 ? "Net Profit" : "Net Loss"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold flex items-center gap-2 ${
                              plData.profitLoss >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {plData.profitLoss >= 0 ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                            {formatCurrency(Math.abs(plData.profitLoss))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {plData.expensesByCategory && plData.expensesByCategory.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Expenses by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {plData.expensesByCategory.map((cat: any) => (
                              <div
                                key={cat.category}
                                className="flex justify-between items-center p-2 border rounded"
                              >
                                <span className="font-medium capitalize">{cat.category}</span>
                                <span className="text-red-600">
                                  {formatCurrency(cat.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Report */}
          <TabsContent value="cash-flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Statement</CardTitle>
                <CardDescription>
                  Track money in and out of your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={cashFlowDateRange.startDate}
                      onChange={(e) =>
                        setCashFlowDateRange({ ...cashFlowDateRange, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={cashFlowDateRange.endDate}
                      onChange={(e) =>
                        setCashFlowDateRange({ ...cashFlowDateRange, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadCashFlow}>Generate Report</Button>
                  {cashFlowData && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        exportToCSV(
                          [
                            {
                              type: "Inflows",
                              amount: cashFlowData.totalInflows,
                            },
                            {
                              type: "Outflows",
                              amount: cashFlowData.totalOutflows,
                            },
                            {
                              type: "Net Cash Flow",
                              amount: cashFlowData.netCashFlow,
                            },
                          ],
                          "cash_flow_report"
                        )
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {cashFlowData && (
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Total Inflows
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(cashFlowData.totalInflows)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Payments received
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Total Outflows
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(cashFlowData.totalOutflows)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Expenses & payroll
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Net Cash Flow
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div
                            className={`text-2xl font-bold flex items-center gap-2 ${
                              cashFlowData.netCashFlow >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {cashFlowData.netCashFlow >= 0 ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                            {formatCurrency(Math.abs(cashFlowData.netCashFlow))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Report */}
          <TabsContent value="salary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Salary Report</CardTitle>
                <CardDescription>
                  Comprehensive salary and payroll analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={salaryDateRange.startDate}
                      onChange={(e) =>
                        setSalaryDateRange({ ...salaryDateRange, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={salaryDateRange.endDate}
                      onChange={(e) =>
                        setSalaryDateRange({ ...salaryDateRange, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadSalaryReport}>Generate Report</Button>
                  {salaryData && salaryData.byEmployee && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        exportToCSV(
                          salaryData.byEmployee.map((emp: any) => ({
                            employeeId: emp.employeeId,
                            name: emp.name,
                            department: emp.department || "N/A",
                            totalGross: emp.totalGross,
                            totalNet: emp.totalNet,
                            count: emp.count,
                          })),
                          "salary_report"
                        )
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {salaryData && (
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Total Paid
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(salaryData.totalSalariesPaid)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">PF</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(salaryData.totalPF)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">ESIC</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(salaryData.totalESIC)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">TDS</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(salaryData.totalTDS)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {salaryData.byEmployee && salaryData.byEmployee.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">By Employee</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {salaryData.byEmployee.slice(0, 10).map((emp: any) => (
                              <div
                                key={emp.employeeId}
                                className="flex justify-between items-center p-3 border rounded"
                              >
                                <div>
                                  <p className="font-medium">{emp.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {emp.department || "No department"} • {emp.count} month(s)
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{formatCurrency(emp.totalNet)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Gross: {formatCurrency(emp.totalGross)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Report */}
          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Report</CardTitle>
                <CardDescription>
                  Income tax calculations and TDS deductions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Financial Year</Label>
                  <Input
                    placeholder="e.g., 2023-24"
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadTaxReport}>Generate Report</Button>
                  {taxData && taxData.byEmployee && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        exportToCSV(
                          taxData.byEmployee.map((emp: any) => ({
                            employeeId: emp.employeeId,
                            name: emp.name,
                            department: emp.department || "N/A",
                            grossIncome: emp.grossIncome,
                            deductions: emp.deductions,
                            taxableIncome: emp.taxableIncome,
                            taxAmount: emp.taxAmount,
                            tdsDeducted: emp.tdsDeducted,
                          })),
                          `tax_report_${taxYear}`
                        )
                      }
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  )}
                </div>

                {taxData && (
                  <div className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Gross Income
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(taxData.totalGrossIncome)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Deductions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(taxData.totalDeductions)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            Tax Amount
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(taxData.totalTaxAmount)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium">
                            TDS Deducted
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(taxData.totalTDSDeducted)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {taxData.byEmployee && taxData.byEmployee.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            By Employee - FY {taxData.financialYear}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {taxData.byEmployee.map((emp: any) => (
                              <div
                                key={emp.employeeId}
                                className="p-3 border rounded"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-medium">{emp.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {emp.department || "No department"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg">
                                      {formatCurrency(emp.taxAmount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Tax Amount</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-sm pt-2 border-t">
                                  <div>
                                    <p className="text-muted-foreground">Gross</p>
                                    <p className="font-medium">
                                      {formatCurrency(emp.grossIncome)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Deductions</p>
                                    <p className="font-medium">
                                      {formatCurrency(emp.deductions)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Taxable</p>
                                    <p className="font-medium">
                                      {formatCurrency(emp.taxableIncome)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">TDS</p>
                                    <p className="font-medium">
                                      {formatCurrency(emp.tdsDeducted)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
