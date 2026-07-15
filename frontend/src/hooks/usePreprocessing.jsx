// Corrected src/hooks/usePreprocessing.jsx
import { useEffect, useState } from "react";
import { getRecommendations, runPipeline } from "../services/preprocessApi";
import useDashboardStore from "../store"; // 1. Import the global store

export default function usePreprocessing(datasetId) {
    const [recommendations, setRecommendations] = useState([]);
    const [selectedOperations, setSelectedOperations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [qualityScore, setQualityScore] = useState(0);

    // 2. Extract the setter function from your Zustand store
    const setPipelineData = useDashboardStore((state) => state.setPipelineData);

    useEffect(() => {
        loadRecommendations();
    }, []);

    async function loadRecommendations() {
        try {
            setLoading(true);
            const data = await getRecommendations(datasetId);
            setRecommendations(data.recommendations);
            setQualityScore(data.quality_score);
        } catch (err) {
            setError("Failed to load recommendations.");
        } finally {
            setLoading(false);
        }
    }

    function toggleOperation(operation) {
        const exists = selectedOperations.find(
            x => x.operation === operation.operation
        );
        if (exists) {
            setSelectedOperations(
                selectedOperations.filter(x => x.operation !== operation.operation)
            );
        } else {
            setSelectedOperations([...selectedOperations, operation]);
        }
    }

    // 3. Update the execute step to save the results globally
    async function executePipeline() {
        setLoading(true);
        try {
            const result = await runPipeline(
                datasetId,
                selectedOperations
            );
            
            // If the backend returns the fully recalculated dashboard analytics suite (result.result),
            // save it directly to the store here:
            if (result && result.success && result.result) {
                setPipelineData(result.result);
            }
            
            return result;
        } catch (err) {
            setError(err.message || "Failed to execute pipeline");
        } finally {
            setLoading(false);
        }
    }

    return {
        recommendations,
        selectedOperations,
        toggleOperation,
        executePipeline,
        loading,
        error,
        qualityScore
    };
}