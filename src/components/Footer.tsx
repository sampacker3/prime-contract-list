import { Link } from "react-router-dom";
import { Search } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-muted/30">
    <div className="container py-12">
      <div className="grid md:grid-cols-4 gap-8">
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
          <h4 className="font-heading font-semibold text-foreground mb-3">Company</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <Link to="/about" className="block hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="block hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-semibold text-foreground mb-3">Legal</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <span className="block">Privacy Policy</span>
            <Link to="/terms" className="block hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} IT ContractHub. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
