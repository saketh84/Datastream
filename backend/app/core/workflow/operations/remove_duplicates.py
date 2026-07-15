# app/core/workflow/operations/remove_duplicates.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class RemoveDuplicatesNode(NodeBase):
    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside RemoveDuplicatesNode."
            )

        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"RemoveDuplicatesNode expected a pandas DataFrame, got {type(df).__name__}."
            )

        if df.empty:
            logger.info("RemoveDuplicatesNode: received empty DataFrame, returning as-is.")
            return df.copy()

        try:
            result = df.drop_duplicates()
        except TypeError as e:
            # Happens when columns contain unhashable types (lists, dicts, etc.)
            logger.warning(
                "RemoveDuplicatesNode: unhashable column values detected (%s). "
                "Falling back to string-cast comparison.", e
            )
            result = df.loc[df.astype(str).drop_duplicates().index]

        return result.reset_index(drop=True)