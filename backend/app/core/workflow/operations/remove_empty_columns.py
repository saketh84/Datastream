# app/core/workflow/operations/remove_empty_columns.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class RemoveEmptyColumnsNode(NodeBase):
    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside RemoveEmptyColumnsNode."
            )

        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"RemoveEmptyColumnsNode expected a pandas DataFrame, got {type(df).__name__}."
            )

        if df.empty:
            logger.info("RemoveEmptyColumnsNode: received empty DataFrame, returning as-is.")
            return df.copy()

        result = df.dropna(how="all", axis=1)

        if result.shape[1] == 0:
            logger.warning(
                "RemoveEmptyColumnsNode: all columns were empty; result has zero columns."
            )

        return result