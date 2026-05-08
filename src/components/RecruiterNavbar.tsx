import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Bookmark, Briefcase, PlusCircle,
  Sun, Moon, Menu, X, LogOut, Settings, Search,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Dashboard",   to: "/recruiter/dashboard",   icon: LayoutDashboard },
  { label: "Candidates",  to: "/recruiter/candidates",  icon: Users },
  { label: "Saved",       to: "/recruiter/saved",       icon: Bookmark },
  { label: "My Contracts",to: "/recruiter/contracts",   icon: Briefcase },
];

export default function RecruiterNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/recruiter/dashboard" className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Search className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>
            IT ContractHub{" "}
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 ml-0.5">Recruiter</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(to)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            asChild
          >
            <Link to="/recruiter/post-contract">
              <PlusCircle className="h-4 w-4 mr-1.5" /> Post Contract
            </Link>
          </Button>
          <Link
            to="/account"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          <button onClick={toggleTheme} className="p-2 text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button className="p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {navLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive(to)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Button
            size="sm"
            className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            asChild
          >
            <Link to="/recruiter/post-contract" onClick={() => setMobileOpen(false)}>
              <PlusCircle className="h-4 w-4 mr-1.5" /> Post Contract
            </Link>
          </Button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
