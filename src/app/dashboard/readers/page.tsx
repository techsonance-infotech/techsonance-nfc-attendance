"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Pencil, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Activity,
  MapPin,
  Clock,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Reader {
  id: number;
  readerId: string;
  name: string;
  location: string;
  type: string;
  status: string;
  lastHeartbeat: string | null;
  ipAddress: string | null;
  config: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ReadersPage() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReader, setEditingReader] = useState<Reader | null>(null);
  const [formData, setFormData] = useState({
    readerId: "",
    name: "",
    location: "",
    type: "ethernet",
    ipAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch readers
  const fetchReaders = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/readers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch readers");
      const data = await response.json();
      setReaders(data || []);
    } catch (error) {
      toast.error("Failed to load readers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReaders();

    // Auto-refresh every 30 seconds to update heartbeat status
    const interval = setInterval(() => {
      fetchReaders();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Open dialog for new reader
  const handleNew = () => {
    setEditingReader(null);
    setFormData({
      readerId: "",
      name: "",
      location: "",
      type: "ethernet",
      ipAddress: "",
    });
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (reader: Reader) => {
    setEditingReader(reader);
    setFormData({
      readerId: reader.readerId,
      name: reader.name,
      location: reader.location,
      type: reader.type,
      ipAddress: reader.ipAddress || "",
    });
    setDialogOpen(true);
  };

  // Handle submit (create or update)
  const handleSubmit = async () => {
    if (!formData.readerId || !formData.name || !formData.location || !formData.type) {
      toast.error("Reader ID, Name, Location, and Type are required");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const url = editingReader ? `/api/readers/${editingReader.id}` : "/api/readers";
      const method = editingReader ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          readerId: formData.readerId,
          name: formData.name,
          location: formData.location,
          type: formData.type,
          ipAddress: formData.ipAddress || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save reader");
      }

      toast.success(editingReader ? "Reader updated successfully" : "Reader created successfully");
      setDialogOpen(false);
      fetchReaders();
    } catch (error: any) {
      toast.error(error.message || "Failed to save reader");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter readers
  const filteredReaders = readers.filter(
    (reader) =>
      reader.readerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reader.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status badge
  const getStatusBadge = (reader: Reader) => {
    if (reader.status === "online") {
      return (
        <Badge variant="default" className="gap-1">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
      );
    } else if (reader.status === "offline") {
      return (
        <Badge variant="secondary" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Maintenance
        </Badge>
      );
    }
  };

  // Get last seen text
  const getLastSeen = (reader: Reader) => {
    if (!reader.lastHeartbeat) return "Never";
    return formatDistanceToNow(new Date(reader.lastHeartbeat), { addSuffix: true });
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      ethernet: { label: "Ethernet", variant: "default" },
      usb: { label: "USB", variant: "secondary" },
      mobile: { label: "Mobile", variant: "outline" },
    };
    const config = typeMap[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reader Devices</h1>
          <p className="text-muted-foreground mt-1">
            Manage NFC reader devices for attendance tracking
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Reader
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Single Reader Mode:</strong> Your NFC reader automatically handles both Time In and Time Out. When an employee taps their card, the system checks their current status:
          <ul className="list-disc list-inside mt-2 ml-2 space-y-1">
            <li>If not checked in today → Records <strong>Time In</strong></li>
            <li>If already checked in → Records <strong>Time Out</strong> and calculates duration</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Readers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readers.length}</div>
            <p className="text-xs text-muted-foreground">Registered devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {readers.filter((r) => r.status === "online").length}
            </div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {readers.filter((r) => r.status === "offline").length}
            </div>
            <p className="text-xs text-muted-foreground">Disconnected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(readers.map((r) => r.location)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Readers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reader Devices</CardTitle>
          <CardDescription>
            Configure NFC readers for automatic Time In/Time Out tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reader ID, name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reader ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReaders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No readers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReaders.map((reader) => (
                    <TableRow key={reader.id}>
                      <TableCell className="font-mono font-medium">
                        {reader.readerId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {reader.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {reader.location}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(reader.type)}</TableCell>
                      <TableCell>{getStatusBadge(reader)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getLastSeen(reader)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {reader.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reader)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reader Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingReader ? "Edit Reader Device" : "Add Reader Device"}
            </DialogTitle>
            <DialogDescription>
              Configure NFC reader for automatic Time In/Time Out tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Reader ID */}
            <div className="space-y-2">
              <Label htmlFor="reader-id">Reader ID *</Label>
              <Input
                id="reader-id"
                placeholder="e.g., MAIN_ENTRANCE, OFFICE_GATE"
                value={formData.readerId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, readerId: e.target.value.toUpperCase() }))
                }
                disabled={!!editingReader}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for the reader device
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Entrance Reader"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Friendly name for the reader device
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="e.g., Main Entrance, Building A"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select reader type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethernet">Ethernet (Wired Network)</SelectItem>
                  <SelectItem value="usb">USB (Direct Connection)</SelectItem>
                  <SelectItem value="mobile">Mobile (Android Device)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Connection type for the NFC reader
              </p>
            </div>

            {/* IP Address */}
            <div className="space-y-2">
              <Label htmlFor="ip-address">IP Address</Label>
              <Input
                id="ip-address"
                placeholder="e.g., 192.168.1.100"
                value={formData.ipAddress}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ipAddress: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Network IP address (for ethernet readers)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingReader(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingReader ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}