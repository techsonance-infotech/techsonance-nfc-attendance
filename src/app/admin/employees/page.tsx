"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Edit, Trash2, CreditCard, Loader2, User, Mail, Briefcase, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";
import { useSession } from "@/lib/auth-client";
import { isNFCSupported, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";

interface Employee {
  id: number;
  name: string;
  email: string;
  nfcCardId: string | null;
  department: string | null;
  photoUrl: string | null;
  salary: number | null;
  hourlyRate: number | null;
  createdAt: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNFCDialogOpen, setIsNFCDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    salary: "",
    hourlyRate: "",
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
      loadEmployees();
    }
  }, [session, isPending, router]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to load employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add employee");
      }

      toast.success("Employee added successfully");
      setIsAddDialogOpen(false);
      setFormData({ name: "", email: "", department: "", salary: "", hourlyRate: "" });
      loadEmployees();
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update employee");
      }

      toast.success("Employee updated successfully");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      toast.success("Employee deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      hourlyRate: employee.hourlyRate?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const openNFCDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsNFCDialogOpen(true);
  };

  const startNFCScanning = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on this device. Please use an Android device with Chrome browser.");
      return;
    }

    setIsScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        toast.success(`Card detected: ${formatNFCSerial(result.serialNumber)}`);
        
        // Assign NFC card to employee
        if (selectedEmployee) {
          try {
            const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nfc_card_id: result.serialNumber,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to assign NFC card");
            }

            toast.success("NFC card assigned successfully");
            setIsNFCDialogOpen(false);
            stopNFCReader(controller);
            setIsScanning(false);
            setNfcController(null);
            loadEmployees();
          } catch (error: any) {
            console.error("Error assigning NFC card:", error);
            toast.error(error.message || "Failed to assign NFC card");
          }
        }
      },
      (error) => {
        console.error("NFC error:", error);
        toast.error(error.message);
        setIsScanning(false);
        setNfcController(null);
      }
    );

    setNfcController(controller);
  };

  const stopNFCScanning = () => {
    stopNFCReader(nfcController);
    setIsScanning(false);
    setNfcController(null);
    toast.info("NFC scanning stopped");
  };

  const removeNFCCard = async (employee: Employee) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfc_card_id: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove NFC card");
      }

      toast.success("NFC card removed successfully");
      loadEmployees();
    } catch (error: any) {
      console.error("Error removing NFC card:", error);
      toast.error(error.message || "Failed to remove NFC card");
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isPending || (isLoading && employees.length === 0)) {
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
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employees, assign NFC cards, and set compensation</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Enter employee details to add them to the system.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Annual Salary (₹)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="75000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="35.50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee}>Add Employee</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No employees found" : "No employees yet. Add your first employee to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </CardDescription>
                      {employee.department && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {employee.department}
                        </div>
                      )}
                      {(employee.salary || employee.hourlyRate) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                          <DollarSign className="h-3 w-3" />
                          {employee.salary && <span>${employee.salary.toLocaleString()}/year</span>}
                          {employee.salary && employee.hourlyRate && <span>•</span>}
                          {employee.hourlyRate && <span>${employee.hourlyRate.toFixed(2)}/hour</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {employee.nfcCardId ? (
                        <Badge variant="default">{formatNFCSerial(employee.nfcCardId)}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No NFC card assigned</span>
                      )}
                    </div>
                    {employee.nfcCardId ? (
                      <Button variant="outline" size="sm" onClick={() => removeNFCCard(employee)}>
                        Remove Card
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openNFCDialog(employee)}>
                        Assign NFC Card
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-salary">Annual Salary ($)</Label>
              <Input
                id="edit-salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NFC Assignment Dialog */}
      <Dialog open={isNFCDialogOpen} onOpenChange={(open) => {
        setIsNFCDialogOpen(open);
        if (!open && isScanning) {
          stopNFCScanning();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign NFC Card</DialogTitle>
            <DialogDescription>
              Tap an NFC card to assign it to {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            {!isNFCSupported() ? (
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>NFC is not supported on this device.</p>
                <p className="text-sm mt-2">Please use an Android device with Chrome browser.</p>
              </div>
            ) : isScanning ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Scanning for NFC card...</p>
                <p className="text-sm text-muted-foreground">Please hold your card near the device</p>
              </>
            ) : (
              <>
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan NFC card</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNFCDialogOpen(false)}>
              Cancel
            </Button>
            {isScanning ? (
              <Button variant="destructive" onClick={stopNFCScanning}>
                Stop Scanning
              </Button>
            ) : (
              <Button onClick={startNFCScanning} disabled={!isNFCSupported()}>
                <CreditCard className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Edit, Trash2, CreditCard, Loader2, User, Mail, Briefcase, Search, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";
import { useSession } from "@/lib/auth-client";
import { isNFCSupported, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";

interface Employee {
  id: number;
  name: string;
  email: string;
  nfcCardId: string | null;
  department: string | null;
  photoUrl: string | null;
  salary: number | null;
  hourlyRate: number | null;
  createdAt: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNFCDialogOpen, setIsNFCDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    salary: "",
    hourlyRate: "",
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
      loadEmployees();
    }
  }, [session, isPending, router]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to load employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add employee");
      }

      toast.success("Employee added successfully");
      setIsAddDialogOpen(false);
      setFormData({ name: "", email: "", department: "", salary: "", hourlyRate: "" });
      loadEmployees();
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update employee");
      }

      toast.success("Employee updated successfully");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      toast.success("Employee deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      hourlyRate: employee.hourlyRate?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const openNFCDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsNFCDialogOpen(true);
  };

  const startNFCScanning = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on this device. Please use an Android device with Chrome browser.");
      return;
    }

    setIsScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        toast.success(`Card detected: ${formatNFCSerial(result.serialNumber)}`);
        
        // Assign NFC card to employee
        if (selectedEmployee) {
          try {
            const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nfc_card_id: result.serialNumber,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to assign NFC card");
            }

            toast.success("NFC card assigned successfully");
            setIsNFCDialogOpen(false);
            stopNFCReader(controller);
            setIsScanning(false);
            setNfcController(null);
            loadEmployees();
          } catch (error: any) {
            console.error("Error assigning NFC card:", error);
            toast.error(error.message || "Failed to assign NFC card");
          }
        }
      },
      (error) => {
        console.error("NFC error:", error);
        toast.error(error.message);
        setIsScanning(false);
        setNfcController(null);
      }
    );

    setNfcController(controller);
  };

  const stopNFCScanning = () => {
    stopNFCReader(nfcController);
    setIsScanning(false);
    setNfcController(null);
    toast.info("NFC scanning stopped");
  };

  const removeNFCCard = async (employee: Employee) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfc_card_id: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove NFC card");
      }

      toast.success("NFC card removed successfully");
      loadEmployees();
    } catch (error: any) {
      console.error("Error removing NFC card:", error);
      toast.error(error.message || "Failed to remove NFC card");
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isPending || (isLoading && employees.length === 0)) {
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
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employees, assign NFC cards, and set compensation</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Enter employee details to add them to the system.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Annual Salary ($)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="75000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="35.50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee}>Add Employee</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No employees found" : "No employees yet. Add your first employee to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </CardDescription>
                      {employee.department && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {employee.department}
                        </div>
                      )}
                      {(employee.salary || employee.hourlyRate) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                          <IndianRupee className="h-3 w-3" />
                          {employee.salary && <span>{employee.salary.toLocaleString()}/year</span>}
                          {employee.salary && employee.hourlyRate && <span>•</span>}
                          {employee.hourlyRate && <span>{employee.hourlyRate.toFixed(2)}/hour</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {employee.nfcCardId ? (
                        <Badge variant="default">{formatNFCSerial(employee.nfcCardId)}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No NFC card assigned</span>
                      )}
                    </div>
                    {employee.nfcCardId ? (
                      <Button variant="outline" size="sm" onClick={() => removeNFCCard(employee)}>
                        Remove Card
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openNFCDialog(employee)}>
                        Assign NFC Card
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-salary">Annual Salary ($)</Label>
              <Input
                id="edit-salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NFC Assignment Dialog */}
      <Dialog open={isNFCDialogOpen} onOpenChange={(open) => {
        setIsNFCDialogOpen(open);
        if (!open && isScanning) {
          stopNFCScanning();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign NFC Card</DialogTitle>
            <DialogDescription>
              Tap an NFC card to assign it to {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            {!isNFCSupported() ? (
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>NFC is not supported on this device.</p>
                <p className="text-sm mt-2">Please use an Android device with Chrome browser.</p>
              </div>
            ) : isScanning ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Scanning for NFC card...</p>
                <p className="text-sm text-muted-foreground">Please hold your card near the device</p>
              </>
            ) : (
              <>
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan NFC card</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNFCDialogOpen(false)}>
              Cancel
            </Button>
            {isScanning ? (
              <Button variant="destructive" onClick={stopNFCScanning}>
                Stop Scanning
              </Button>
            ) : (
              <Button onClick={startNFCScanning} disabled={!isNFCSupported()}>
                <CreditCard className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Edit, Trash2, CreditCard, Loader2, User, Mail, Briefcase, Search, DollarSign, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";
import { useSession } from "@/lib/auth-client";
import { isNFCSupported, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";

interface Employee {
  id: number;
  name: string;
  email: string;
  nfcCardId: string | null;
  department: string | null;
  photoUrl: string | null;
  salary: number | null;
  hourlyRate: number | null;
  createdAt: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNFCDialogOpen, setIsNFCDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    salary: "",
    hourlyRate: "",
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
      loadEmployees();
    }
  }, [session, isPending, router]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to load employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add employee");
      }

      toast.success("Employee added successfully");
      setIsAddDialogOpen(false);
      setFormData({ name: "", email: "", department: "", salary: "", hourlyRate: "" });
      loadEmployees();
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update employee");
      }

      toast.success("Employee updated successfully");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      toast.success("Employee deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      hourlyRate: employee.hourlyRate?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const openNFCDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsNFCDialogOpen(true);
  };

  const startNFCScanning = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on this device. Please use an Android device with Chrome browser.");
      return;
    }

    setIsScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        toast.success(`Card detected: ${formatNFCSerial(result.serialNumber)}`);
        
        // Assign NFC card to employee
        if (selectedEmployee) {
          try {
            const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nfc_card_id: result.serialNumber,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to assign NFC card");
            }

            toast.success("NFC card assigned successfully");
            setIsNFCDialogOpen(false);
            stopNFCReader(controller);
            setIsScanning(false);
            setNfcController(null);
            loadEmployees();
          } catch (error: any) {
            console.error("Error assigning NFC card:", error);
            toast.error(error.message || "Failed to assign NFC card");
          }
        }
      },
      (error) => {
        console.error("NFC error:", error);
        toast.error(error.message);
        setIsScanning(false);
        setNfcController(null);
      }
    );

    setNfcController(controller);
  };

  const stopNFCScanning = () => {
    stopNFCReader(nfcController);
    setIsScanning(false);
    setNfcController(null);
    toast.info("NFC scanning stopped");
  };

  const removeNFCCard = async (employee: Employee) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfc_card_id: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove NFC card");
      }

      toast.success("NFC card removed successfully");
      loadEmployees();
    } catch (error: any) {
      console.error("Error removing NFC card:", error);
      toast.error(error.message || "Failed to remove NFC card");
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isPending || (isLoading && employees.length === 0)) {
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
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employees, assign NFC cards, and set compensation</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Enter employee details to add them to the system.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Annual Salary ($)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="75000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="35.50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee}>Add Employee</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No employees found" : "No employees yet. Add your first employee to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </CardDescription>
                      {employee.department && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {employee.department}
                        </div>
                      )}
                      {(employee.salary || employee.hourlyRate) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                          <IndianRupee className="h-3 w-3" />
                          {employee.salary && <span>₹{employee.salary.toLocaleString()}/year</span>}
                          {employee.salary && employee.hourlyRate && <span>•</span>}
                          {employee.hourlyRate && <span>₹{employee.hourlyRate.toFixed(2)}/hour</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {employee.nfcCardId ? (
                        <Badge variant="default">{formatNFCSerial(employee.nfcCardId)}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No NFC card assigned</span>
                      )}
                    </div>
                    {employee.nfcCardId ? (
                      <Button variant="outline" size="sm" onClick={() => removeNFCCard(employee)}>
                        Remove Card
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openNFCDialog(employee)}>
                        Assign NFC Card
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-salary">Annual Salary ($)</Label>
              <Input
                id="edit-salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NFC Assignment Dialog */}
      <Dialog open={isNFCDialogOpen} onOpenChange={(open) => {
        setIsNFCDialogOpen(open);
        if (!open && isScanning) {
          stopNFCScanning();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign NFC Card</DialogTitle>
            <DialogDescription>
              Tap an NFC card to assign it to {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            {!isNFCSupported() ? (
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>NFC is not supported on this device.</p>
                <p className="text-sm mt-2">Please use an Android device with Chrome browser.</p>
              </div>
            ) : isScanning ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Scanning for NFC card...</p>
                <p className="text-sm text-muted-foreground">Please hold your card near the device</p>
              </>
            ) : (
              <>
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan NFC card</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNFCDialogOpen(false)}>
              Cancel
            </Button>
            {isScanning ? (
              <Button variant="destructive" onClick={stopNFCScanning}>
                Stop Scanning
              </Button>
            ) : (
              <Button onClick={startNFCScanning} disabled={!isNFCSupported()}>
                <CreditCard className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Edit, Trash2, CreditCard, Loader2, User, Mail, Briefcase, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";
import AdminNav from "@/components/AdminNav";
import { useSession } from "@/lib/auth-client";
import { isNFCSupported, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";

interface Employee {
  id: number;
  name: string;
  email: string;
  nfcCardId: string | null;
  department: string | null;
  photoUrl: string | null;
  salary: number | null;
  hourlyRate: number | null;
  createdAt: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNFCDialogOpen, setIsNFCDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    salary: "",
    hourlyRate: "",
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
      loadEmployees();
    }
  }, [session, isPending, router]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to load employees");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add employee");
      }

      toast.success("Employee added successfully");
      setIsAddDialogOpen(false);
      setFormData({ name: "", email: "", department: "", salary: "", hourlyRate: "" });
      loadEmployees();
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee");
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        department: formData.department || undefined,
      };

      if (formData.salary) {
        body.salary = parseFloat(formData.salary);
      }

      if (formData.hourlyRate) {
        body.hourly_rate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update employee");
      }

      toast.success("Employee updated successfully");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      toast.success("Employee deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      department: employee.department || "",
      salary: employee.salary?.toString() || "",
      hourlyRate: employee.hourlyRate?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const openNFCDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsNFCDialogOpen(true);
  };

  const startNFCScanning = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on this device. Please use an Android device with Chrome browser.");
      return;
    }

    setIsScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        toast.success(`Card detected: ${formatNFCSerial(result.serialNumber)}`);
        
        // Assign NFC card to employee
        if (selectedEmployee) {
          try {
            const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nfc_card_id: result.serialNumber,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || "Failed to assign NFC card");
            }

            toast.success("NFC card assigned successfully");
            setIsNFCDialogOpen(false);
            stopNFCReader(controller);
            setIsScanning(false);
            setNfcController(null);
            loadEmployees();
          } catch (error: any) {
            console.error("Error assigning NFC card:", error);
            toast.error(error.message || "Failed to assign NFC card");
          }
        }
      },
      (error) => {
        console.error("NFC error:", error);
        toast.error(error.message);
        setIsScanning(false);
        setNfcController(null);
      }
    );

    setNfcController(controller);
  };

  const stopNFCScanning = () => {
    stopNFCReader(nfcController);
    setIsScanning(false);
    setNfcController(null);
    toast.info("NFC scanning stopped");
  };

  const removeNFCCard = async (employee: Employee) => {
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nfc_card_id: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove NFC card");
      }

      toast.success("NFC card removed successfully");
      loadEmployees();
    } catch (error: any) {
      console.error("Error removing NFC card:", error);
      toast.error(error.message || "Failed to remove NFC card");
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department && employee.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isPending || (isLoading && employees.length === 0)) {
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
      
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">Employee Management</h2>
          <p className="text-muted-foreground">Manage employees, assign NFC cards, and set compensation</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>Enter employee details to add them to the system.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salary">Annual Salary (₹)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="75000"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="35.50"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmployee}>Add Employee</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No employees found" : "No employees yet. Add your first employee to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </CardDescription>
                      {employee.department && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {employee.department}
                        </div>
                      )}
                      {(employee.salary || employee.hourlyRate) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                          <DollarSign className="h-3 w-3" />
                          {employee.salary && <span>${employee.salary.toLocaleString()}/year</span>}
                          {employee.salary && employee.hourlyRate && <span>•</span>}
                          {employee.hourlyRate && <span>${employee.hourlyRate.toFixed(2)}/hour</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      {employee.nfcCardId ? (
                        <Badge variant="default">{formatNFCSerial(employee.nfcCardId)}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No NFC card assigned</span>
                      )}
                    </div>
                    {employee.nfcCardId ? (
                      <Button variant="outline" size="sm" onClick={() => removeNFCCard(employee)}>
                        Remove Card
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openNFCDialog(employee)}>
                        Assign NFC Card
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-salary">Annual Salary (₹)</Label>
              <Input
                id="edit-salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-hourlyRate">Hourly Rate (₹)</Label>
              <Input
                id="edit-hourlyRate"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NFC Assignment Dialog */}
      <Dialog open={isNFCDialogOpen} onOpenChange={(open) => {
        setIsNFCDialogOpen(open);
        if (!open && isScanning) {
          stopNFCScanning();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign NFC Card</DialogTitle>
            <DialogDescription>
              Tap an NFC card to assign it to {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            {!isNFCSupported() ? (
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>NFC is not supported on this device.</p>
                <p className="text-sm mt-2">Please use an Android device with Chrome browser.</p>
              </div>
            ) : isScanning ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Scanning for NFC card...</p>
                <p className="text-sm text-muted-foreground">Please hold your card near the device</p>
              </>
            ) : (
              <>
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan NFC card</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNFCDialogOpen(false)}>
              Cancel
            </Button>
            {isScanning ? (
              <Button variant="destructive" onClick={stopNFCScanning}>
                Stop Scanning
              </Button>
            ) : (
              <Button onClick={startNFCScanning} disabled={!isNFCSupported()}>
                <CreditCard className="mr-2 h-4 w-4" />
                Start Scanning
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}