"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string | null;
}

export default function ManualAttendancePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    timeIn: "",
    timeOut: "",
    status: "present"
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
      loadEmployees();
    }
  }, [session]);

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

  const calculateDuration = (timeIn: string, timeOut: string): number => {
    const inTime = new Date(`${formData.date}T${timeIn}`);
    const outTime = new Date(`${formData.date}T${timeOut}`);
    return Math.floor((outTime.getTime() - inTime.getTime()) / 1000 / 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!formData.timeIn) {
      toast.error("Please enter time in");
      return;
    }

    try {
      setIsSubmitting(true);

      const duration = formData.timeOut && formData.timeIn
        ? calculateDuration(formData.timeIn, formData.timeOut)
        : null;

      const attendanceData = {
        employeeId: parseInt(formData.employeeId),
        date: new Date(formData.date).toISOString(),
        timeIn: new Date(`${formData.date}T${formData.timeIn}`).toISOString(),
        timeOut: formData.timeOut 
          ? new Date(`${formData.date}T${formData.timeOut}`).toISOString() 
          : null,
        duration,
        status: formData.status,
        checkInMethod: "manual"
      };

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendanceData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add attendance");
      }

      toast.success("Attendance added successfully");
      
      // Reset form
      setFormData({
        employeeId: "",
        date: new Date().toISOString().split("T")[0],
        timeIn: "",
        timeOut: "",
        status: "present"
      });
    } catch (error: any) {
      console.error("Error adding attendance:", error);
      toast.error(error.message || "Failed to add attendance");
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manual Attendance Entry</h1>
        <p className="text-muted-foreground">
          Add attendance records manually when NFC or automatic tracking is not available
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                When to use manual entry:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>NFC reader is not working or unavailable</li>
                <li>Employee forgot to check in/out</li>
                <li>System downtime or technical issues</li>
                <li>Retroactive attendance corrections</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Add Attendance Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} - {employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Time In */}
            <div className="space-y-2">
              <Label htmlFor="timeIn">Time In *</Label>
              <Input
                id="timeIn"
                type="time"
                value={formData.timeIn}
                onChange={(e) => setFormData({ ...formData, timeIn: e.target.value })}
                required
              />
            </div>

            {/* Time Out */}
            <div className="space-y-2">
              <Label htmlFor="timeOut">Time Out (Optional)</Label>
              <Input
                id="timeOut"
                type="time"
                value={formData.timeOut}
                onChange={(e) => setFormData({ ...formData, timeOut: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if employee hasn't checked out yet
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Attendance...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add Attendance Record
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Duration Preview */}
      {formData.timeIn && formData.timeOut && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Duration Preview:
              </span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">
                {(() => {
                  const duration = calculateDuration(formData.timeIn, formData.timeOut);
                  const hours = Math.floor(duration / 60);
                  const minutes = duration % 60;
                  return `${hours}h ${minutes}m`;
                })()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
