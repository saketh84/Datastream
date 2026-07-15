# app/core/workflow/operations/normalize_scale.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class NormalizeScaleNode(NodeBase):
    """Min-max scales all numeric columns into the [0, 1] range.
    Columns with zero variance (constant values) are left unchanged
    since scaling them would produce division-by-zero / all-NaN results."""

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside NormalizeScaleNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"NormalizeScaleNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("NormalizeScaleNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()
        numeric_cols = df_copy.select_dtypes(include=["number"]).columns

        if len(numeric_cols) == 0:
            logger.info("NormalizeScaleNode: no numeric columns found; nothing to scale.")
            return df_copy

        for col in numeric_cols:
            try:
                col_min = df_copy[col].min()
                col_max = df_copy[col].max()

                if pd.isna(col_min) or pd.isna(col_max):
                    logger.warning(
                        "NormalizeScaleNode: column '%s' has no valid numeric "
                        "values; skipping.", col
                    )
                    continue

                range_val = col_max - col_min

                if range_val == 0:
                    logger.info(
                        "NormalizeScaleNode: column '%s' has zero range (constant "
                        "values); leaving unscaled to avoid divide-by-zero.", col
                    )
                    continue

                df_copy[col] = (df_copy[col] - col_min) / range_val
            except Exception as e:
                logger.error(
                    "NormalizeScaleNode: failed to scale column '%s' (%s). "
                    "Skipping column.", col, e
                )
                continue

        return df_copy