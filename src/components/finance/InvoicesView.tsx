"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

interface Invoice {
    id: number;
    invoiceNumber: string;
    clientName: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    status: "draft" | "sent" | "paid" | "overdue";
}

export function InvoicesView() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // New Invoice State
    const [formData, setFormData] = useState({
        clientName: "",
        clientEmail: "",
        clientAddress: "",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        notes: "",
        status: "draft",
        items: [{ description: "", quantity: 1, unitPrice: 0 }],
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("bearer_token");
            const response = await fetch("/api/invoices", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setInvoices(data);
            }
        } catch (error) {
            toast.error("Failed to fetch invoices");
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const calculateTotal = () => {
        const sub = calculateSubtotal();
        const tax = sub * 0.18; // 18% Tax
        return sub + tax;
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: "", quantity: 1, unitPrice: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem("bearer_token");

            const subtotal = calculateSubtotal();
            const taxAmount = subtotal * 0.18;
            const totalAmount = subtotal + taxAmount;

            const payload = {
                ...formData,
                subtotal,
                taxRate: 0.18,
                taxAmount,
                totalAmount,
                createdBy: "system"
            };

            const response = await fetch("/api/invoices", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to create invoice");
            }

            toast.success("Invoice created successfully");
            setIsNewInvoiceOpen(false);
            fetchInvoices();
            // Reset form
            setFormData({
                clientName: "",
                clientEmail: "",
                clientAddress: "",
                issueDate: new Date().toISOString().split("T")[0],
                dueDate: "",
                notes: "",
                status: "draft",
                items: [{ description: "", quantity: 1, unitPrice: 0 }],
            });

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "paid": return <Badge className="bg-green-500">Paid</Badge>;
            case "sent": return <Badge className="bg-blue-500">Sent</Badge>;
            case "overdue": return <Badge variant="destructive">Overdue</Badge>;
            default: return <Badge variant="secondary">Draft</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
                    <p className="text-muted-foreground">Manage client invoices and payments</p>
                </div>
                <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Invoice</DialogTitle>
                            <DialogDescription>Enter invoice details below</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Client Name *</Label>
                                <Input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Client Email *</Label>
                                <Input type="email" value={formData.clientEmail} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Issue Date *</Label>
                                <Input type="date" value={formData.issueDate} onChange={e => setFormData({ ...formData, issueDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date *</Label>
                                <Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Client Address</Label>
                                <Input value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} />
                            </div>

                            <div className="col-span-2 mt-4">
                                <Label className="text-lg font-semibold">Items</Label>
                                <div className="border rounded-md mt-2 p-2 space-y-2">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-end">
                                            <div className="flex-grow">
                                                <Label>Description</Label>
                                                <Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                                            </div>
                                            <div className="w-20">
                                                <Label>Qty</Label>
                                                <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))} />
                                            </div>
                                            <div className="w-32">
                                                <Label>Price</Label>
                                                <Input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))} />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
                                        <Plus className="h-3 w-3 mr-1" /> Add Item
                                    </Button>
                                </div>
                            </div>

                            <div className="col-span-2 flex justify-end space-x-8 text-sm mt-4">
                                <div className="text-right">
                                    <p className="text-muted-foreground">Subtotal</p>
                                    <p className="font-bold">₹{calculateSubtotal().toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-muted-foreground">Tax (18%)</p>
                                    <p className="font-bold">₹{(calculateSubtotal() * 0.18).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-muted-foreground">Total</p>
                                    <p className="text-xl font-bold">₹{calculateTotal().toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label>Notes</Label>
                                <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Invoice
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                    <CardDescription>A list of all invoices issued to clients</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Issue Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No invoices found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices
                                    .filter(inv => inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                                            <TableCell>{invoice.clientName}</TableCell>
                                            <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                            <TableCell className="text-right font-bold">₹{invoice.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon">
                                                    <Download className="h-4 w-4" />
                                                </Button>
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
