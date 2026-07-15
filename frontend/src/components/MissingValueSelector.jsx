import React from "react";
import {
    Database,
    BarChart3,
    Trash2,
    Copy,
    Filter,
    Zap
} from "lucide-react";
import "../styles/MissingValueSelector.css";

const options = [
    // ============ OPERATION 1: REMOVE DUPLICATES ============
    {
        value: "remove_duplicates",
        title: "Remove Duplicate Rows",
        description: "Delete duplicate rows from the dataset.",
        icon: Copy,
        severity: "High",
        recommended: true,
        category: "Data Cleaning"
    },

    // ============ OPERATION 2: REMOVE EMPTY ROWS ============
    {
        value: "remove_empty_rows",
        title: "Remove Empty Rows",
        description: "Delete rows containing only null/NaN values.",
        icon: Filter,
        severity: "High",
        recommended: true,
        category: "Data Cleaning"
    },

    // ============ OPERATION 3: FILL MISSING VALUES ============
    {
        value: "fill_missing",
        title: "Fill Missing Values",
        description: "Replace missing numeric values with column mean.",
        icon: BarChart3,
        severity: "High",
        recommended: true,
        category: "Missing Values",
        method: "mean" // Default method
    },

    // ============ OPERATION 4: DROP MISSING ROWS ============
    {
        value: "drop_missing_rows",
        title: "Drop Missing Rows",
        description: "Delete rows containing any missing values.",
        icon: Trash2,
        severity: "High",
        recommended: true,
        category: "Missing Values"
    },

    // ============ OPERATION 5: REMOVE EMPTY COLUMNS ============
    {
        value: "remove_empty_columns",
        title: "Remove Empty Columns",
        description: "Delete columns with all null/NaN values.",
        icon: Filter,
        severity: "High",
        recommended: true,
        category: "Data Cleaning"
    },

    // ============ OPERATION 6: KEEP AS-IS (Optional) ============
    {
        value: "none",
        title: "Keep As-Is",
        description: "Do not modify the dataset.",
        icon: Database,
        severity: "Low",
        recommended: false,
        category: "No Operation"
    }
];

const MissingValueSelector = ({
    value,
    onChange
}) => {
    const handleOperationChange = (selectedValue) => {
        // If "none" is selected, pass it directly
        if (selectedValue === "none") {
            onChange(selectedValue);
            return;
        }

        // Find the selected option
        const selectedOption = options.find(opt => opt.value === selectedValue);

        // If it's fill_missing, include the method
        if (selectedValue === "fill_missing") {
            onChange({
                operation: "fill_missing",
                method: "mean"
            });
        } else {
            onChange(selectedValue);
        }
    };

    return (
        <div className="missing-selector">
            <div className="selector-header">
                <h2 className="selector-title">
                    <Database size={24} className="text-green-400" />
                    Preprocessing Operations
                </h2>
                <p className="selector-subtitle">
                    Select operations to clean and preprocess your data.
                    <span className="recommended-badge">
                        <Zap size={12} />
                        5 Recommended
                    </span>
                </p>
            </div>

            <div className="options-container">
                <div className="options-grid">
                    {options.map((option) => {
                        const Icon = option.icon;
                        const isSelected = value === option.value ||
                            (typeof value === 'object' && value.operation === option.value);

                        return (
                            <label
                                key={option.value}
                                className={`option-item ${isSelected ? "selected" : ""} ${option.recommended ? "recommended" : ""}`}
                            >
                                <div className="option-left">
                                    <div className={`option-icon ${isSelected ? "selected" : ""}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="option-info">
                                        <div className="option-title-row">
                                            <h3 className="option-title">{option.title}</h3>
                                            {option.recommended && (
                                                <span className="ai-badge">
                                                    <Zap size={12} />
                                                    AI
                                                </span>
                                            )}
                                            <span
                                                className={`severity-badge severity-${option.severity.toLowerCase()}`}
                                            >
                                                {option.severity}
                                            </span>
                                        </div>
                                        <p className="option-desc">{option.description}</p>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="preprocess"
                                    checked={isSelected}
                                    onChange={() => handleOperationChange(option.value)}
                                    className="option-radio"
                                />
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MissingValueSelector;