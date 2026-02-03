"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoicesView } from "@/components/finance/InvoicesView";
import { ExpensesView } from "@/components/finance/ExpensesView";
import { PayrollView } from "@/components/finance/PayrollView";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FinancePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Finance Dashboard</h2>
            </div>
            <Tabs defaultValue="invoices" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
                </TabsList>
                <TabsContent value="invoices" className="space-y-4">
                    <InvoicesView />
                </TabsContent>
                <TabsContent value="expenses" className="space-y-4">
                    <ExpensesView />
                </TabsContent>
                <TabsContent value="payroll" className="space-y-4">
                    <PayrollView />
                </TabsContent>
                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Reports</CardTitle>
                            <CardDescription>Coming soon...</CardDescription>
                        </CardHeader>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
