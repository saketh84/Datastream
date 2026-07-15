import React from "react";
import {
  ArrowRight, BarChart3, Trash2, Copy,
  Filter, Database, Eraser, X
} from "lucide-react";
import "../styles/PipelinePreview.css";

const ICON_MAP = {
  remove_duplicates:    { icon: Copy,      color: "red",    label: "Remove Duplicates" },
  remove_empty_rows:    { icon: Filter,    color: "yellow", label: "Remove Empty Rows" },
  drop_missing_rows:    { icon: Trash2,    color: "red",    label: "Drop Missing Rows" },
  fill_missing_mean:    { icon: BarChart3, color: "blue",   label: "Fill Missing (Mean)" },
  remove_empty_columns: { icon: Database,  color: "yellow", label: "Remove Empty Cols" },
  strip_whitespace:     { icon: Eraser,    color: "green",  label: "Strip Whitespace" },
};

const PipelinePreview = ({ ops = [], onRemove, onMoveUp, onMoveDown, isRunning = false, runLog = null }) => {
  if (ops.length === 0) {
    return (
      <div className="bucket bucket--empty">
        <div className="bucket__empty-icon">⬡</div>
        <p className="bucket__empty-title">Pipeline is empty</p>
        <p className="bucket__empty-sub">Select operations on the left to add them here.</p>
      </div>
    );
  }

  return (
    <div className="bucket">
      <div className="bucket__flow">
        {ops.map((opValue, idx) => {
          const cfg = ICON_MAP[opValue] || { icon: Database, color: "gray", label: opValue };
          const Icon = cfg.icon;

          /* runtime status */
          let status = "idle";
          if (runLog) {
            const entry = runLog.find(l => l.op === opValue);
            if (entry) status = entry.status; // "running" | "done" | "error"
          }

          return (
            <React.Fragment key={opValue}>
              <div className={`bucket__step bucket__step--${cfg.color} bucket__step--${status}`}>
                {/* step number */}
                <span className="bucket__num">{String(idx + 1).padStart(2, "0")}</span>

                {/* icon */}
                <div className={`bucket__icon bucket__icon--${cfg.color}`}>
                  {status === "running" ? <span className="bucket__spinner" /> : <Icon size={16} />}
                </div>

                {/* label */}
                <span className="bucket__label">{cfg.label}</span>

                {/* status badge */}
                {status === "done"    && <span className="bucket__badge bucket__badge--done">✓</span>}
                {status === "error"   && <span className="bucket__badge bucket__badge--error">✗</span>}
                {status === "running" && <span className="bucket__badge bucket__badge--running">…</span>}

                {/* reorder + remove — only when not running */}
                {!isRunning && (
                  <div className="bucket__actions">
                    <button
                      className="bucket__btn"
                      onClick={() => onMoveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                    >▲</button>
                    <button
                      className="bucket__btn"
                      onClick={() => onMoveDown(idx)}
                      disabled={idx === ops.length - 1}
                      title="Move down"
                    >▼</button>
                    <button
                      className="bucket__btn bucket__btn--remove"
                      onClick={() => onRemove(opValue)}
                      title="Remove"
                    ><X size={13} /></button>
                  </div>
                )}
              </div>

              {/* Arrow between steps */}
              {idx < ops.length - 1 && (
                <div className="bucket__arrow">
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Live log during run */}
      {runLog && runLog.length > 0 && (
        <div className="bucket__log">
          {runLog.map((entry, i) => (
            <p key={i} className={`bucket__log-line bucket__log-line--${entry.status}`}>
              {entry.status === "done"    ? "✓" : entry.status === "error" ? "✗" : "›"}
              {" "}{ICON_MAP[entry.op]?.label ?? entry.op}
              {entry.status === "error" && entry.msg ? ` — ${entry.msg}` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelinePreview;