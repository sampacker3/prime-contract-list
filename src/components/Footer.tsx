import { Link } from "react-router-dom";
import { Search, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Footer = () => {
  const { isRecruiter } = useAuth();
  return (
  <footer className="border-t bg-muted/30">
    <div className="container py-12">
      <div className="grid md:grid-cols-5 gap-8">
        <div>
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-brand">
              <Search className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            IT ContractHub
          </Link>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Aggregating IT contracts from hundreds of sources in real-time.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Product</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/contracts" className="block hover:text-foreground transition-colors">Browse Contracts</Link>
            <Link to="/alerts" className="block hover:text-foreground transition-colors">Email Alerts</Link>
            <Link to="/account" className="block hover:text-foreground transition-colors">My Account</Link>
            <Link to="/contract-sources" className="block hover:text-foreground transition-colors">What contracts we pull</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Tools</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/day-rates" className="block hover:text-foreground transition-colors">Day Rates by Skill</Link>
            <Link to="/ir35-calculator" className="block hover:text-foreground transition-colors">IR35 Calculator</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Company</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/about" className="block hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="block hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Legal</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/privacy" className="block hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="block hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
      {/* Recruiter CTA */}
      <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} IT ContractHub. All rights reserved.
        </p>
        <Link
          to={isRecruiter ? "/recruiter/dashboard" : "/recruiter/signup"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-3 py-1.5 hover:border-foreground/30"
        >
          <Briefcase className="h-3 w-3" />
          {isRecruiter ? "Go to Recruiter Dashboard" : "Are you a recruiter?"}
        </Link>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
