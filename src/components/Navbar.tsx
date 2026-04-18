import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

const publicLinks = [
  { label: "Browse Contracts", to: "/contracts" },
];

const protectedLinks = [
  { label: "Saved", to: "/saved" },
  { label: "Email Alerts", to: "/alerts" },
  { label: "My Account", to: "/account" },
];

const allLinks = [...publicLinks, ...protectedLinks];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleProtectedClick = (to: string) => {
    setMobileOpen(false);
    if (user) {
      navigate(to);
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            ContractHub
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Public links */}
            {publicLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Protected links */}
            {protectedLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => handleProtectedClick(link.to)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/contracts">
                <Search className="h-4 w-4 mr-1" /> Search Contracts
              </Link>
            </Button>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              className="p-2 text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
            {allLinks.map((link) => {
              const isProtected = protectedLinks.some((l) => l.to === link.to);
              if (isProtected) {
                return (
                  <button
                    key={link.to}
                    onClick={() => handleProtectedClick(link.to)}
                    className={`w-full text-left block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </button>
                );
              }
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Button variant="hero" size="sm" className="w-full mt-2" asChild>
              <Link to="/contracts" onClick={() => setMobileOpen(false)}>
                <Search className="h-4 w-4 mr-1" /> Search Contracts
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default Navbar;
