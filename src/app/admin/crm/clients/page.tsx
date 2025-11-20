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
import { Loader2, Plus, Search, Building2, TrendingUp, Users, Phone, Mail, Globe, Calendar, FileText, Briefcase, Activity } from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  industry: string | null;
  companySize: string | null;
  annualRevenue: number | null;
  website: string | null;
  assignedAccountManager: number | null;
  status: string;
  leadId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Communication {
  id: number;
  clientId: number | null;
  type: string;
  subject: string | null;
  notes: string;
  userId: number | null;
  communicationDate: string;
  createdAt: string;
}

interface Contract {
  id: number;
  clientId: number;
  contractNumber: string;
  title: string;
  value: number;
  startDate: string;
  endDate: string;
  status: string;
  signedBy: string | null;
  signedAt: string | null;
}

interface Project {
  id: number;
  name: string;
  clientId: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  spent: number;
}

interface SLA {
  id: number;
  clientId: number;
  metricName: string;
  targetValue: string;
  currentValue: string | null;
  status: string;
  measurementPeriod: string | null;
  lastMeasuredAt: string | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    industry: "",
    companySize: "",
    annualRevenue: "",
    website: "",
    status: "active",
  });

  const [commFormData, setCommFormData] = useState({
    type: "email",
    subject: "",
    notes: "",
    communicationDate: new Date().toISOString().split("T")[0],
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
      loadClients();
    }
  }, [session, statusFilter]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("bearer_token");
      const url = statusFilter === "all" ? "/api/clients" : "/api/clients/active";
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to load clients");
      const data = await response.json();
      setClients(statusFilter === "all" ? data : data.filter((c: Client) => c.status === statusFilter));
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientDetails = async (clientId: number) => {
    const token = localStorage.getItem("bearer_token");
    
    try {
      // Load communications
      const commRes = await fetch(`/api/communications/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommunications(commData);
      }

      // Load contracts
      const contractRes = await fetch(`/api/contracts/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        setContracts(contractData);
      }

      // Load projects
      const projectRes = await fetch(`/api/projects/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProjects(projectData);
      }

      // Load SLAs
      const slaRes = await fetch(`/api/slas/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (slaRes.ok) {
        const slaData = await slaRes.json();
        setSlas(slaData);
      }
    } catch (error) {
      console.error("Error loading client details:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("bearer_token");

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        industry: formData.industry || null,
        companySize: formData.companySize || null,
        annualRevenue: formData.annualRevenue ? parseInt(formData.annualRevenue) : null,
        website: formData.website || null,
        status: formData.status,
      };

      const url = editingClient ? `/api/clients?id=${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save client");
      }

      toast.success(editingClient ? "Client updated successfully" : "Client created successfully");
      setIsDialogOpen(false);
      resetForm();
      loadClients();
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast.error(error.message || "Failed to save client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !commFormData.notes) {
      toast.error("Notes are required");
      return;
    }

    try {
      const token = localStorage.getItem("bearer_token");

      const payload = {
        clientId: selectedClient.id,
        type: commFormData.type,
        subject: commFormData.subject || null,
        notes: commFormData.notes,
        communicationDate: new Date(commFormData.communicationDate).toISOString(),
      };

      const response = await fetch("/api/communications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add communication");

      toast.success("Communication logged successfully");
      setIsCommDialogOpen(false);
      setCommFormData({
        type: "email",
        subject: "",
        notes: "",
        communicationDate: new Date().toISOString().split("T")[0],
      });
      loadClientDetails(selectedClient.id);
    } catch (error) {
      console.error("Error adding communication:", error);
      toast.error("Failed to add communication");
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      industry: client.industry || "",
      companySize: client.companySize || "",
      annualRevenue: client.annualRevenue?.toString() || "",
      website: client.website || "",
      status: client.status,
    });
    setIsDialogOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    loadClientDetails(client.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      companySize: "",
      annualRevenue: "",
      website: "",
      status: "active",
    });
    setEditingClient(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "on_hold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getSlaStatusColor = (status: string) => {
    switch (status) {
      case "met": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "at_risk": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "breached": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === "active").length,
    inactive: clients.filter(c => c.status === "inactive").length,
    totalRevenue: clients.reduce((sum, c) => sum + (c.annualRevenue || 0), 0),
  };

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
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage client profiles, contracts, and relationships</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., IT, Healthcare"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={formData.companySize} onValueChange={(value) => setFormData({ ...formData, companySize: value })}>
                    <SelectTrigger id="companySize">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">Annual Revenue (₹)</Label>
                  <Input
                    id="annualRevenue"
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingClient ? "Update Client" : "Create Client"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
              <Users className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{(stats.totalRevenue / 10000000).toFixed(1)}Cr</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
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
                placeholder="Search clients..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Details Dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedClient.name}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="communications">Communications</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="slas">SLAs</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{selectedClient.email}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      <span>{selectedClient.phone || "N/A"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Industry</Label>
                    <p className="mt-1">{selectedClient.industry || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Company Size</Label>
                    <p className="mt-1">{selectedClient.companySize || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="h-4 w-4" />
                      <span>{selectedClient.website || "N/A"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedClient.status)}>
                        {selectedClient.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="mt-1">{selectedClient.address || "N/A"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="communications" className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setIsCommDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {communications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No communications logged</p>
                  ) : (
                    communications.map((comm) => (
                      <Card key={comm.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{comm.type}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(comm.communicationDate).toLocaleDateString()}
                                </span>
                              </div>
                              {comm.subject && <h4 className="font-semibold mb-1">{comm.subject}</h4>}
                              <p className="text-sm text-muted-foreground">{comm.notes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contracts" className="space-y-4">
                {contracts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No contracts found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contract #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-mono">{contract.contractNumber}</TableCell>
                          <TableCell>{contract.title}</TableCell>
                          <TableCell>₹{(contract.value / 100000).toFixed(2)}L</TableCell>
                          <TableCell className="text-sm">
                            {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{contract.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                {projects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No projects found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Spent</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{project.status}</Badge>
                          </TableCell>
                          <TableCell>₹{project.budget ? (project.budget / 100000).toFixed(2) + "L" : "N/A"}</TableCell>
                          <TableCell>₹{(project.spent / 100000).toFixed(2)}L</TableCell>
                          <TableCell>
                            {project.budget ? `₹${((project.budget - project.spent) / 100000).toFixed(2)}L` : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="slas" className="space-y-4">
                {slas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No SLAs configured</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slas.map((sla) => (
                        <TableRow key={sla.id}>
                          <TableCell className="font-medium">{sla.metricName}</TableCell>
                          <TableCell>{sla.targetValue}</TableCell>
                          <TableCell>{sla.currentValue || "N/A"}</TableCell>
                          <TableCell>
                            <Badge className={getSlaStatusColor(sla.status)}>{sla.status}</Badge>
                          </TableCell>
                          <TableCell>{sla.measurementPeriod || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Communication Dialog */}
      <Dialog open={isCommDialogOpen} onOpenChange={setIsCommDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCommSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={commFormData.type} onValueChange={(value) => setCommFormData({ ...commFormData, type: value })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={commFormData.subject}
                onChange={(e) => setCommFormData({ ...commFormData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commDate">Date</Label>
              <Input
                id="commDate"
                type="date"
                value={commFormData.communicationDate}
                onChange={(e) => setCommFormData({ ...commFormData, communicationDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes *</Label>
              <Textarea
                id="notes"
                rows={4}
                value={commFormData.notes}
                onChange={(e) => setCommFormData({ ...commFormData, notes: e.target.value })}
                required
                placeholder="Summary of the communication..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCommDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Log Communication
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{client.email}</div>
                        {client.phone && <div className="text-muted-foreground">{client.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{client.industry || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(client.status)}>{client.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(client)}>
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>
                          Edit
                        </Button>
                      </div>
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
