"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Smartphone,
  LogIn,
  LogOut,
  Clock,
  User
} from "lucide-react";
import { toast } from "sonner";
import { isValidNFCUID, formatNFCSerial, cleanNFCUID } from "@/lib/nfc";

interface AttendanceToggleProps {
  readerId?: string;
  location?: string;
  onSuccess?: (data: any) => void;
}

export default function NFCAttendanceToggle({ 
  readerId = "MAIN_READER", 
  location = "Main Entrance",
  onSuccess 
}: AttendanceToggleProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastAction, setLastAction] = useState<"checkin" | "checkout" | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const ndefReaderRef = useRef<any>(null);

  const isNFCSupported = typeof window !== "undefined" && "NDEFReader" in window;

  useEffect(() => {
    return () => {
      if (ndefReaderRef.current) {
        ndefReaderRef.current = null;
      }
    };
  }, []);

  const handleNFCScan = async () => {
    if (!isNFCSupported) {
      toast.error("NFC is not supported on this device/browser");
      return;
    }

    try {
      setIsScanning(true);
      setScanStatus("scanning");
      setErrorMessage("");
      setLastAction(null);
      setEmployeeData(null);

      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      ndefReaderRef.current = ndef;
      
      await ndef.scan();
      
      toast.success("NFC reader ready. Tap card to Time In/Out...");

      ndef.addEventListener("reading", async ({ serialNumber }: any) => {
        const cleanedUID = cleanNFCUID(serialNumber);
        
        // Call the toggle API
        try {
          const token = localStorage.getItem("bearer_token");
          const response = await fetch("/api/attendance/toggle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              tagUid: cleanedUID,
              readerId,
              location,
              idempotencyKey: `${cleanedUID}-${Date.now()}`,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to process attendance");
          }

          setScanStatus("success");
          setLastAction(data.action);
          setEmployeeData(data.employee);

          if (data.action === "checkin") {
            toast.success(`✅ Time In: ${data.employee.name}`, {
              description: data.message,
            });
          } else {
            toast.success(`✅ Time Out: ${data.employee.name}`, {
              description: data.message,
            });
          }

          if (onSuccess) {
            onSuccess(data);
          }

          // Reset after 3 seconds
          setTimeout(() => {
            setScanStatus("scanning");
            setLastAction(null);
            setEmployeeData(null);
          }, 3000);

        } catch (error: any) {
          console.error("Attendance toggle error:", error);
          setScanStatus("error");
          setErrorMessage(error.message || "Failed to process attendance");
          toast.error(error.message || "Failed to process attendance");
          
          setTimeout(() => {
            setScanStatus("scanning");
            setErrorMessage("");
          }, 2000);
        }
      });

      ndef.addEventListener("readingerror", () => {
        setScanStatus("error");
        setErrorMessage("Failed to read NFC card. Please try again.");
        
        setTimeout(() => {
          setScanStatus("scanning");
          setErrorMessage("");
        }, 2000);
      });

    } catch (error: any) {
      console.error("NFC scan error:", error);
      setScanStatus("error");
      
      if (error.name === "NotAllowedError") {
        setErrorMessage("NFC permission denied. Please enable NFC in your browser settings.");
      } else if (error.name === "NotSupportedError") {
        setErrorMessage("NFC is not supported on this device or browser.");
      } else {
        setErrorMessage("Failed to start NFC scanner. Please try again.");
      }
      
      setIsScanning(false);
      toast.error(errorMessage || "Failed to start NFC scanner");
    }
  };

  const stopNFCScan = () => {
    setIsScanning(false);
    setScanStatus("idle");
    setErrorMessage("");
    setLastAction(null);
    setEmployeeData(null);
    ndefReaderRef.current = null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          NFC Attendance
        </CardTitle>
        <CardDescription>
          Single tap for Time In/Time Out - Reader: {readerId} ({location})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNFCSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Web NFC is not supported. Please use Chrome on Android (version 89+).
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-4 py-6">
          {scanStatus === "idle" && (
            <>
              <CreditCard className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Ready to scan. Tap a card to check in or check out.
              </p>
            </>
          )}

          {scanStatus === "scanning" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
              <p className="text-primary font-medium">
                Waiting for NFC card...
              </p>
              <p className="text-xs text-muted-foreground">
                Hold the card near the back of your device
              </p>
            </>
          )}

          {scanStatus === "success" && employeeData && (
            <>
              <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
              <div className="space-y-2">
                <p className="text-green-600 font-medium text-lg">
                  {lastAction === "checkin" ? "Time In Successful!" : "Time Out Successful!"}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{employeeData.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {employeeData.email} • {employeeData.department}
                </div>
                <Badge variant={lastAction === "checkin" ? "default" : "secondary"} className="mt-2">
                  {lastAction === "checkin" ? (
                    <>
                      <LogIn className="mr-1 h-3 w-3" />
                      Time In
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-1 h-3 w-3" />
                      Time Out
                    </>
                  )}
                </Badge>
              </div>
            </>
          )}

          {scanStatus === "error" && (
            <>
              <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
              <p className="text-destructive font-medium">
                {errorMessage}
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isScanning ? (
            <Button 
              onClick={handleNFCScan} 
              disabled={!isNFCSupported}
              className="min-w-[200px]"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Start NFC Scanner
            </Button>
          ) : (
            <Button 
              onClick={stopNFCScan} 
              variant="outline"
              className="min-w-[200px]"
            >
              Stop Scanner
            </Button>
          )}
        </div>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> When an employee taps their card:
            <ul className="list-disc list-inside mt-1 text-sm space-y-1">
              <li>Not checked in today? → Records <strong>Time In</strong></li>
              <li>Already checked in? → Records <strong>Time Out</strong></li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
