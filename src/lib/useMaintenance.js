import { useState, useEffect } from "react";
import { base44 } from "@/api/neonClient";
import { Auth } from "@/api/neonClient";

export default function useMaintenance() {
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (Auth.isSuperAdmin()) { setChecked(true); return; }
    base44.entities.SystemSettings.filter({ setting_key: "maintenance_mode" }, "-created_date", 1)
      .then(rows => {
        if (rows?.[0]?.setting_value === "true") setMaintenance(true);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  return { maintenance, checked };
}