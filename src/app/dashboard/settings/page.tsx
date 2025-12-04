"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Server, 
  Shield,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface EnvironmentConfig {
  name: string;
  apiBaseUrl: string;
  enrollmentApiUrl: string;
  attendanceCheckInUrl: string;
  attendanceReportApiUrl: string;
  employeeApiUrl: string;
}

const DEFAULT_CONFIGS: Record<string, EnvironmentConfig> = {
  local: {
    name: "Local",
    apiBaseUrl: "http://localhost:3000",
    enrollmentApiUrl: "/api/enrollments",
    attendanceCheckInUrl: "/api/attendance/checkin",
    attendanceReportApiUrl: "/api/attendance",
    employeeApiUrl: "/api/employees",
  },
  dev: {
    name: "Development",
    apiBaseUrl: "https://dev-attendance.example.com",
    enrollmentApiUrl: "/api/enrollments",
    attendanceCheckInUrl: "/api/attendance/checkin",
    attendanceReportApiUrl: "/api/attendance",
    employeeApiUrl: "/api/employees",
  },
  qa: {
    name: "QA",
    apiBaseUrl: "https://qa-attendance.example.com",
    enrollmentApiUrl: "/api/enrollments",
    attendanceCheckInUrl: "/api/attendance/checkin",
    attendanceReportApiUrl: "/api/attendance",
    employeeApiUrl: "/api/employees",
  },
  staging: {
    name: "Staging",
    apiBaseUrl: "https://staging-attendance.example.com",
    enrollmentApiUrl: "/api/enrollments",
    attendanceCheckInUrl: "/api/attendance/checkin",
    attendanceReportApiUrl: "/api/attendance",
    employeeApiUrl: "/api/employees",
  },
  production: {
    name: "Production",
    apiBaseUrl: "https://attendance.example.com",
    enrollmentApiUrl: "/api/enrollments",
    attendanceCheckInUrl: "/api/attendance/checkin",
    attendanceReportApiUrl: "/api/attendance",
    employeeApiUrl: "/api/employees",
  },
};

export default function SettingsPage() {
  const [activeEnv, setActiveEnv] = useState<string>("local");
  const [config, setConfig] = useState<EnvironmentConfig>(DEFAULT_CONFIGS.local);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  // Load saved config from localStorage on mount
  useEffect(() => {
    const savedEnv = localStorage.getItem("attendance_env") || "local";
    const savedConfig = localStorage.getItem(`attendance_config_${savedEnv}`);
    
    setActiveEnv(savedEnv);
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      setConfig(DEFAULT_CONFIGS[savedEnv]);
    }
  }, []);

  // Handle environment switch
  const handleEnvSwitch = (env: string) => {
    setActiveEnv(env);
    const savedConfig = localStorage.getItem(`attendance_config_${env}`);
    
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    } else {
      setConfig(DEFAULT_CONFIGS[env]);
    }
    
    setConnectionStatus("idle");
  };

  // Handle config update
  const handleConfigChange = (field: keyof EnvironmentConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save configuration
  const handleSave = () => {
    setSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem("attendance_env", activeEnv);
      localStorage.setItem(`attendance_config_${activeEnv}`, JSON.stringify(config));
      
      toast.success("Configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default configuration?")) {
      setConfig(DEFAULT_CONFIGS[activeEnv]);
      localStorage.removeItem(`attendance_config_${activeEnv}`);
      toast.success("Configuration reset to defaults");
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus("idle");

    try {
      const token = localStorage.getItem("bearer_token");
      const testUrl = config.apiBaseUrl + config.employeeApiUrl;
      
      const response = await fetch(testUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setConnectionStatus("success");
        toast.success("Connection test successful!");
      } else {
        setConnectionStatus("error");
        toast.error(`Connection test failed: ${response.status}`);
      }
    } catch (error) {
      setConnectionStatus("error");
      toast.error("Connection test failed: Unable to reach server");
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  // Export config as JSON
  const handleExportConfig = () => {
    const allConfigs: Record<string, EnvironmentConfig> = {};
    
    Object.keys(DEFAULT_CONFIGS).forEach((env) => {
      const savedConfig = localStorage.getItem(`attendance_config_${env}`);
      allConfigs[env] = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIGS[env];
    });

    const blob = new Blob([JSON.stringify(allConfigs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-config.json";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Configuration exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure environment settings and API endpoints
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportConfig}>
            <Save className="mr-2 h-4 w-4" />
            Export Config
          </Button>
        </div>
      </div>

      <Tabs defaultValue="environment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="environment">
            <Server className="mr-2 h-4 w-4" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Environment Configuration */}
        <TabsContent value="environment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment Selection</CardTitle>
              <CardDescription>
                Switch between different environment configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="env-select" className="w-32">Active Environment</Label>
                <Select value={activeEnv} onValueChange={handleEnvSwitch}>
                  <SelectTrigger id="env-select" className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="qa">QA</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="ml-2">
                  {config.name}
                </Badge>
              </div>

              {connectionStatus !== "idle" && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  connectionStatus === "success" 
                    ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                }`}>
                  {connectionStatus === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Connection successful</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Connection failed</span>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoints Configuration</CardTitle>
              <CardDescription>
                Configure API endpoints for the selected environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Base URL */}
              <div className="space-y-2">
                <Label htmlFor="api-base">API Base URL</Label>
                <Input
                  id="api-base"
                  value={config.apiBaseUrl}
                  onChange={(e) => handleConfigChange("apiBaseUrl", e.target.value)}
                  placeholder="https://api.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Base URL for all API requests
                </p>
              </div>

              {/* Employee API */}
              <div className="space-y-2">
                <Label htmlFor="employee-api">Employee API Endpoint</Label>
                <Input
                  id="employee-api"
                  value={config.employeeApiUrl}
                  onChange={(e) => handleConfigChange("employeeApiUrl", e.target.value)}
                  placeholder="/api/employees"
                />
              </div>

              {/* Enrollment API */}
              <div className="space-y-2">
                <Label htmlFor="enrollment-api">Enrollment API Endpoint</Label>
                <Input
                  id="enrollment-api"
                  value={config.enrollmentApiUrl}
                  onChange={(e) => handleConfigChange("enrollmentApiUrl", e.target.value)}
                  placeholder="/api/enrollments"
                />
              </div>

              {/* Attendance Check-in API */}
              <div className="space-y-2">
                <Label htmlFor="checkin-api">Attendance Check-in Endpoint</Label>
                <Input
                  id="checkin-api"
                  value={config.attendanceCheckInUrl}
                  onChange={(e) => handleConfigChange("attendanceCheckInUrl", e.target.value)}
                  placeholder="/api/attendance/checkin"
                />
              </div>

              {/* Attendance Report API */}
              <div className="space-y-2">
                <Label htmlFor="report-api">Attendance Report Endpoint</Label>
                <Input
                  id="report-api"
                  value={config.attendanceReportApiUrl}
                  onChange={(e) => handleConfigChange("attendanceReportApiUrl", e.target.value)}
                  placeholder="/api/attendance"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                Database connection and sync settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Database Type</Label>
                <Input value="Turso (SQLite)" disabled />
              </div>

              <div className="space-y-2">
                <Label>Connection Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Auto-sync Interval</Label>
                <Select defaultValue="30">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to refresh attendance data automatically
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Database is managed via Turso. Connection details are configured in environment variables.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Authentication and authorization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Authentication Method</Label>
                <Input value="Better Auth (JWT)" disabled />
              </div>

              <div className="space-y-2">
                <Label>Session Duration</Label>
                <Select defaultValue="7">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role-Based Access Control (RBAC)</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default">ADMIN</Badge>
                  <Badge variant="secondary">HR</Badge>
                  <Badge variant="outline">READER</Badge>
                  <Badge variant="outline">EMPLOYEE</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Active roles in the system. Manage permissions in the code configuration.
                </p>
              </div>

              <div className="space-y-2">
                <Label>API Authentication</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Bearer Token (JWT)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  All API requests require valid JWT bearer token in Authorization header
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Security settings are managed through Better Auth. Configure additional options in src/lib/auth.ts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
