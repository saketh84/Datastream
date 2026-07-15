import React from "react";
import {
    Database, BarChart3, Trash2, Copy, Filter, Eraser, Zap, Calendar, AlertTriangle, TrendingUp, Sliders
} from "lucide-react";
import "../styles/OperationSelector.css";

const options = [
    {
        value: "remove_empty_rows_cols",
        title: "Remove Empty Rows / Columns",
        description: "Drop all rows and columns that contain only null or empty values.",
        icon: Filter,
        severity: "High",
        recommended: true,
        colorClass: "yellow"
    },
    {
        value: "remove_duplicates",
        title: "Remove Duplicate Rows",
        description: "Delete duplicate rows from the dataset.",
        icon: Copy,
        severity: "High",
        recommended: true,
        colorClass: "red"
    },
    {
        value: "strip_whitespace",
        title: "Trim Whitespaces & Clean Text",
        description: "Strip leading/trailing spaces and clean text values.",
        icon: Eraser,
        severity: "Medium",
        recommended: true,
        colorClass: "green"
    },
    {
        value: "convert_data_types",
        title: "Convert Data Types",
        description: "Automatically convert columns to their inferred optimal data types.",
        icon: Database,
        severity: "Medium",
        recommended: false,
        colorClass: "blue"
    },
    {
        value: "convert_date_columns",
        title: "Convert Date Columns",
        description: "Convert date-like text columns to proper datetime format.",
        icon: Calendar,
        severity: "Medium",
        recommended: true,
        colorClass: "green"
    },
    {
        value: "handle_missing_values",
        title: "Handle Missing Values",
        description: "Impute missing numeric values using the column mean.",
        icon: BarChart3,
        severity: "High",
        recommended: true,
        colorClass: "blue"
    },
    {
        value: "remove_constant_columns",
        title: "Remove Constant Columns",
        description: "Drop columns that have only a single constant value.",
        icon: Trash2,
        severity: "Low",
        recommended: false,
        colorClass: "yellow"
    },
    {
        value: "remove_outliers",
        title: "Remove Outliers",
        description: "Detect and drop outliers from numeric columns using the IQR method.",
        icon: AlertTriangle,
        severity: "High",
        recommended: false,
        colorClass: "red"
    },
    {
        value: "encode_categorical",
        title: "Encode Categorical Variables",
        description: "One-hot encode categorical string columns into numeric dummy variables.",
        icon: TrendingUp,
        severity: "Medium",
        recommended: false,
        colorClass: "blue"
    },
    {
        value: "normalize_scale",
        title: "Normalize / Scale Numeric Data",
        description: "Standardize numeric columns using Min-Max scaling.",
        icon: Sliders,
        severity: "Medium",
        recommended: false,
        colorClass: "green"
    }
];

export default function OperationSelector({ selectedOps = [], onToggle }) {
    const recommendedCount = options.filter(o => o.recommended).length;

    return (
        <div className="operation-selector">
            <div className="selector-header">
                <h2 className="selector-title">
                    <Database size={24} className="text-green-400" />
                    Preprocessing Operations
                </h2>
                <p className="selector-subtitle">
                    Select operations to clean and preprocess your data.
                    <span className="recommended-badge">
                        <Zap size={12} />
                        {recommendedCount} Recommended
                    </span>
                </p>
            </div>

            <div className="options-grid">
                {options.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedOps.includes(option.value);

                    return (
                        <div
                            key={option.value}
                            className={`option-item ${isSelected ? "selected" : ""}`}
                            onClick={() => onToggle(option.value)}
                        >
                            <div className="option-left">
                                <div className={`option-icon ${option.colorClass} ${isSelected ? "selected" : ""}`}>
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
                                        <span className={`severity-badge severity-${option.severity.toLowerCase()}`}>
                                            {option.severity}
                                        </span>
                                    </div>
                                    <p className="option-desc">{option.description}</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggle(option.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="option-checkbox"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
