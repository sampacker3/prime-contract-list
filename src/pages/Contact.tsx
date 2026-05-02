import { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const topics = [
  "General question",
  "Bug report",
  "Feature request",
  "Suggest a search term",
  "Pro / billing",
  "Other",
];

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(false);
    try {
      await fetch("https://sampacker.app.n8n.cloud/webhook/contact-form", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name, email, topic, message }),
      });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Contact IT ContractHub"
        description="Get in touch with the IT ContractHub team — bug reports, feature requests, or just to say hello."
        canonical="/contact"
      />
      <Navbar />

      <section className="relative flex-1 overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="container relative py-16 md:py-24 max-w-5xl">
          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to About
          </Link>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: info */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Get in touch</p>
              <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground mb-5 leading-tight">
                We'd love to hear from you
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Need anything? Feel free to drop us a message.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-sm">Email us directly</p>
                    <a
                      href="mailto:hello@contracthub.co.uk"
                      className="text-sm text-primary hover:underline"
                    >
                      hello@contracthub.co.uk
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-foreground text-sm">Response time</p>
                    <p className="text-sm text-muted-foreground">We typically reply within 24 hours on weekdays.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                  <h2 className="font-heading font-bold text-xl text-foreground">Message sent!</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Thanks for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); setTopic(topics[0]); }}>
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Your name</label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Topic</label>
                    <select
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    >
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
                    <textarea
                      rows={5}
                      placeholder="Tell us what's on your mind..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-destructive">Something went wrong — please try again or email us directly.</p>
                  )}

                  <Button type="submit" variant="hero" className="w-full" disabled={sending}>
                    {sending ? "Sending…" : <><Send className="mr-2 h-4 w-4" /> Send message</>}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
