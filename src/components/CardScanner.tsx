import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Camera, Keyboard, Loader2, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { getDeviceType, isNFCSupported, isCameraAvailable, startNFCReader, stopNFCReader, formatNFCSerial } from "@/lib/nfc";
import { toast } from "sonner";

interface CardScannerProps {
  onCardDetected: (cardId: string) => void;
  onCancel: () => void;
  employeeName?: string;
}

export default function CardScanner({ onCardDetected, onCancel, employeeName }: CardScannerProps) {
  const [scanMethod, setScanMethod] = useState<"nfc" | "qr" | "manual">("nfc");
  const [isScanning, setIsScanning] = useState(false);
  const [manualCardId, setManualCardId] = useState("");
  const [nfcController, setNfcController] = useState<AbortController | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const deviceType = getDeviceType();
  const hasNFC = isNFCSupported();
  const hasCamera = isCameraAvailable();

  // Auto-select best method based on device
  useEffect(() => {
    if (deviceType === "android" && hasNFC) {
      setScanMethod("nfc");
    } else if (hasCamera) {
      setScanMethod("qr");
    } else {
      setScanMethod("manual");
    }
  }, [deviceType, hasNFC, hasCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        stopAllScanning();
      }
    };
  }, []);

  const stopAllScanning = () => {
    // Stop NFC
    if (nfcController) {
      stopNFCReader(nfcController);
      setNfcController(null);
    }

    // Stop QR scanner
    if (qrScannerRef.current) {
      qrScannerRef.current.stop().catch((err) => console.error("Error stopping QR scanner:", err));
      qrScannerRef.current.clear();
      qrScannerRef.current = null;
    }

    setIsScanning(false);
  };

  const startNFCScanning = async () => {
    if (!hasNFC) {
      toast.error("NFC is not supported on this device");
      return;
    }

    setIsScanning(true);
    toast.info("Please tap your NFC card...");

    const controller = await startNFCReader(
      async (result) => {
        console.log("NFC card read:", result);
        const cardId = result.serialNumber;
        toast.success(`Card detected: ${formatNFCSerial(cardId)}`);
        stopAllScanning();
        onCardDetected(cardId);
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

  const startQRScanning = async () => {
    if (!hasCamera) {
      toast.error("Camera is not available on this device");
      return;
    }

    setIsScanning(true);
    toast.info("Camera opening... Point at QR code on card");

    try {
      const qrScanner = new Html5Qrcode("qr-reader");
      qrScannerRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("QR Code detected:", decodedText);
          toast.success(`Card detected: ${formatNFCSerial(decodedText)}`);
          stopAllScanning();
          onCardDetected(decodedText);
        },
        (errorMessage) => {
          // Silent - scanning errors are normal
        }
      );
    } catch (error: any) {
      console.error("QR scanner error:", error);
      toast.error("Failed to start camera. Please check permissions.");
      setIsScanning(false);
      qrScannerRef.current = null;
    }
  };

  const handleManualSubmit = () => {
    if (!manualCardId.trim()) {
      toast.error("Please enter a card ID");
      return;
    }

    toast.success(`Card ID entered: ${formatNFCSerial(manualCardId)}`);
    onCardDetected(manualCardId.trim());
  };

  const handleScanMethodChange = (method: string) => {
    stopAllScanning();
    setScanMethod(method as "nfc" | "qr" | "manual");
  };

  const handleStartScanning = () => {
    if (scanMethod === "nfc") {
      startNFCScanning();
    } else if (scanMethod === "qr") {
      startQRScanning();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Scan Card for {employeeName}</h3>
        <p className="text-sm text-muted-foreground">
          {deviceType === "android" && hasNFC
            ? "NFC available - tap your card"
            : deviceType === "ios"
            ? "Use camera to scan QR code on card"
            : "Select scanning method below"}
        </p>
      </div>

      <Tabs value={scanMethod} onValueChange={handleScanMethodChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nfc" disabled={!hasNFC}>
            <CreditCard className="h-4 w-4 mr-2" />
            NFC
          </TabsTrigger>
          <TabsTrigger value="qr" disabled={!hasCamera}>
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Keyboard className="h-4 w-4 mr-2" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nfc" className="space-y-4">
          <div className="py-8 text-center space-y-4">
            {!hasNFC ? (
              <div className="text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">NFC Not Available</p>
                <p className="text-sm mt-2">
                  NFC is only supported on Android devices with Chrome browser.
                </p>
                <p className="text-sm mt-2">Try using Camera or Manual entry instead.</p>
              </div>
            ) : isScanning ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">Scanning for NFC card...</p>
                <p className="text-sm text-muted-foreground">Hold your card near the device</p>
              </>
            ) : (
              <>
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan NFC card</p>
                <p className="text-sm text-muted-foreground">Tap Start Scanning and hold card near device</p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <div className="space-y-4">
            {!hasCamera ? (
              <div className="py-8 text-center text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">Camera Not Available</p>
                <p className="text-sm mt-2">Please try Manual entry instead.</p>
              </div>
            ) : isScanning ? (
              <div className="space-y-4">
                <div
                  id="qr-reader"
                  ref={qrContainerRef}
                  className="w-full rounded-lg overflow-hidden bg-black"
                  style={{ minHeight: "300px" }}
                />
                <p className="text-center text-sm text-muted-foreground">
                  Point camera at QR code on the card
                </p>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Ready to scan QR code</p>
                <p className="text-sm text-muted-foreground">
                  Camera will open when you start scanning
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-card-id">Card ID / Serial Number</Label>
              <Input
                id="manual-card-id"
                placeholder="Enter card ID (e.g., A1B2C3D4)"
                value={manualCardId}
                onChange={(e) => setManualCardId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter the card ID printed on the NFC card
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>

        {scanMethod === "manual" ? (
          <Button onClick={handleManualSubmit} className="flex-1">
            <Keyboard className="mr-2 h-4 w-4" />
            Submit Card ID
          </Button>
        ) : isScanning ? (
          <Button variant="destructive" onClick={stopAllScanning} className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Stop Scanning
          </Button>
        ) : (
          <Button
            onClick={handleStartScanning}
            disabled={
              (scanMethod === "nfc" && !hasNFC) ||
              (scanMethod === "qr" && !hasCamera)
            }
            className="flex-1"
          >
            {scanMethod === "nfc" ? (
              <CreditCard className="mr-2 h-4 w-4" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Start Scanning
          </Button>
        )}
      </div>
    </div>
  );
}
