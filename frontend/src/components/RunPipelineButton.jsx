// src/components/RunPipelineButton.jsx
import React, { useState } from "react";
import { Play, Loader } from "lucide-react";
import axios from "axios";
import useDashboardStore from "../store"; // Pull global Zustand state store
import "../styles/RunPipelineButton.css";

/**
 * Props:
 * ops        — array of operations from usePreprocessing (objects e.g., [{operation: 'remove_duplicates'}])
 * onProgress — callback(runLog) during execution tracking
 * onDone     — callback when completed
 */
export default function RunPipelineButton({ ops = [], onProgress, onDone }) {
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Pull dataset matrices and data dispatch hooks out of global state
    const { 
        pipeline_tableData, 
        setPipelineData 
    } = useDashboardStore();

    const handleRun = async () => {
        setError("");
        setSuccess(false);

        // Step 1: Resilient State Extraction
        let rowsArray = null;
        if (pipeline_tableData) {
            if (Array.isArray(pipeline_tableData.rowData)) {
                rowsArray = pipeline_tableData.rowData;
            } else if (Array.isArray(pipeline_tableData.rows)) {
                rowsArray = pipeline_tableData.rows;
            } else if (Array.isArray(pipeline_tableData.data)) {
                rowsArray = pipeline_tableData.data;
            } else if (Array.isArray(pipeline_tableData)) {
                rowsArray = pipeline_tableData;
            }
        }

        // Validate that an active dataset exists in the store
        if (!rowsArray || rowsArray.length === 0) { 
            setError("No active dataset context found in workspace. Please ensure your initial file has been processed first."); 
            return; 
        }

        if (!ops || ops.length === 0) { 
            setError("Please select at least one operation from the checklist."); 
            return; 
        }

        // Step 2: Normalize operation tracking structures
        // Converts array objects [{operation: "remove_duplicates"}] into simple keyword arrays ["remove_duplicates"]
        const standardizedOps = ops.map(item => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && item.operation) return item.operation;
            return null;
        }).filter(Boolean);

        if (standardizedOps.length === 0) {
            setError("Selected operations contain invalid format configurations.");
            return;
        }

        setIsRunning(true);
        onProgress?.([{ op: "Initializing Sequential Pipeline Workflow...", status: "running" }]);

        try {
            // Step 3: Package clean arrays directly matching the backend JSON schema
            const payload = {
                operations: standardizedOps,
                dataset: rowsArray
            };

            // Step 4: Transmit the raw data via JSON HTTP Post
            const response = await axios.post(
                "http://127.0.0.1:8000/workflow/run/",
                payload,
                { 
                    headers: { 
                        "Content-Type": "application/json" 
                    } 
                }
            );

            // Step 5: Save structural metrics back to store to update DashboardView instantly
            if (response.data?.success && response.data?.result) {
                setPipelineData(response.data.result);
                setSuccess(true);
                onProgress?.([{ op: "Pipeline complete! Dashboard charts updated.", status: "done" }]);
                onDone?.(response.data.result);
            } else {
                throw new Error("Invalid response envelope structure from backend.");
            }
        } catch (err) {
            const backendDetail = err.response?.data?.detail;
            const msg = typeof backendDetail === 'object' 
                ? JSON.stringify(backendDetail) 
                : backendDetail || err.message;
            setError(`Execution failed: ${msg}`);
            onProgress?.([{ op: "Error", status: "error", msg }]);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="rpb">
            {error && <p className="rpb__msg rpb__msg--error">✗ {error}</p>}
            {success && <p className="rpb__msg rpb__msg--success">✓ Sequential pipeline committed and charts updated!</p>}

            <button
                className="rpb__btn"
                onClick={handleRun}
                disabled={isRunning || ops.length === 0}
            >
                <span className="rpb__ripple" />
                {isRunning ? (
                    <><Loader size={18} className="rpb__spin" /> Executing Pipeline Steps...</>
                ) : (
                    <><Play size={18} fill="#fff" /> Commit Transformations</>
                )}
            </button>
        </div>
    );
}
