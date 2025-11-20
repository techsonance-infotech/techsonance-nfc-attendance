"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Clock, LogOut, Loader2, CheckCircle, XCircle, CreditCard, User } from "lucide-react";
import { getCurrentLocation, isWithinOfficeLocation } from "@/lib/geolocation";
import { getSettings } from "@/lib/storage";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { isNFCSupported, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";

interface Employee {
  id: number;
  name: string;
  email: string;
  nfcCardId: string | null;
  department: string | null;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  timeIn: string;
  timeOut: string | null;
  duration: number | null;
  status: string;
  checkInMethod: string;
}

export default function Home() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNFCScanning, setIsNFCScanning] = useState(false);
  const [nfcController, setNfcController] = useState<AbortController | null>(null);

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Mark previous days without timeout as leave
    markMissingTimeoutsAsLeave();
  }, []);

  const markMissingTimeoutsAsLeave = async () => {
    try {
      await fetch("/api/attendance/mark-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error marking missing timeouts:", error);
    }
  };

  const loadTodayAttendance = async (employeeId: number) => {
    try {
      const response = await fetch(`/api/attendance/today/${employeeId}`);
      const data = await response.json();
      
      if (data.data === null) {
        setTodayRecord(null);
      } else {
        setTodayRecord(data);
      }
    } catch (error) {
      console.error("Error loading today's attendance:", error);
      setTodayRecord(null);
    }
  };

  const startNFCScanning = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on this device. Please use an Android device with Chrome browser.");
      return;
    }

    setIsNFCScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        
        // Look up employee by NFC card ID
        try {
          const response = await fetch(`/api/employees/nfc/${result.serialNumber}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              toast.error("NFC card not registered. Please register the card first in Employee Management.");
            } else {
              toast.error("Failed to find employee with this NFC card.");
            }
            return;
          }

          const employee = await response.json();
          setCurrentEmployee(employee);
          toast.success(`Welcome, ${employee.name}!`);

          // Load today's attendance
          await loadTodayAttendance(employee.id);

          // Stop scanning
          stopNFCReader(controller);
          setIsNFCScanning(false);
          setNfcController(null);

        } catch (error: any) {
          console.error("Error looking up employee:", error);
          toast.error("Failed to find employee with this NFC card.");
        }
      },
      (error) => {
        console.error("NFC error:", error);
        toast.error(error.message);
        setIsNFCScanning(false);
        setNfcController(null);
      }
    );

    setNfcController(controller);
  };

  const stopNFCScanning = () => {
    stopNFCReader(nfcController);
    setIsNFCScanning(false);
    setNfcController(null);
    toast.info("NFC scanning stopped");
  };

  const handleCheckInWithLocation = async () => {
    if (!currentEmployee) {
      toast.error("Please scan your NFC card first");
      return;
    }

    setIsChecking(true);
    try {
      const position = await getCurrentLocation();
      const settings = getSettings();
      
      const { latitude, longitude } = position.coords;
      
      const withinOffice = isWithinOfficeLocation(
        latitude,
        longitude,
        settings.officeLocation
      );

      if (!withinOffice) {
        toast.error("You are not within the office location!");
        setIsChecking(false);
        return;
      }

      const now = new Date();
      
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: currentEmployee.id,
          time_in: now.toISOString(),
          location_latitude: latitude,
          location_longitude: longitude,
          check_in_method: "geolocation",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check in");
      }

      const record = await response.json();
      setTodayRecord(record);
      toast.success("Successfully checked in!");
    } catch (error: any) {
      let errorMessage = "Failed to get location. Please enable location services.";
      
      if (error.code === 1) {
        errorMessage = "Location permission denied. Please allow location access in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your device settings.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }
      
      toast.error(errorMessage);
      console.error("Geolocation error:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckInWithNFC = async () => {
    if (!currentEmployee) {
      toast.error("Please scan your NFC card first");
      return;
    }

    setIsChecking(true);
    try {
      const now = new Date();
      
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: currentEmployee.id,
          time_in: now.toISOString(),
          check_in_method: "nfc",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check in");
      }

      const record = await response.json();
      setTodayRecord(record);
      toast.success("Successfully checked in!");
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckOut = () => {
    setShowTimeoutDialog(true);
  };

  const confirmCheckOut = async () => {
    if (!todayRecord) return;

    try {
      const now = new Date();
      
      const response = await fetch(`/api/attendance/${todayRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_out: now.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check out");
      }

      const updatedRecord = await response.json();
      setTodayRecord(updatedRecord);
      setShowTimeoutDialog(false);
      toast.success("Successfully checked out!");
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error("Failed to check out. Please try again.");
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isCheckedIn = todayRecord && !todayRecord.timeOut;
  const isCheckedOut = todayRecord && todayRecord.timeOut;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold">NFC Attendance Tracker</h1>
          <p className="text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p className="text-3xl font-mono font-bold mt-2">
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>

        {/* NFC Card Scanner */}
        {!currentEmployee && (
          <Card>
            <CardHeader>
              <CardTitle>Scan Your NFC Card</CardTitle>
              <CardDescription>Tap your employee card to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                {!isNFCSupported() ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      NFC is not supported on this device
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please use an Android device with Chrome browser
                    </p>
                  </>
                ) : isNFCScanning ? (
                  <>
                    <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Scanning for NFC card...
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Hold your card near the device
                    </p>
                    <Button variant="outline" onClick={stopNFCScanning}>
                      Stop Scanning
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      Ready to scan your employee card
                    </p>
                    <Button onClick={startNFCScanning} size="lg" className="w-full">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Scan NFC Card
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Info */}
        {currentEmployee && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {currentEmployee.name}
                  </CardTitle>
                  <CardDescription>{currentEmployee.email}</CardDescription>
                  {currentEmployee.department && (
                    <Badge variant="secondary" className="mt-2">
                      {currentEmployee.department}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentEmployee(null);
                    setTodayRecord(null);
                  }}
                >
                  Change
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Status Card */}
        {currentEmployee && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Status</CardTitle>
                <Badge variant={isCheckedOut ? "secondary" : isCheckedIn ? "default" : "outline"}>
                  {isCheckedOut ? "Checked Out" : isCheckedIn ? "Checked In" : "Not Checked In"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!todayRecord && (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Check in when you arrive at the office
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={handleCheckInWithNFC}
                      disabled={isChecking}
                      size="lg"
                      className="w-full"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Quick Check In (NFC)
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCheckInWithLocation}
                      disabled={isChecking}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Check In with Location
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {todayRecord && !todayRecord.timeOut && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Checked in at</p>
                      <p className="text-lg font-semibold">{formatTime(todayRecord.timeIn)}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckOut}
                    variant="destructive"
                    size="lg"
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                </div>
              )}

              {todayRecord && todayRecord.timeOut && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Time In</p>
                      <p className="font-semibold">{formatTime(todayRecord.timeIn)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <XCircle className="h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Time Out</p>
                      <p className="font-semibold">{formatTime(todayRecord.timeOut)}</p>
                    </div>
                  </div>

                  {todayRecord.duration && (
                    <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Total Duration</p>
                        <p className="text-lg font-bold">{formatDuration(todayRecord.duration)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Scan your NFC employee card to identify yourself</p>
            <p>• Check in with NFC (quick) or location verification</p>
            <p>• Manually check out when you leave</p>
            <p>• Missing check-outs will be marked as leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Confirmation Dialog */}
      <AlertDialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to check out? This will record your departure time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCheckOut}>
              Confirm Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}