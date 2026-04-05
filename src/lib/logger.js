import { base44 } from "@/api/base44Client";

export const Logger = {
  log: async (type, actor, actorRole, target, action, beforeVal = "", afterVal = "") => {
    try {
      await base44.entities.SystemLog.create({
        log_type: type,
        actor,
        actor_role: actorRole,
        target,
        action,
        before_value: beforeVal,
        after_value: afterVal,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Log failed:", e);
    }
  },
};