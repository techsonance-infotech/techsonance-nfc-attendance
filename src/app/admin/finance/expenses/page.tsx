"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Wallet, CheckCircle, XCircle, Clock, TrendingUp, Search, DollarSign, IndianRupee } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

interface Expense {
  id: number;
  employeeId: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  status: string;
  receiptUrl: string | null;
  approverId: string | null;
  approvalDate: string | null;
  reimbursementStatus: string;
  reimbursementDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

interface Analytics {
  totalExpenses: number;
  byCategory: { category: string; total: number; count: number }[];
  byStatus: { status: string; total: number; count: number }[];
  byReimbursementStatus: { reimbursementStatus: string; total: number; count: number }[];
}

export default function ExpensesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    category: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    receiptUrl: "",
    notes: "",
  });

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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const [expensesRes, employeesRes, analyticsRes] = await Promise.all([
        fetch("/api/expenses?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/employees?limit=100"),
        fetch(`/api/expenses/analytics?period=monthly&year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!formData.employeeId || !formData.category || !formData.description || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: parseInt(formData.employeeId),
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expenseDate: formData.expenseDate,
          receiptUrl: formData.receiptUrl || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create expense");

      toast.success("Expense created successfully");
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense");
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (expenseId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch(`/api/expenses/${expenseId}/approve?id=${expenseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "approved",
          approver_id: session?.user?.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to approve expense");

      toast.success("Expense approved successfully");
      loadData();
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error("Failed to approve expense");
    }
  };

  const handleReject = async (expenseId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch(`/api/expenses/${expenseId}/approve?id=${expenseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "rejected",
          approver_id: session?.user?.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to reject expense");

      toast.success("Expense rejected");
      loadData();
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense");
    }
  };

  const handleReimburse = async (expenseId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch(`/api/expenses/${expenseId}/reimburse?id=${expenseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to mark as reimbursed");

      toast.success("Marked as reimbursed successfully");
      loadData();
    } catch (error) {
      console.error("Error marking as reimbursed:", error);
      toast.error("Failed to mark as reimbursed");
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      category: "",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      receiptUrl: "",
      notes: "",
    });
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.name : "Unknown";
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getEmployeeName(expense.employeeId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const categories = Array.from(new Set(expenses.map(e => e.category)));

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
            <h2 className="text-3xl font-bold">Expenses Management</h2>
            <p className="text-muted-foreground">Track, approve, and reimburse employee expenses</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>Record a new expense for an employee</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <Select value={formData.employeeId} onValueChange={(value) => setFormData({ ...formData, employeeId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.name} - {employee.department || "No dept"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="food">Food & Meals</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="supplies">Office Supplies</SelectItem>
                        <SelectItem value="software">Software & Tools</SelectItem>
                        <SelectItem value="training">Training & Development</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the expense..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expenseDate">Expense Date</Label>
                    <Input
                      id="expenseDate"
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receiptUrl">Receipt URL</Label>
                    <Input
                      id="receiptUrl"
                      value={formData.receiptUrl}
                      onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateExpense} disabled={isCreating}>
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Expense
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter(e => e.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter(e => e.status === "approved").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reimbursement</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter(e => e.reimbursementStatus === "pending" && e.status === "approved").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics */}
        {analytics && analytics.byCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>This month's breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.byCategory.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-32 font-medium capitalize">{cat.category}</div>
                      <Badge variant="outline">{cat.count} items</Badge>
                    </div>
                    <div className="font-bold">{formatCurrency(cat.total)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>Review and manage employee expenses</CardDescription>
            
            <div className="flex gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No expenses found</p>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{getEmployeeName(expense.employeeId)}</p>
                        <Badge variant={getStatusColor(expense.status)}>
                          {expense.status}
                        </Badge>
                        {expense.reimbursementStatus === "paid" && (
                          <Badge variant="outline" className="bg-green-50">
                            Reimbursed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {expense.category} • {expense.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <p className="font-bold">{formatCurrency(expense.amount)}</p>
                      </div>
                      
                      {expense.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(expense.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(expense.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {expense.status === "approved" && expense.reimbursementStatus === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReimburse(expense.id)}
                        >
                          <IndianRupee className="h-4 w-4 mr-1" />
                          Mark Reimbursed
                        </Button>
                      )}
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