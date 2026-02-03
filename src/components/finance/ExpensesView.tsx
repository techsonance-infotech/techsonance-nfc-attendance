"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Expense {
    id: number;
    description: string;
    amount: number;
    category: string;
    date: string;
    status: "pending" | "approved" | "rejected";
    employeeName: string;
}

export function ExpensesView() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<{ id: number, name: string }[]>([]);
    const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);

    // New Expense Form
    const [formData, setFormData] = useState({
        employeeId: "",
        category: "Travel",
        description: "",
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0]
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchExpenses();
        fetchEmployees();
    }, []);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/expenses", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setExpenses(data);
            }
        } catch (error) {
            toast.error("Failed to fetch expenses");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/employees", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Handle array or object response
                const list = Array.isArray(data) ? data : (data.employees || []);
                setEmployees(list.map((e: any) => ({ id: e.id, name: e.name })));
            }
        } catch (error) {
            console.error("Failed to load employees");
        }
    };

    const handleStatusUpdate = async (id: number, status: "approved" | "rejected") => {
        try {
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/expenses", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id, status })
            });

            if (!response.ok) throw new Error("Failed to update status");

            toast.success(`Expense ${status}`);
            fetchExpenses();

        } catch (error) {
            toast.error("Failed to update expense");
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    employeeId: parseInt(formData.employeeId),
                    amount: parseFloat(formData.amount)
                })
            });

            if (!response.ok) throw new Error("Failed to create expense");

            toast.success("Expense created successfully");
            setIsNewExpenseOpen(false);
            fetchExpenses();
            setFormData({
                employeeId: "",
                category: "Travel",
                description: "",
                amount: "",
                expenseDate: new Date().toISOString().split("T")[0]
            });

        } catch (error) {
            toast.error("Failed to create expense");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved": return <Badge className="bg-green-500">Approved</Badge>;
            case "rejected": return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
                    <p className="text-muted-foreground">Manage employee expense claims and reimbursements</p>
                </div>
                <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit Expense</DialogTitle>
                            <DialogDescription>Record a new expense claim for an employee</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Employee</Label>
                                <Select value={formData.employeeId} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Travel">Travel</SelectItem>
                                        <SelectItem value="Food">Food</SelectItem>
                                        <SelectItem value="Office">Office Supplies</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={formData.expenseDate} onChange={e => setFormData({ ...formData, expenseDate: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewExpenseOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expense Claims</CardTitle>
                    <CardDescription>Review and approve pending expenses</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{expense.employeeName}</TableCell>
                                        <TableCell>{expense.category}</TableCell>
                                        <TableCell>{expense.description}</TableCell>
                                        <TableCell className="text-right">₹{expense.amount.toFixed(2)}</TableCell>
                                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                                        <TableCell className="text-right">
                                            {expense.status === 'pending' && (
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusUpdate(expense.id, 'approved')}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusUpdate(expense.id, 'rejected')}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
