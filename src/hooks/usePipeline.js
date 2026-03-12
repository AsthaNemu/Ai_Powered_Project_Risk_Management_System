// ============================================================
//  RiskShield — usePipeline Hook
//  Wraps the multi-agent pipeline with React state management.
// ============================================================

import { useState, useCallback } from "react";
import { runPipeline }           from "../agents/pipeline.js";
import { sleep }                 from "../agents/geminiClient.js";

export function usePipeline() {
  const [screen,    setScreen]    = useState("upload");  // upload | analyzing | dashboard
  const [logs,      setLogs]      = useState([]);
  const [progress,  setProgress]  = useState(0);
  const [stage,     setStage]     = useState("");
  const [risks,     setRisks]     = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [ragIndex,  setRagIndex]  = useState(null);
  const [sessionId, setSessionId] = useState(null);   // AWS session ID (null when USE_AWS=false)
  const [reportUrl, setReportUrl] = useState(null);   // S3 presigned URL (null when USE_AWS=false)
  const [apiKey,    setApiKey]    = useState(
    import.meta.env.VITE_GEMINI_API_KEY ?? ""
  );
  const [error,     setError]     = useState("");

  const addLog = useCallback((agent, msg, type = "info") => {
    setLogs((prev) => [...prev, { agent, msg, type, ts: Date.now() }]);
  }, []);

  const start = useCallback(async (key, srsFile, brdFile, policyFile) => {
    setApiKey(key);
    setError("");
    setScreen("analyzing");
    setLogs([]);
    setProgress(0);
    setStage("");
    setSessionId(null);
    setReportUrl(null);

    try {
      const result = await runPipeline({
        apiKey:      key,
        srsFile,
        brdFile,
        policyFile,
        onLog:      addLog,
        onProgress: setProgress,
        onStage:    setStage,
      });

      setRisks(result.risks);
      setSummary(result.summary);
      setRagIndex(result.ragIndex);
      setSessionId(result.sessionId ?? null);
      setReportUrl(result.reportUrl ?? null);

      await sleep(800);
      setScreen("dashboard");
    } catch (e) {
      addLog("sys", `Pipeline error: ${e.message}`, "error");
      setStage(`Error: ${e.message}`);
      setError(e.message || "Unknown error");
      await sleep(400);
      setScreen("upload");
    }
  }, [addLog]);

  const reset = useCallback(() => {
    setScreen("upload");
    setRisks([]);
    setSummary(null);
    setRagIndex(null);
    setSessionId(null);
    setReportUrl(null);
    setLogs([]);
    setProgress(0);
    setStage("");
    setError("");
  }, []);

  return {
    screen, logs, progress, stage,
    risks, summary, ragIndex,
    sessionId, reportUrl,
    apiKey, error, start, reset,
  };
}
