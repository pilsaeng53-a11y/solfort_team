import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export default function useDealer() {
  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDealer = useCallback(async () => {
    setLoading(true);
    try {
      // Try localStorage first for quick load
      const cached = localStorage.getItem("sf_dealer");
      if (cached) {
        setDealer(JSON.parse(cached));
      }
      // Then sync from DB
      const dealers = await base44.entities.DealerInfo.list("-created_date", 1);
      if (dealers.length > 0) {
        setDealer(dealers[0]);
        localStorage.setItem("sf_dealer", JSON.stringify(dealers[0]));
      } else if (!cached) {
        setDealer(null);
      }
    } catch {
      const cached = localStorage.getItem("sf_dealer");
      if (cached) setDealer(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDealer();
  }, [loadDealer]);

  const saveDealer = async (data) => {
    const result = await base44.entities.DealerInfo.create(data);
    setDealer(result);
    localStorage.setItem("sf_dealer", JSON.stringify(result));
    return result;
  };

  const updateDealer = async (id, data) => {
    const result = await base44.entities.DealerInfo.update(id, data);
    const updated = { ...dealer, ...data, id };
    setDealer(updated);
    localStorage.setItem("sf_dealer", JSON.stringify(updated));
    return result;
  };

  return { dealer, loading, saveDealer, updateDealer, loadDealer };
}