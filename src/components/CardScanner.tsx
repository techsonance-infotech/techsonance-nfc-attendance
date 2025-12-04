"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, QrCode, Keyboard, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { isValidNFCUID, formatNFCSerial, cleanNFCUID } from "@/lib/nfc";

interface CardScannerProps {
  onCardDetected: (cardId: string) => void;
  onCancel: () => void;
  employeeName?: string;
}

export default function CardScanner({ onCardDetected, onCancel, employeeName }: CardScannerProps) {
  const [activeTab, setActiveTab] = useState<"nfc" | "qr" | "manual">("nfc");
  const [isScanning, setIsScanning] = useState(false);
  const [manualCardId, setManualCardId] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for Web NFC API support
  const isNFCSupported = typeof window !== "undefined" && "NDEFReader" in window;

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // NFC Scanning using Web NFC API
  const handleNFCScan = async () => {
    if (!isNFCSupported) {
      toast.error("NFC is not supported on this device. Please use QR code or manual entry.");
      return;
    }

    try {
      setIsScanning(true);
      setScanStatus("scanning");
      setErrorMessage("");

      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      await ndef.scan();

      toast.success("NFC scanner is ready. Please tap your card...");

      ndef.addEventListener("reading", ({ serialNumber }: any) => {
        const cleanedUID = cleanNFCUID(serialNumber);
        setScanStatus("success");
        toast.success(`Card detected: ${formatNFCSerial(cleanedUID)}`);
        
        setTimeout(() => {
          onCardDetected(cleanedUID);
        }, 500);
      });

      ndef.addEventListener("readingerror", () => {
        setScanStatus("error");
        setErrorMessage("Failed to read NFC card. Please try again.");
        setIsScanning(false);
      });

    } catch (error: any) {
      console.error("NFC scan error:", error);
      setScanStatus("error");
      
      if (error.name === "NotAllowedError") {
        setErrorMessage("NFC permission denied. Please enable NFC in your device settings.");
      } else if (error.name === "NotSupportedError") {
        setErrorMessage("NFC is not supported on this device.");
      } else {
        setErrorMessage("Failed to start NFC scanner. Please try again.");
      }
      
      setIsScanning(false);
    }
  };

  const stopNFCScan = () => {
    setIsScanning(false);
    setScanStatus("idle");
    setErrorMessage("");
  };

  // QR Code Scanning using device camera
  const handleQRScan = async () => {
    try {
      setIsScanning(true);
      setScanStatus("scanning");
      setErrorMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Note: For production, integrate a QR code scanning library like jsQR or html5-qrcode
      toast.info("QR scanning view opened. Point camera at QR code.");

    } catch (error: any) {
      console.error("Camera access error:", error);
      setScanStatus("error");
      setErrorMessage("Failed to access camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopQRScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setScanStatus("idle");
    setErrorMessage("");
  };

  // Manual Card ID Entry
  const handleManualSubmit = () => {
    if (!manualCardId.trim()) {
      toast.error("Please enter a card ID");
      return;
    }

    if (!isValidNFCUID(manualCardId)) {
      toast.error("Invalid card ID format. Expected hex format (e.g., 04A332BC984A)");
      return;
    }

    const cleanedUID = cleanNFCUID(manualCardId);
    setScanStatus("success");
    toast.success(`Card ID entered: ${formatNFCSerial(cleanedUID)}`);
    
    setTimeout(() => {
      onCardDetected(cleanedUID);
    }, 300);
  };

  return (
    <div className="space-y-4">
      {employeeName && (
        <Alert>
          <AlertDescription>
            <strong>Assigning card to:</strong> {employeeName}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nfc" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">NFC</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR Code</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Manual</span>
          </TabsTrigger>
        </TabsList>

        {/* NFC Tab */}
        <TabsContent value="nfc" className="space-y-4">
          <div className="text-center space-y-4 py-6">
            {!isNFCSupported && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Web NFC is not supported on this device. Please use Chrome on Android or try QR code/manual entry.
                </AlertDescription>
              </Alert>
            )}

            {scanStatus === "idle" && (
              <>
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Tap a card to scan using NFC
                </p>
              </>
            )}

            {scanStatus === "scanning" && (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
                <p className="text-primary font-medium">
                  Ready to scan. Tap your NFC card...
                </p>
              </>
            )}

            {scanStatus === "success" && (
              <>
                <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                <p className="text-green-600 font-medium">
                  Card detected successfully!
                </p>
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

            <div className="flex gap-2 justify-center">
              {!isScanning ? (
                <Button onClick={handleNFCScan} disabled={!isNFCSupported}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Start NFC Scan
                </Button>
              ) : (
                <Button onClick={stopNFCScan} variant="outline">
                  Stop Scanning
                </Button>
              )}
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr" className="space-y-4">
          <div className="space-y-4">
            <div className="text-center py-4">
              {!isScanning ? (
                <>
                  <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Scan a QR code containing the card ID
                  </p>
                </>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full max-w-md mx-auto rounded-lg border"
                    playsInline
                  />
                  <p className="text-primary font-medium mt-4">
                    Point camera at QR code...
                  </p>
                </>
              )}

              <div className="flex gap-2 justify-center mt-4">
                {!isScanning ? (
                  <Button onClick={handleQRScan}>
                    <QrCode className="mr-2 h-4 w-4" />
                    Start QR Scan
                  </Button>
                ) : (
                  <Button onClick={stopQRScan} variant="outline">
                    Stop Camera
                  </Button>
                )}
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Note:</strong> QR code scanning requires camera permissions. The QR code should contain the NFC card UID in hex format.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardId">Card ID (Hex Format)</Label>
              <Input
                id="cardId"
                placeholder="04A332BC984A or 04:A3:32:BC:98:4A"
                value={manualCardId}
                onChange={(e) => setManualCardId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the card UID in hexadecimal format
              </p>
            </div>

            {manualCardId && isValidNFCUID(manualCardId) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Valid format: <strong>{formatNFCSerial(cleanNFCUID(manualCardId))}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleManualSubmit} className="flex-1">
                <Keyboard className="mr-2 h-4 w-4" />
                Assign Card
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Tip:</strong> You can enter the card ID with or without separators (colons, spaces, or dashes).
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
