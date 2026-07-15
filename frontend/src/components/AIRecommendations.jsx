import React, { useState, useEffect, useCallback } from "react";
import { Loader, AlertCircle, RefreshCw } from "lucide-react";
import RecommendationCard from "./RecommendationCard";
import "../styles/AIRecommendations.css";

const API_URL = "http://127.0.0.1:8000/api/v1/get_recommendations";

const AIRecommendations = ({ file }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    if (!file) {
      setStatus("error");
      setErrorMsg("No file available to analyze.");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      // Handle non-2xx responses (FastAPI returns detail on HTTPException)
      if (!response.ok) {
        let detail = `Request failed with status ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch {
          // response wasn't JSON; keep default message
        }
        throw new Error(detail);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error("Server returned an unsuccessful response.");
      }

      // Defensive: ensure report is an array before setting state
      const report = Array.isArray(data.report) ? data.report : [];
      setRecommendations(report);
      setStatus("success");
    } catch (err) {
      console.error("Failed to fetch AI recommendations:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Unexpected error contacting the recommendation service."
      );
      setStatus("error");
    }
  }, [file]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  /* ── Loading state ───────────────────────────── */
  if (status === "loading") {
    return (
      <div className="ai-rec-status">
        <Loader className="spinner" size={24} />
        <p>Analyzing your dataset for cleaning recommendations…</p>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────── */
  if (status === "error") {
    return (
      <div className="ai-rec-status ai-rec-error">
        <AlertCircle size={24} />
        <p>{errorMsg || "Something went wrong while fetching recommendations."}</p>
        <button className="retry-btn" onClick={fetchRecommendations}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty state (success, but no recommendations) ── */
  if (status === "success" && recommendations.length === 0) {
    return (
      <div className="ai-rec-status">
        <p>No cleaning recommendations found — your dataset looks good!</p>
      </div>
    );
  }

  /* ── Success state ───────────────────────────── */
  return (
    <div className="ai-recommendations-list">
      {recommendations.map((operation, idx) => {
        // Guard against malformed items missing the operation key
        if (!operation?.operation) {
          console.warn("Skipping malformed recommendation item at index", idx, operation);
          return null;
        }

        return (
          <RecommendationCard
            key={operation.operation || idx}
            operation={operation}
          />
        );
      })}
    </div>
  );
};

export default AIRecommendations;
