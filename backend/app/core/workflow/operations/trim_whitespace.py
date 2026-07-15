# app/core/workflow/operations/trim_whitespace.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class TrimWhitespaceNode(NodeBase):
    """Trims leading/trailing whitespace and collapses internal double-spaces
    in all string/object columns. Also normalizes empty-string-only cells to NaN."""

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside TrimWhitespaceNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"TrimWhitespaceNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("TrimWhitespaceNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()
        object_cols = df_copy.select_dtypes(include=["object"]).columns

        for col in object_cols:
            try:
                # Only touch actual string cells; leave numbers/None/NaN/lists alone
                df_copy[col] = df_copy[col].apply(
                    lambda x: " ".join(x.split()) if isinstance(x, str) else x
                )
                # Cells that became empty strings after trimming become NaN
                df_copy[col] = df_copy[col].replace("", pd.NA)
            except Exception as e:
                logger.error(
                    "TrimWhitespaceNode: failed to clean column '%s' (%s). Skipping column.",
                    col, e
                )
                continue

        return df_copy