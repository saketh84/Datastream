# app/core/workflow/operations/handle_missing_values.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class HandleMissingValuesNode(NodeBase):
    """
    General-purpose missing value handler.
    - Numeric columns: filled with column mean (or 0 if entirely NaN).
    - Categorical/object columns: filled with column mode (or 'Unknown' if entirely NaN).
    """

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside HandleMissingValuesNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"HandleMissingValuesNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("HandleMissingValuesNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()

        numeric_cols = df_copy.select_dtypes(include=["number"]).columns
        categorical_cols = df_copy.select_dtypes(include=["object", "category", "bool"]).columns

        for col in numeric_cols:
            try:
                col_mean = df_copy[col].mean()
                if pd.isna(col_mean):
                    logger.warning(
                        "HandleMissingValuesNode: column '%s' has no valid numeric "
                        "values; filling with 0.", col
                    )
                    col_mean = 0
                df_copy[col] = df_copy[col].fillna(col_mean)
            except Exception as e:
                logger.error(
                    "HandleMissingValuesNode: failed to fill numeric column '%s' (%s). "
                    "Skipping column.", col, e
                )
                continue

        for col in categorical_cols:
            try:
                mode_series = df_copy[col].mode(dropna=True)
                fill_value = mode_series.iloc[0] if not mode_series.empty else "Unknown"
                df_copy[col] = df_copy[col].fillna(fill_value)
            except Exception as e:
                logger.error(
                    "HandleMissingValuesNode: failed to fill categorical column '%s' (%s). "
                    "Skipping column.", col, e
                )
                continue

        return df_copy
