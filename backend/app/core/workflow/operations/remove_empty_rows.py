# app/core/workflow/operations/remove_empty_rows.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class RemoveEmptyRowsNode(NodeBase):
    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside RemoveEmptyRowsNode."
            )

        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"RemoveEmptyRowsNode expected a pandas DataFrame, got {type(df).__name__}."
            )

        if df.empty:
            logger.info("RemoveEmptyRowsNode: received empty DataFrame, returning as-is.")
            return df.copy()

        # Drops a row only if ALL columns are completely NaN
        result = df.dropna(how="all")
        return result.reset_index(drop=True)