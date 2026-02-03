"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PayrollRecord {
    id: number;
    employeeName: string;
    month: number;
    year: number;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    status: string;
    paymentDate: string | null;
}

export function PayrollView() {
    const [data, setData] = useState<PayrollRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Payroll Run State
    const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());

    useEffect(() => {
        fetchPayroll();
    }, []);

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/payroll", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            toast.error("Failed to fetch payroll history");
        } finally {
            setLoading(false);
        }
    };

    const handleRunPayroll = async () => {
        try {
            setGenerating(true);
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/payroll", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    month: parseInt(month),
                    year: parseInt(year)
                })
            });

            if (!response.ok) throw new Error("Failed to run payroll");

            const res = await response.json();
            toast.success(res.message);
            fetchPayroll();

        } catch (error) {
            toast.error("Failed to run payroll");
        } finally {
            setGenerating(false);
        }
    };

    const getMonthName = (m: number) => {
        return new Date(0, m - 1).toLocaleString('default', { month: 'long' });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
                    <p className="text-muted-foreground">Process employee salaries and view history</p>
                </div>

                <Card className="w-[400px]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Run Payroll</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <Label className="text-xs mb-1 block">Month</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <SelectItem key={m} value={m.toString()}>{getMonthName(m)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-24">
                                <Label className="text-xs mb-1 block">Year</Label>
                                <Input type="number" value={year} onChange={e => setYear(e.target.value)} />
                            </div>
                            <Button onClick={handleRunPayroll} disabled={generating}>
                                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                Run
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payroll History</CardTitle>
                    <CardDescription>Generated salary slips and payments</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead className="text-right">Basic</TableHead>
                                <TableHead className="text-right">Allowances</TableHead>
                                <TableHead className="text-right">Deductions</TableHead>
                                <TableHead className="text-right">Net Salary</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{getMonthName(row.month)} {row.year}</TableCell>
                                        <TableCell>{row.employeeName}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">₹{row.basicSalary.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">₹{row.allowances.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-red-500">-₹{row.deductions.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">₹{row.netSalary.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'paid' ? 'default' : 'secondary'}>
                                                {row.status}
                                            </Badge>
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
