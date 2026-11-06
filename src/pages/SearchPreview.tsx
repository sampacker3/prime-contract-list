import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

// SearchPreview is now obsolete — the contracts page is open to all users.
// Redirect to /contracts preserving the search query.
export default function SearchPreview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") ?? "";

  useEffect(() => {
    navigate(q ? `/contracts?q=${encodeURIComponent(q)}` : "/contracts", { replace: true });
  }, []);

  return null;
}
