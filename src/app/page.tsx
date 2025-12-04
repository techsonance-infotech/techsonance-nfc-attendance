"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogIn, Clock, Users, FileText } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <h1 className="text-3xl font-bold">NFC Attendance System</h1>
          {!isPending && (
            <div className="flex gap-2">
              {session?.user ? (
                <>
                  {(session.user as any).role === "admin" && (
                    <Button onClick={() => router.push("/dashboard")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={() => router.push("/login")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Admin Login
                    </Button>
              )}
            </div>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <h2 className="text-4xl font-bold tracking-tight">
            Enterprise NFC Attendance Management
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline employee attendance tracking with NFC technology. 
            Secure, fast, and reliable attendance management for your organization.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                Instant check-in/check-out with NFC tags. Monitor attendance in real-time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>
                Manage employees, departments, and NFC tag enrollments from one dashboard.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Detailed Reports</CardTitle>
              <CardDescription>
                Generate attendance reports, export data, and analyze patterns.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">System</span>
                <span className="text-green-600 font-semibold">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-semibold">
                  {session?.user ? session.user.email : "Not logged in"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-semibold">
                  {session?.user ? (session.user as any).role?.toUpperCase() : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}