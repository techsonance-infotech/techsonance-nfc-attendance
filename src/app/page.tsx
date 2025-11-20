"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Clock, LogOut, Loader2, CheckCircle, XCircle } from "lucide-react";
import { getCurrentLocation, isWithinOfficeLocation } from "@/lib/geolocation";
import { getTodayAttendance, saveAttendanceRecord, getSettings, markMissingTimeoutsAsLeave } from "@/lib/storage";
import { AttendanceRecord } from "@/types/attendance";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Mark previous days without timeout as leave
    markMissingTimeoutsAsLeave();
    
    // Load today's attendance
    const record = getTodayAttendance();
    setTodayRecord(record);

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
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
      const record: AttendanceRecord = {
        id: now.toISOString(),
        date: now.toISOString().split('T')[0],
        timeIn: now.toISOString(),
        timeOut: null,
        location: { latitude, longitude },
        status: 'present',
      };

      saveAttendanceRecord(record);
      setTodayRecord(record);
      toast.success("Successfully checked in!");
    } catch (error: any) {
      // Improved error handling with specific messages
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

  const handleCheckOut = () => {
    setShowTimeoutDialog(true);
  };

  const confirmCheckOut = () => {
    if (!todayRecord) return;

    const now = new Date();
    const timeIn = new Date(todayRecord.timeIn);
    const duration = Math.floor((now.getTime() - timeIn.getTime()) / 1000 / 60); // in minutes

    const updatedRecord: AttendanceRecord = {
      ...todayRecord,
      timeOut: now.toISOString(),
      duration,
    };

    saveAttendanceRecord(updatedRecord);
    setTodayRecord(updatedRecord);
    setShowTimeoutDialog(false);
    toast.success("Successfully checked out!");
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
          <h1 className="text-2xl font-bold">Attendance Tracker</h1>
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

        {/* Status Card */}
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
                <Button
                  onClick={handleCheckIn}
                  disabled={isChecking}
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
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Check In
                    </>
                  )}
                </Button>
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

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Check in automatically when you arrive at the office location</p>
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