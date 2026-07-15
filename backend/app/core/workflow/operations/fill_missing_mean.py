# app/core/workflow/operations/fill_missing_mean.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class FillMissingMeanNode(NodeBase):
    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside FillMissingMeanNode."
            )

        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"FillMissingMeanNode expected a pandas DataFrame, got {type(df).__name__}."
            )

        if df.empty:
            logger.info("FillMissingMeanNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()
        numeric_cols = df_copy.select_dtypes(include=["number"]).columns

        if len(numeric_cols) == 0:
            logger.info("FillMissingMeanNode: no numeric columns found, nothing to fill.")
            return df_copy

        for col in numeric_cols:
            try:
                col_mean = df_copy[col].mean()

                # mean() returns NaN if the whole column is empty/NaN
                if pd.isna(col_mean):
                    logger.warning(
                        "FillMissingMeanNode: column '%s' has no valid numeric values "
                        "to compute a mean; filling with 0 instead.", col
                    )
                    col_mean = 0

                df_copy[col] = df_copy[col].fillna(col_mean)
            except Exception as e:
                logger.error(
                    "FillMissingMeanNode: failed to fill column '%s' (%s). Skipping column.",
                    col, e
                )
                continue

        return df_copy