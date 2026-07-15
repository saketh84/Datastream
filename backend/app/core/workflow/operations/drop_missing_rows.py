# app/core/workflow/operations/drop_missing_rows.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class DropMissingRowsNode(NodeBase):
    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside DropMissingRowsNode."
            )

        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"DropMissingRowsNode expected a pandas DataFrame, got {type(df).__name__}."
            )

        if df.empty:
            logger.info("DropMissingRowsNode: received empty DataFrame, returning as-is.")
            return df.copy()

        result = df.dropna(how="any")

        if result.empty and not df.empty:
            logger.warning(
                "DropMissingRowsNode: dropping rows with any missing values "
                "resulted in an empty DataFrame (all rows had at least one NaN)."
            )

        return result.reset_index(drop=True)