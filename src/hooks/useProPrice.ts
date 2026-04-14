import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type PriceData = {
  amount: number;       // e.g. 2999
  currency: string;     // e.g. "gbp"
  interval: string;     // e.g. "month"
  interval_count: number;
};

function formatPrice(data: PriceData): string {
  const symbol = data.currency === "gbp" ? "£" : data.currency === "usd" ? "$" : "€";
  const amount = (data.amount / 100).toFixed(2).replace(/\.00$/, "");
  const interval = data.interval_count === 1 ? data.interval : `${data.interval_count} ${data.interval}s`;
  return `${symbol}${amount}/${interval}`;
}

export function useProPrice() {
  const { data, isLoading } = useQuery<PriceData>({
    queryKey: ["pro-price"],
    queryFn: async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-price`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      });
      if (!res.ok) throw new Error("Failed to fetch price");
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // cache for 1 hour
  });

  return {
    priceData: data,
    priceString: data ? formatPrice(data) : null,
    isLoading,
  };
}
