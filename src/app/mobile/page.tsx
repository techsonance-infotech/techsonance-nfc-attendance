"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scan,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  LogOut,
  Wifi,
  WifiOff,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface AttendanceRecord {
  id: number;
  checkIn: string;
  checkOut: string | null;
  status: string;
}

interface OfflineEntry {
  id: string;
  type: "checkin" | "checkout";
  tagUid: string;
  timestamp: string;
  readerId: string;
  location: string;
}

export default function MobilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineEntry[]>([]);
  const [nfcSupported, setNfcSupported] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login?redirect=/mobile");
    }
  }, [session, isPending, router]);

  // Check NFC support
  useEffect(() => {
    if ("NDEFReader" in window) {
      setNfcSupported(true);
    } else {
      setNfcSupported(false);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online - syncing data...");
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("You are offline - data will be synced when connection returns");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem("offline_attendance_queue");
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch today's attendance record
  const fetchTodayRecord = async () => {
    if (!session?.user?.id) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const today = format(new Date(), "yyyy-MM-dd");
      
      const response = await fetch(`/api/attendance/employee/${session.user.id}?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.records && data.records.length > 0) {
          setTodayRecord(data.records[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch today's record:", error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchTodayRecord();
    }
  }, [session]);

  // Sync offline queue
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    const token = localStorage.getItem("bearer_token");
    const successfulSyncs: string[] = [];

    for (const entry of offlineQueue) {
      try {
        const endpoint = entry.type === "checkin" ? "/api/attendance/checkin" : "/api/attendance/checkout";
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tagUid: entry.tagUid,
            readerId: entry.readerId,
            location: entry.location,
            timestamp: entry.timestamp,
          }),
        });

        if (response.ok) {
          successfulSyncs.push(entry.id);
        }
      } catch (error) {
        console.error("Failed to sync entry:", entry, error);
      }
    }

    // Remove successfully synced entries
    const updatedQueue = offlineQueue.filter((entry) => !successfulSyncs.includes(entry.id));
    setOfflineQueue(updatedQueue);
    localStorage.setItem("offline_attendance_queue", JSON.stringify(updatedQueue));

    if (successfulSyncs.length > 0) {
      toast.success(`Synced ${successfulSyncs.length} offline entries`);
      fetchTodayRecord();
    }
  };

  // Mock NFC scan (for testing)
  const simulateNfcScan = async () => {
    setIsScanning(true);

    // Simulate NFC read delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate mock UID
    const mockUid = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join("");

    handleNfcScan(mockUid);
  };

  // Real NFC scan
  const startNfcScan = async () => {
    if (!nfcSupported) {
      toast.error("NFC is not supported on this device");
      return;
    }

    setIsScanning(true);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      toast.info("NFC reader activated - tap your card");

      ndef.addEventListener("reading", ({ serialNumber }: any) => {
        const tagUid = serialNumber.replace(/:/g, "").toUpperCase();
        handleNfcScan(tagUid);
        setIsScanning(false);
      });

      ndef.addEventListener("readingerror", () => {
        toast.error("Failed to read NFC tag");
        setIsScanning(false);
      });
    } catch (error: any) {
      console.error("NFC scan error:", error);
      toast.error(error.message || "Failed to start NFC scan");
      setIsScanning(false);
    }
  };

  // Handle NFC scan
  const handleNfcScan = async (tagUid: string) => {
    setLastScan(tagUid);
    const now = new Date().toISOString();
    const readerId = "MOBILE_APP";
    const location = "Mobile Check-in";

    // Determine if this is check-in or check-out
    const isCheckIn = !todayRecord || todayRecord.checkOut !== null;
    const endpoint = isCheckIn ? "/api/attendance/checkin" : "/api/attendance/checkout";
    const actionType: "checkin" | "checkout" = isCheckIn ? "checkin" : "checkout";

    if (!isOnline) {
      // Store offline
      const offlineEntry: OfflineEntry = {
        id: `${Date.now()}-${Math.random()}`,
        type: actionType,
        tagUid,
        timestamp: now,
        readerId,
        location,
      };

      const updatedQueue = [...offlineQueue, offlineEntry];
      setOfflineQueue(updatedQueue);
      localStorage.setItem("offline_attendance_queue", JSON.stringify(updatedQueue));

      toast.success(
        `${isCheckIn ? "Check-in" : "Check-out"} saved offline - will sync when online`
      );
      setIsScanning(false);
      return;
    }

    // Online - send immediately
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tagUid,
          readerId,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record attendance");
      }

      toast.success(
        isCheckIn
          ? `✅ Check-in successful at ${format(new Date(), "HH:mm")}`
          : `✅ Check-out successful at ${format(new Date(), "HH:mm")}`
      );

      fetchTodayRecord();
    } catch (error: any) {
      toast.error(error.message || "Failed to record attendance");
    } finally {
      setIsScanning(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const isCheckedIn = todayRecord && todayRecord.checkOut === null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-md mx-auto space-y-4 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">NFC Attendance</h1>
          <p className="text-muted-foreground">Mobile Check-in</p>
        </div>

        {/* Online Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Offline</span>
                  </>
                )}
              </div>
              {offlineQueue.length > 0 && (
                <Badge variant="secondary">{offlineQueue.length} pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {session.user.name || session.user.email}
            </CardTitle>
            <CardDescription>
              Role: <Badge variant="outline">{(session.user as any).role?.toUpperCase()}</Badge>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Today's Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayRecord ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Check-in</span>
                  </div>
                  <span className="font-medium">{format(new Date(todayRecord.checkIn), "HH:mm")}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Check-out</span>
                  </div>
                  <span className="font-medium">
                    {todayRecord.checkOut ? format(new Date(todayRecord.checkOut), "HH:mm") : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={isCheckedIn ? "default" : "secondary"}>
                    {isCheckedIn ? "Checked In" : "Checked Out"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No attendance record today
              </div>
            )}
          </CardContent>
        </Card>

        {/* NFC Support Warning */}
        {!nfcSupported && (
          <Card className="border-orange-500">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">NFC Not Supported</p>
                  <p className="text-xs text-muted-foreground">
                    Your device doesn't support Web NFC API. Use the simulation button for testing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan Button */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {nfcSupported ? (
              <Button
                size="lg"
                className="w-full h-24 text-lg"
                onClick={startNfcScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Scanning...
                  </>
                ) : isCheckedIn ? (
                  <>
                    <LogOut className="mr-2 h-6 w-6" />
                    Tap to Check Out
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-6 w-6" />
                    Tap to Check In
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="w-full h-24 text-lg"
                onClick={simulateNfcScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    <Scan className="mr-2 h-6 w-6" />
                    Simulate NFC Scan
                  </>
                )}
              </Button>
            )}

            {lastScan && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Last scanned</p>
                <p className="font-mono text-sm">{lastScan}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Ensure NFC is enabled on your device</p>
            <p>2. Tap the check-in/out button</p>
            <p>3. Hold your NFC card near your phone</p>
            <p>4. Wait for confirmation</p>
            <p className="text-xs pt-2">
              💡 Offline mode: Your attendance will be saved locally and synced when you're back
              online.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
