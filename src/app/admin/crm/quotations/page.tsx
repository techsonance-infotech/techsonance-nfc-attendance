"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, FileText, Send, Check, X, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Quotation {
  id: number;
  quotationNumber: string;
  clientId: number | null;
  leadId: number | null;
  title: string;
  description: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil: string;
  status: string;
  notes: string | null;
  termsConditions: string | null;
  createdAt: string;
  acceptedAt: string | null;
  rejectedReason: string | null;
}

interface QuotationItem {
  id: number;
  quotationId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  id: number;
  proposalNumber: string;
  clientId: number | null;
  leadId: number | null;
  title: string;
  description: string | null;
  objective: string | null;
  scopeOfWork: string | null;
  deliverables: string | null;
  timeline: string | null;
  pricing: number | null;
  status: string;
  pdfUrl: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

interface Client {
  id: number;
  name: string;
}

interface Lead {
  id: number;
  name: string;
}

export default function QuotationsProposalsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isQuotDialogOpen, setIsQuotDialogOpen] = useState(false);
  const [isPropDialogOpen, setIsPropDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotationItems, setQuotationItems] = useState<{ description: string; quantity: string; unitPrice: string }[]>([
    { description: "", quantity: "1", unitPrice: "" }
  ]);

  const [quotFormData, setQuotFormData] = useState({
    clientId: "",
    leadId: "",
    title: "",
    description: "",
    taxRate: "18",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    termsConditions: "",
  });

  const [propFormData, setPropFormData] = useState({
    clientId: "",
    leadId: "",
    title: "",
    description: "",
    objective: "",
    scopeOfWork: "",
    deliverables: "",
    timeline: "",
    pricing: "",
  });

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
      loadData();
    }
  }, [session, statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("bearer_token");

      const [quotRes, propRes, clientRes, leadRes] = await Promise.all([
        fetch("/api/quotations", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/proposals", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/leads", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (quotRes.ok) {
        const quotData = await quotRes.json();
        setQuotations(statusFilter === "all" ? quotData : quotData.filter((q: Quotation) => q.status === statusFilter));
      }

      if (propRes.ok) {
        const propData = await propRes.json();
        setProposals(statusFilter === "all" ? propData : propData.filter((p: Proposal) => p.status === statusFilter));
      }

      if (clientRes.ok) {
        const clientData = await clientRes.json();
        setClients(clientData);
      }

      if (leadRes.ok) {
        const leadData = await leadRes.json();
        setLeads(leadData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const addQuotationItem = () => {
    setQuotationItems([...quotationItems, { description: "", quantity: "1", unitPrice: "" }]);
  };

  const removeQuotationItem = (index: number) => {
    setQuotationItems(quotationItems.filter((_, i) => i !== index));
  };

  const updateQuotationItem = (index: number, field: string, value: string) => {
    const updated = [...quotationItems];
    updated[index] = { ...updated[index], [field]: value };
    setQuotationItems(updated);
  };

  const calculateQuotationTotal = () => {
    const subtotal = quotationItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);

    const taxRate = parseFloat(quotFormData.taxRate) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotFormData.title || (!quotFormData.clientId && !quotFormData.leadId)) {
      toast.error("Title and either client or lead is required");
      return;
    }

    if (quotationItems.some(item => !item.description || !item.unitPrice)) {
      toast.error("All items must have description and unit price");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      const { subtotal, taxAmount, total } = calculateQuotationTotal();

      const quotPayload = {
        clientId: quotFormData.clientId ? parseInt(quotFormData.clientId) : null,
        leadId: quotFormData.leadId ? parseInt(quotFormData.leadId) : null,
        title: quotFormData.title,
        description: quotFormData.description || null,
        subtotal: Math.round(subtotal),
        taxRate: parseFloat(quotFormData.taxRate),
        taxAmount: Math.round(taxAmount),
        totalAmount: Math.round(total),
        validUntil: new Date(quotFormData.validUntil).toISOString(),
        status: "draft",
        notes: quotFormData.notes || null,
        termsConditions: quotFormData.termsConditions || null,
      };

      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(quotPayload),
      });

      if (!response.ok) throw new Error("Failed to create quotation");

      const newQuotation = await response.json();

      // Create quotation items
      for (const item of quotationItems) {
        const itemPayload = {
          quotationId: newQuotation.id,
          description: item.description,
          quantity: parseInt(item.quantity),
          unitPrice: Math.round(parseFloat(item.unitPrice)),
          total: Math.round(parseInt(item.quantity) * parseFloat(item.unitPrice)),
        };

        await fetch("/api/quotation-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(itemPayload),
        });
      }

      toast.success("Quotation created successfully");
      setIsQuotDialogOpen(false);
      resetQuotForm();
      loadData();
    } catch (error: any) {
      console.error("Error creating quotation:", error);
      toast.error(error.message || "Failed to create quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!propFormData.title || (!propFormData.clientId && !propFormData.leadId)) {
      toast.error("Title and either client or lead is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("bearer_token");

      const propPayload = {
        clientId: propFormData.clientId ? parseInt(propFormData.clientId) : null,
        leadId: propFormData.leadId ? parseInt(propFormData.leadId) : null,
        title: propFormData.title,
        description: propFormData.description || null,
        objective: propFormData.objective || null,
        scopeOfWork: propFormData.scopeOfWork || null,
        deliverables: propFormData.deliverables || null,
        timeline: propFormData.timeline || null,
        pricing: propFormData.pricing ? parseInt(propFormData.pricing) : null,
        status: "draft",
      };

      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(propPayload),
      });

      if (!response.ok) throw new Error("Failed to create proposal");

      toast.success("Proposal created successfully");
      setIsPropDialogOpen(false);
      resetPropForm();
      loadData();
    } catch (error: any) {
      console.error("Error creating proposal:", error);
      toast.error(error.message || "Failed to create proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuotationAction = async (quotId: number, action: "accept" | "reject", reason?: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/quotations/${quotId}/${action}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      });

      if (!response.ok) throw new Error(`Failed to ${action} quotation`);

      toast.success(`Quotation ${action}ed successfully`);
      loadData();
    } catch (error) {
      console.error(`Error ${action}ing quotation:`, error);
      toast.error(`Failed to ${action} quotation`);
    }
  };

  const handleProposalAction = async (propId: number, action: "send" | "accept" | "reject", reason?: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/proposals/${propId}/${action}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      });

      if (!response.ok) throw new Error(`Failed to ${action} proposal`);

      toast.success(`Proposal ${action === "send" ? "sent" : action + "ed"} successfully`);
      loadData();
    } catch (error) {
      console.error(`Error ${action}ing proposal:`, error);
      toast.error(`Failed to ${action} proposal`);
    }
  };

  const resetQuotForm = () => {
    setQuotFormData({
      clientId: "",
      leadId: "",
      title: "",
      description: "",
      taxRate: "18",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "",
      termsConditions: "",
    });
    setQuotationItems([{ description: "", quantity: "1", unitPrice: "" }]);
  };

  const resetPropForm = () => {
    setPropFormData({
      clientId: "",
      leadId: "",
      title: "",
      description: "",
      objective: "",
      scopeOfWork: "",
      deliverables: "",
      timeline: "",
      pricing: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "accepted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "expired": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "under_review": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const filteredQuotations = quotations.filter(q =>
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProposals = proposals.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.proposalNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { subtotal, taxAmount, total } = calculateQuotationTotal();

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quotations & Proposals</h1>
          <p className="text-muted-foreground">Generate quotations and proposals for clients and leads</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isQuotDialogOpen} onOpenChange={(open) => {
            setIsQuotDialogOpen(open);
            if (!open) resetQuotForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Quotation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quotation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleQuotationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotClient">Client</Label>
                    <Select value={quotFormData.clientId} onValueChange={(value) => setQuotFormData({ ...quotFormData, clientId: value, leadId: "" })}>
                      <SelectTrigger id="quotClient">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quotLead">OR Lead</Label>
                    <Select value={quotFormData.leadId} onValueChange={(value) => setQuotFormData({ ...quotFormData, leadId: value, clientId: "" })}>
                      <SelectTrigger id="quotLead">
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quotTitle">Title *</Label>
                  <Input
                    id="quotTitle"
                    value={quotFormData.title}
                    onChange={(e) => setQuotFormData({ ...quotFormData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quotDesc">Description</Label>
                  <Textarea
                    id="quotDesc"
                    rows={2}
                    value={quotFormData.description}
                    onChange={(e) => setQuotFormData({ ...quotFormData, description: e.target.value })}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Line Items</Label>
                    <Button type="button" size="sm" onClick={addQuotationItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {quotationItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateQuotationItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateQuotationItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unitPrice}
                            onChange={(e) => updateQuotationItem(index, "unitPrice", e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeQuotationItem(index)}
                          disabled={quotationItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      value={quotFormData.taxRate}
                      onChange={(e) => setQuotFormData({ ...quotFormData, taxRate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={quotFormData.validUntil}
                      onChange={(e) => setQuotFormData({ ...quotFormData, validUntil: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Tax ({quotFormData.taxRate}%):</span>
                    <span className="font-semibold">₹{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={quotFormData.notes}
                    onChange={(e) => setQuotFormData({ ...quotFormData, notes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    rows={3}
                    value={quotFormData.termsConditions}
                    onChange={(e) => setQuotFormData({ ...quotFormData, termsConditions: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsQuotDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Quotation"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPropDialogOpen} onOpenChange={(open) => {
            setIsPropDialogOpen(open);
            if (!open) resetPropForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Proposal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProposalSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propClient">Client</Label>
                    <Select value={propFormData.clientId} onValueChange={(value) => setPropFormData({ ...propFormData, clientId: value, leadId: "" })}>
                      <SelectTrigger id="propClient">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propLead">OR Lead</Label>
                    <Select value={propFormData.leadId} onValueChange={(value) => setPropFormData({ ...propFormData, leadId: value, clientId: "" })}>
                      <SelectTrigger id="propLead">
                        <SelectValue placeholder="Select lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propTitle">Title *</Label>
                  <Input
                    id="propTitle"
                    value={propFormData.title}
                    onChange={(e) => setPropFormData({ ...propFormData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="propDesc">Description</Label>
                  <Textarea
                    id="propDesc"
                    rows={2}
                    value={propFormData.description}
                    onChange={(e) => setPropFormData({ ...propFormData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Objective</Label>
                  <Textarea
                    id="objective"
                    rows={2}
                    value={propFormData.objective}
                    onChange={(e) => setPropFormData({ ...propFormData, objective: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">Scope of Work</Label>
                  <Textarea
                    id="scope"
                    rows={3}
                    value={propFormData.scopeOfWork}
                    onChange={(e) => setPropFormData({ ...propFormData, scopeOfWork: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliverables">Deliverables</Label>
                  <Textarea
                    id="deliverables"
                    rows={2}
                    value={propFormData.deliverables}
                    onChange={(e) => setPropFormData({ ...propFormData, deliverables: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeline">Timeline</Label>
                    <Input
                      id="timeline"
                      value={propFormData.timeline}
                      onChange={(e) => setPropFormData({ ...propFormData, timeline: e.target.value })}
                      placeholder="e.g., 3 months"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricing">Pricing (₹)</Label>
                    <Input
                      id="pricing"
                      type="number"
                      value={propFormData.pricing}
                      onChange={(e) => setPropFormData({ ...propFormData, pricing: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsPropDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Proposal"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quotations</p>
                <p className="text-2xl font-bold">{quotations.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{quotations.filter(q => q.status === "accepted").length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proposals</p>
                <p className="text-2xl font-bold">{proposals.length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quotation Value</p>
                <p className="text-2xl font-bold">₹{(quotations.reduce((sum, q) => sum + q.totalAmount, 0) / 100000).toFixed(1)}L</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="quotations" className="w-full">
        <TabsList>
          <TabsTrigger value="quotations">Quotations ({filteredQuotations.length})</TabsTrigger>
          <TabsTrigger value="proposals">Proposals ({filteredProposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotations">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No quotations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotations.map((quot) => (
                      <TableRow key={quot.id}>
                        <TableCell className="font-mono">{quot.quotationNumber}</TableCell>
                        <TableCell className="font-medium">{quot.title}</TableCell>
                        <TableCell>₹{(quot.totalAmount / 100000).toFixed(2)}L</TableCell>
                        <TableCell>{new Date(quot.validUntil).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quot.status)}>{quot.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {quot.status === "sent" && (
                              <>
                                <Button size="sm" onClick={() => handleQuotationAction(quot.id, "accept")}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  const reason = prompt("Rejection reason:");
                                  if (reason) handleQuotationAction(quot.id, "reject", reason);
                                }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No proposals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProposals.map((prop) => (
                      <TableRow key={prop.id}>
                        <TableCell className="font-mono">{prop.proposalNumber}</TableCell>
                        <TableCell className="font-medium">{prop.title}</TableCell>
                        <TableCell>{prop.pricing ? `₹${(prop.pricing / 100000).toFixed(2)}L` : "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(prop.status)}>{prop.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {prop.status === "draft" && (
                              <Button size="sm" onClick={() => handleProposalAction(prop.id, "send")}>
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </Button>
                            )}
                            {(prop.status === "sent" || prop.status === "under_review") && (
                              <>
                                <Button size="sm" onClick={() => handleProposalAction(prop.id, "accept")}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  const reason = prompt("Rejection reason:");
                                  if (reason) handleProposalAction(prop.id, "reject", reason);
                                }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
