import { User, CreditCard, Mail, Settings, ExternalLink, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AccountPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">My Account</h1>
          <p className="mt-2 text-muted-foreground">Manage your subscription and account settings.</p>
        </div>
      </section>

      <section className="container py-8 flex-1 max-w-3xl space-y-6">
        {/* Subscription card */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Subscription</h2>
              <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
            </div>
          </div>

          <div className="rounded-lg bg-accent/50 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-foreground">Pro Plan</span>
                  <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">£29.99/month · Renews 30 Apr 2026</p>
              </div>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="hero" size="sm">
              <CreditCard className="h-4 w-4 mr-1" /> Manage Billing
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
            <Button variant="outline" size="sm">
              Change Plan
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              Cancel Subscription
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Billing is handled securely via Stripe. Click "Manage Billing" to update your payment method or download invoices.
          </p>
        </div>

        {/* Profile */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">Your account details</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">user@example.com</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">John Smith</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="text-sm font-medium text-foreground">January 2026</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4">
            <Settings className="h-4 w-4 mr-1" /> Edit Profile
          </Button>
        </div>

        {/* Email Preferences */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Email Preferences</h2>
              <p className="text-sm text-muted-foreground">Control what emails you receive</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-foreground">Contract alert emails</span>
              <Badge variant="secondary" className="text-xs">3 active alerts</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-foreground">Weekly market digest</span>
              <Badge variant="outline" className="text-xs">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-foreground">Product updates</span>
              <Badge variant="outline" className="text-xs">Enabled</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <a href="/alerts">Manage Alerts</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AccountPage;
