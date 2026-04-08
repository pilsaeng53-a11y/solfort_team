import { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/neonClient";

export default function useMarketData(autoRefreshMs = 0) {
  const [rate, setRate] = useState(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getMarketData", {});
      setRate(res.data.usdt_krw);
      setSource(res.data.source);
    } catch {
      // Use localStorage fallback
      const saved = localStorage.getItem("sf_usdt_rate");
      if (saved) {
        setRate(parseFloat(saved));
        setSource("cached");
      } else {
        setRate(1500);
        setSource("fallback");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchRate, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [fetchRate, autoRefreshMs]);

  useEffect(() => {
    if (rate) {
      localStorage.setItem("sf_usdt_rate", rate.toString());
    }
  }, [rate]);

  return { rate, source, loading, fetchRate };
}