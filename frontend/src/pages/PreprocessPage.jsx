import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import OperationSelector from "../components/OperationSelector";
import PipelinePreview from "../components/PipelinePreview";
import RunPipelineButton from "../components/RunPipelineButton";
import AIRecommendations from "../components/AIRecommendations";
import useDashboardStore from "../store";
import "../styles/PreprocessPage.css";

const PreprocessPage = () => {
  const navigate = useNavigate();

  // Ordered list of selected operation strings
  const [selectedOps, setSelectedOps] = useState([]);

  // Per-operation run log: [{ op, status: "running"|"done"|"error", msg? }]
  const [runLog, setRunLog] = useState(null);

  // Tracks whether the pipeline has finished and dashboard data is ready
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  // AI recommendations drawer toggle state
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  // Get file and setPipelineData from the dashboard store
  const { file, setPipelineData } = useDashboardStore();

  /* ── Selection helpers ───────────────────────── */
  const toggleOp = (opValue) => {
    setSelectedOps((prev) =>
      prev.includes(opValue)
        ? prev.filter((v) => v !== opValue)
        : [...prev, opValue]
    );
    setRunLog(null); // clear old run log when selection changes
    setIsDashboardReady(false); // invalidate readiness on selection change
  };

  const removeOp = (opValue) => {
    setSelectedOps((prev) => prev.filter((v) => v !== opValue));
    setRunLog(null);
    setIsDashboardReady(false);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setSelectedOps((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    setSelectedOps((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  /* ── Run callbacks ───────────────────────────── */
  const handleProgress = (log) => {
    setRunLog(log);
  };

  const handleDone = (result) => {
    console.log("Pipeline done", result);

    // Guard against undefined/null results before treating dashboard as ready
    if (!result) {
      console.warn("Pipeline finished but returned no result; dashboard not updated.");
      setIsDashboardReady(false);
      return;
    }

    if (setPipelineData) {
      setPipelineData(result); // update dashboard store
    }

    setIsDashboardReady(true);
  };

  const handleGoToDashboard = () => {
    if (!isDashboardReady) return;
    navigate("/dashboard");
  };

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="preprocess-page">
      {/* Page header */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="step-badge">STEP 03</p>
          <h1 className="page-title" style={{ margin: "8px 0 0 0" }}>Configure Pipeline</h1>
        </div>
        <button 
          onClick={() => setShowAiDrawer(true)} 
          className="ai-recommendations-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s',
            height: '42px'
          }}
        >
          <Sparkles size={16} />
          View AI Recommendations
        </button>
      </div>
      <p className="page-subtitle" style={{ marginTop: "-20px", marginBottom: "32px" }}>
        Pick operations on the left — they'll appear in your pipeline bucket on the right.
        Reorder them as needed, then hit Run.
      </p>

      {/* Two-column layout */}
      <div className="grid-container">
        {/* LEFT — Operation catalogue */}
        <div>
          <p className="quality-label" style={{ marginBottom: "12px" }}>
            Operations Catalog
          </p>
          <OperationSelector selectedOps={selectedOps} onToggle={toggleOp} />
        </div>

        {/* RIGHT — Pipeline bucket */}
        <div>
          <p className="quality-label" style={{ marginBottom: "12px" }}>
            Pipeline — {selectedOps.length} step{selectedOps.length !== 1 ? "s" : ""}
          </p>
          <PipelinePreview
            ops={selectedOps}
            onRemove={removeOp}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            isRunning={runLog?.some((l) => l.status === "running")}
            runLog={runLog}
          />
        </div>
      </div>

      {/* Run button row */}
      <div
        style={{
          marginTop: "40px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          alignItems: "center",
        }}
      >
        {/* Dashboard navigation button — only enabled once pipeline data is ready */}
        <button
          type="button"
          onClick={handleGoToDashboard}
          disabled={!isDashboardReady}
          className="dashboard-nav-button"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid var(--border-color, #444)",
            backgroundColor: isDashboardReady ? "#2563eb" : "#374151",
            color: isDashboardReady ? "#ffffff" : "#9ca3af",
            cursor: isDashboardReady ? "pointer" : "not-allowed",
            fontWeight: 600,
            transition: "background-color 0.2s ease, color 0.2s ease",
          }}
          title={
            isDashboardReady
              ? "Go to Dashboard"
              : "Run the pipeline to unlock the dashboard"
          }
        >
          Go to Dashboard →
        </button>

        <RunPipelineButton
          ops={selectedOps}
          file={file}
          onProgress={handleProgress}
          onDone={handleDone}
        />
      </div>

      {/* AI Recommendations Drawer Backdrop */}
      {showAiDrawer && (
        <div 
          onClick={() => setShowAiDrawer(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* AI Recommendations Drawer Side-card */}
      {showAiDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '460px',
          height: '100vh',
          backgroundColor: '#16181d',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#10b981" />
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'white', margin: 0 }}>AI Recommendations</h2>
            </div>
            <button 
              onClick={() => setShowAiDrawer(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <AIRecommendations
              file={file}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default PreprocessPage;