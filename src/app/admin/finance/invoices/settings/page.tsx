"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Save, ArrowLeft, Building2, Upload } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";
import { toast } from "sonner";

interface InvoiceSettings {
  id: number;
  businessName: string;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  logoUrl: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");

  const [formData, setFormData] = useState({
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    logoUrl: "",
    termsAndConditions: "",
    notes: "",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }

    if (!isPending && (session?.user as any)?.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/");
      return;
    }

    if (session?.user) {
      loadSettings();
    }
  }, [session, isPending, router]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/invoice-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data === null) {
          // No settings exist yet
          setSettings(null);
        } else {
          setSettings(data);
          setFormData({
            businessName: data.businessName || "",
            businessAddress: data.businessAddress || "",
            businessPhone: data.businessPhone || "",
            businessEmail: data.businessEmail || "",
            logoUrl: data.logoUrl || "",
            termsAndConditions: data.termsAndConditions || "",
            notes: data.notes || "",
          });
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUrlChange = (url: string) => {
    setFormData({ ...formData, logoUrl: url });
    setLogoPreview(url);
  };

  const handleLogoDialogSubmit = () => {
    if (logoUrlInput.trim()) {
      handleLogoUrlChange(logoUrlInput);
      setIsLogoDialogOpen(false);
      setLogoUrlInput("");
    }
  };

  const handleSave = async () => {
    if (!formData.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const isUpdate = settings !== null;
      
      const response = await fetch(
        isUpdate ? `/api/invoice-settings?id=${settings.id}` : "/api/invoice-settings",
        {
          method: isUpdate ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      const savedSettings = await response.json();
      setSettings(savedSettings);
      toast.success(isUpdate ? "Settings updated successfully" : "Settings created successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session?.user || (session?.user as any)?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/finance/invoices")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>

        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Invoice Settings
          </h2>
          <p className="text-muted-foreground">
            Configure your business information that will appear on invoice PDFs
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              This information will be displayed on all generated invoice PDFs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter your business name"
              />
            </div>

            {/* Business Email */}
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                placeholder="contact@yourbusiness.com"
              />
            </div>

            {/* Business Phone */}
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                value={formData.businessPhone}
                onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            {/* Business Address */}
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                placeholder="Enter your complete business address"
                rows={3}
              />
            </div>

            {/* Logo URL - FIXED */}
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => handleLogoUrlChange(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Logo URL</DialogTitle>
                      <DialogDescription>
                        Enter the URL of your business logo image
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoUrlDialog">Logo URL</Label>
                        <Input
                          id="logoUrlDialog"
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleLogoDialogSubmit();
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste a direct link to your logo image (PNG, JPG, SVG)
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsLogoDialogOpen(false);
                            setLogoUrlInput("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleLogoDialogSubmit}>
                          Add Logo
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {logoPreview && (
                <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Logo Preview:</p>
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-w-xs max-h-24 object-contain"
                    onError={() => {
                      toast.error("Failed to load logo image");
                      setLogoPreview(null);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
              <Textarea
                id="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                placeholder="Enter payment terms, conditions, and policies that will appear on invoices"
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Example: "Payment due within 30 days. Late payments may incur additional charges."
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Default Invoice Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter default notes that will appear at the bottom of invoices"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Example: "Thank you for your business!"
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/finance/invoices")}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                {settings ? "Update Settings" : "Create Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Settings Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {new Date(settings.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(settings.updatedAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}