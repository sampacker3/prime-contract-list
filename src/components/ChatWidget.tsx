import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface Contract {
  id: number;
  JobTitle: string | null;
  Company: string | null;
  Location: string | null;
  PayRate: string | null;
  IR35Status: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  contracts?: Contract[];
}

const SUGGESTED_PROMPTS = [
  "Find Python contracts in London",
  "Show Outside IR35 roles",
  "Latest remote DevOps contracts",
];

function ContractCard({ contract }: { contract: Contract }) {
  const isOutside =
    contract.IR35Status?.toLowerCase().includes("outside") ?? false;

  return (
    <Link
      to={`/contract/${contract.id}`}
      className="block border rounded-lg p-3 mt-2 hover:bg-accent transition-colors no-underline"
    >
      <p className="font-semibold text-sm text-foreground leading-tight">
        {contract.JobTitle ?? "Untitled Role"}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {[contract.Company, contract.Location].filter(Boolean).join(" · ")}
      </p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {contract.PayRate && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {contract.PayRate}
          </Badge>
        )}
        {contract.IR35Status && (
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 ${
              isOutside
                ? "border-green-500 text-green-600 dark:text-green-400"
                : "border-amber-500 text-amber-600 dark:text-amber-400"
            }`}
          >
            {contract.IR35Status}
          </Badge>
        )}
      </div>
    </Link>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
      style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
    >
      <Sparkles className="h-3.5 w-3.5 text-white" />
    </div>
  );
}

export default function ChatWidget() {
  const location = useLocation();
  const { user, isPro, proLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRecruiterPage = location.pathname.startsWith("/recruiter");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Hide on recruiter pages (after all hooks)
  // Only show for Pro paying users — hide on recruiter pages, for non-users, and during load
  if (isRecruiterPage || proLoading || !user || !isPro) return null;

  // Only show the dot when there's a new assistant reply the user hasn't opened yet
  const [lastReadCount, setLastReadCount] = useState(0);
  const hasUnread = !isOpen && messages.filter(m => m.role === 'assistant').length > lastReadCount;
  useEffect(() => {
    if (isOpen) setLastReadCount(messages.filter(m => m.role === 'assistant').length);
  }, [isOpen, messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Get auth token if available (optional)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: anonKey,
        // Always send Authorization — use user JWT if logged in, anon key otherwise
        Authorization: `Bearer ${token ?? anonKey}`,
      };

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: newMessages.map(({ role, content }) => ({
              role,
              content,
            })),
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message ?? "Sorry, I could not get a response.",
        contracts: data.contracts?.length ? data.contracts : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden"
          style={{
            width: "min(380px, calc(100vw - 3rem))",
            maxHeight: "520px",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  IT Contract Assistant
                </p>
                <p className="text-xs text-blue-100">Ask me anything</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <AssistantAvatar />
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                    <p className="text-sm text-foreground">
                      Hi! I'm your IT contract assistant. I can search live
                      contract roles and help you find the right opportunities.
                      What are you looking for?
                    </p>
                  </div>
                </div>

                {/* Suggested prompts */}
                <div className="flex flex-wrap gap-1.5 pl-9">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-medium"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div
                      className="rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      }}
                    >
                      <p className="text-sm text-white">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <AssistantAvatar />
                    <div className="max-w-[85%] space-y-1">
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      {msg.contracts && msg.contracts.length > 0 && (
                        <div className="space-y-1">
                          {msg.contracts.map((contract) => (
                            <ContractCard key={contract.id} contract={contract} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <AssistantAvatar />
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-3 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about contracts..."
                disabled={isLoading}
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 shrink-0"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
        aria-label={isOpen ? "Close chat" : "Open chat assistant"}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}

        {/* Unread dot */}
        {hasUnread && (
          <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white" />
        )}
      </button>
    </>
  );
}
