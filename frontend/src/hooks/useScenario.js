import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useSessionStore } from "../store/sessionStore";

export function useScenario(sessionId) {
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentSession, updateScore, setSession } = useSessionStore();

  // Load scenario metadata + restore session state
  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      try {
        setLoading(true);
        const [sessionRes, scenarioRes] = await Promise.all([
          api.get(`/api/sessions/${sessionId}`),
          api.get(`/api/scenarios/${currentSession?.scenario_id || ""}`).catch(() => null),
        ]);

        setSession(sessionRes.data);
        if (scenarioRes) setScenario(scenarioRes.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId]);

  // Acknowledge ROE
  const acknowledgeRoe = useCallback(async () => {
    await api.post("/api/sessions/roe-ack", { session_id: sessionId });
    setSession((prev) => ({ ...prev, roe_acknowledged: true }));
  }, [sessionId]);

  // Submit flag
  const submitFlag = useCallback(
    async (flagValue) => {
      const res = await api.post(`/api/sessions/${sessionId}/flag`, {
        flag_value: flagValue,
      });
      if (res.data.valid && !res.data.already_captured) {
        updateScore(res.data.points_awarded ?? 0);
      }
      return res.data;
    },
    [sessionId, updateScore]
  );

  // End session
  const endSession = useCallback(async () => {
    await api.post(`/api/sessions/${sessionId}/end`);
  }, [sessionId]);

  return {
    scenario,
    session: currentSession,
    loading,
    error,
    acknowledgeRoe,
    submitFlag,
    endSession,
  };
}
