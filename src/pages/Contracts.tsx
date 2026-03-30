import { useState } from "react";
import { Search, MapPin, Clock, PoundSterling, Filter, ChevronDown, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Mock contract data
const mockContracts = [
  { id: 1, title: "Azure Cloud Engineer", company: "Barclays", location: "London", rate: "£650/day", duration: "6 months", posted: "2 hours ago", tags: ["Azure", "DevOps", "Terraform"], remote: "Hybrid" },
  { id: 2, title: "Senior Data Engineer", company: "HSBC", location: "Birmingham", rate: "£600/day", duration: "12 months", posted: "4 hours ago", tags: ["Python", "Spark", "Databricks"], remote: "Remote" },
  { id: 3, title: "Python Developer", company: "Sky", location: "Leeds", rate: "£550/day", duration: "3 months", posted: "5 hours ago", tags: ["Python", "Django", "AWS"], remote: "On-site" },
  { id: 4, title: "Microsoft Fabric Consultant", company: "Deloitte", location: "London", rate: "£700/day", duration: "6 months", posted: "6 hours ago", tags: ["Fabric", "Power BI", "Azure"], remote: "Hybrid" },
  { id: 5, title: "IT Infrastructure Manager", company: "NHS Digital", location: "Manchester", rate: "£500/day", duration: "9 months", posted: "8 hours ago", tags: ["Networking", "Security", "ITIL"], remote: "On-site" },
  { id: 6, title: "DevOps Engineer", company: "Vodafone", location: "London", rate: "£620/day", duration: "6 months", posted: "10 hours ago", tags: ["Kubernetes", "CI/CD", "AWS"], remote: "Remote" },
  { id: 7, title: "Data Analyst - Power BI", company: "BT", location: "Bristol", rate: "£450/day", duration: "3 months", posted: "12 hours ago", tags: ["Power BI", "SQL", "DAX"], remote: "Hybrid" },
  { id: 8, title: "Full Stack Developer", company: "Capita", location: "Glasgow", rate: "£530/day", duration: "6 months", posted: "1 day ago", tags: ["React", "Node.js", "TypeScript"], remote: "Remote" },
];

const ContractsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const filtered = mockContracts.filter((c) => {
    const matchesSearch = !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !locationFilter || c.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Search header */}
      <section className="border-b bg-surface-subtle">
        <div className="container py-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-6">Browse Contracts</h1>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, skill or technology..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative md:w-64">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location..."
                className="pl-10"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            <Button variant="hero">
              <Search className="h-4 w-4 mr-1" /> Search
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> contracts
          </p>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Filter className="h-4 w-4 mr-1" /> More Filters <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          {filtered.map((contract) => (
            <div
              key={contract.id}
              className="group rounded-xl border bg-card p-5 transition-all hover:shadow-brand hover:border-primary/20 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-foreground truncate">{contract.title}</h3>
                    <Badge variant="secondary" className="text-xs shrink-0">{contract.remote}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{contract.company}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contract.location}</span>
                    <span className="flex items-center gap-1"><PoundSterling className="h-3 w-3" />{contract.rate}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{contract.duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {contract.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs bg-accent text-accent-foreground border-primary/10">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{contract.posted}</span>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-heading font-semibold text-foreground">No contracts found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default ContractsPage;
