"use client";

import { useRequireAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { UserProfile } from "@/components/user/user-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Shield, CreditCard, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // useRequireAuth will redirect
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto space-y-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left font-normal"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left font-normal"
                  disabled
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Soon
                  </Badge>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left font-normal"
                  disabled
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Privacy
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Soon
                  </Badge>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left font-normal"
                  disabled
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Soon
                  </Badge>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <UserProfile />
          </div>
        </div>
      </main>
    </div>
  );
}
