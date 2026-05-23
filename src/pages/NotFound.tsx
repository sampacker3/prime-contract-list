import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-6">
            <FileQuestion className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-5xl text-foreground mb-3">404</h1>
          <p className="text-xl font-heading font-semibold text-foreground mb-2">Page not found</p>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="hero" asChild>
              <Link to="/contracts">Browse Contracts</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Home</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
