"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Save, Loader2 } from "lucide-react";
import { getSettings, saveSettings } from "@/lib/storage";
import { getCurrentLocation } from "@/lib/geolocation";
import { AppSettings } from "@/types/attendance";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      
      setSettings((prev) => ({
        ...prev!,
        officeLocation: {
          ...prev!.officeLocation,
          latitude,
          longitude,
        },
      }));
      
      toast.success("Current location captured!");
    } catch (error) {
      toast.error("Failed to get location. Please enable location services.");
      console.error(error);
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

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your office location</p>
        </div>

        {/* Office Location Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Office Location
            </CardTitle>
            <CardDescription>
              Set the office coordinates for automatic check-in
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
              />
              <p className="text-xs text-muted-foreground">
                Check-in will work within this radius from the office location
              </p>
            </div>

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
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Visit your office and use "Use Current Location" 
              to automatically set the correct coordinates.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
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
      </div>

      <BottomNav />
    </div>
  );
}
