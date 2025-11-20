"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Save, Loader2, AlertCircle, User, Mail, Shield, LogOut, LayoutDashboard } from "lucide-react";
import { getSettings, saveSettings } from "@/lib/storage";
import { getCurrentLocation } from "@/lib/geolocation";
import { AppSettings } from "@/types/attendance";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending, refetch } = useSession();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    
    try {
      console.log('Requesting location...');
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      
      console.log('Location obtained:', { latitude, longitude, accuracy: position.coords.accuracy });
      
      setSettings((prev) => ({
        ...prev!,
        officeLocation: {
          ...prev!.officeLocation,
          latitude,
          longitude,
        },
      }));
      
      toast.success(`Location captured! (Accuracy: ${Math.round(position.coords.accuracy)}m)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get location. Please enable location services.";
      console.error('Location error:', error);
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSave = () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      saveSettings(settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error("Failed to sign out");
    } else {
      localStorage.removeItem("bearer_token");
      refetch();
      router.push("/login");
      toast.success("Signed out successfully");
    }
  };

  if (isPending || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{session.user.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {session.user.email}
                </p>
                <Badge variant={isAdmin ? "default" : "secondary"} className="mt-2">
                  <Shield className="h-3 w-3 mr-1" />
                  {isAdmin ? "Administrator" : "Employee"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Dashboard Link */}
        {isAdmin && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <Link href="/admin">
                <Button className="w-full" size="lg">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to Admin Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Location Error Alert */}
        {locationError && (
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-destructive">Location Error</p>
                  <p className="text-foreground">{locationError}</p>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    <p><strong>Troubleshooting:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Check browser address bar for location permission prompt</li>
                      <li>Enable location services in your device settings</li>
                      <li>Try opening browser settings and allowing location access</li>
                      <li>If using iOS/Safari: Settings → Privacy → Location Services → Safari</li>
                      <li>If using Chrome: Site settings → Permissions → Location</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Office Location Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Office Location
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Configure the office coordinates for employee check-ins"
                : "View the office location for automatic check-in"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={settings.officeLocation.latitude}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: {
                      ...settings.officeLocation,
                      latitude: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                placeholder="37.7749"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={settings.officeLocation.longitude}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: {
                      ...settings.officeLocation,
                      longitude: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                placeholder="-122.4194"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">Geofence Radius (meters)</Label>
              <Input
                id="radius"
                type="number"
                value={settings.officeLocation.radius}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officeLocation: {
                      ...settings.officeLocation,
                      radius: parseInt(e.target.value) || 0,
                    },
                  })
                }
                placeholder="100"
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Check-in will work within this radius from the office location
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        {isAdmin && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Visit your office and use "Use Current Location" 
                to automatically set the correct coordinates.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {isAdmin && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        )}

        {/* Sign Out Button */}
        <Button
          variant="destructive"
          className="w-full"
          size="lg"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}