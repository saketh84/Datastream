import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";
import "../styles/RecommendationCard.css";

const RecommendationCard = ({ operation }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="recommendation-card">
            {/* Header */}
            <div className="card-header" onClick={() => setExpanded(!expanded)}>
                <div className="operation-info">
                    <div style={{ marginTop: "4px" }}>
                        <Sparkles
                            className="w-5 h-5 text-green-400"
                        />
                    </div>
                    <div>
                        <h2 className="operation-name">
                            {operation.operation
                                .replaceAll("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h2>
                        <p className="operation-desc">
                            {operation.description}
                        </p>
                        <div className="operation-tags">
                            {/* Severity Tag */}
                            <span className={`tag ${(operation.severity || "Low").toLowerCase()}`}>
                                {operation.severity || "Low"}
                            </span>
                            {/* AI Recommended Badge */}
                            {operation.recommended && (
                                <span className="tag recommended">
                                    AI Recommended
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section / Actions */}
                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    {/* Expand/Collapse Chevron Button */}
                    <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {/* Expand Section */}
            {expanded && (
                <div className="expand-content">
                    <div className="reason">
                        <Info className="reason-icon" size={18} />
                        <div>
                            <h3 className="reason-title">Why is this recommended?</h3>
                            <p className="reason-text">{operation.reason}</p>
                        </div>
                    </div>

                    {operation.example && (
                        <div className="example">
                            <h4 className="example-title">Example</h4>
                            <div className="example-box">
                                {operation.example}
                            </div>
                        </div>
                    )}

                    {operation.warning && (
                        <div className="warning">
                            <AlertTriangle className="warning-icon" size={18} />
                            <div>
                                <h4 className="warning-title">Warning</h4>
                                <p className="warning-text">{operation.warning}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RecommendationCard;
