# app/core/workflow/operations/remove_constant_columns.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class RemoveConstantColumnsNode(NodeBase):
    """Drops columns where every non-null value is identical (zero variance),
    since they carry no analytical signal. Fully-NaN columns are also dropped."""

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside RemoveConstantColumnsNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"RemoveConstantColumnsNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("RemoveConstantColumnsNode: received empty DataFrame, returning as-is.")
            return df.copy()

        cols_to_drop = []

        for col in df.columns:
            try:
                unique_non_null = df[col].dropna().unique()
                if len(unique_non_null) <= 1:
                    cols_to_drop.append(col)
            except TypeError:
                # Column contains unhashable values (lists/dicts); skip safely
                logger.warning(
                    "RemoveConstantColumnsNode: column '%s' contains unhashable "
                    "values; skipping constancy check.", col
                )
                continue

        if cols_to_drop:
            logger.info(
                "RemoveConstantColumnsNode: dropping constant columns: %s", cols_to_drop
            )

        if len(cols_to_drop) == len(df.columns):
            logger.warning(
                "RemoveConstantColumnsNode: all columns were constant; result would "
                "have zero columns. Returning original DataFrame instead to avoid "
                "destroying the dataset."
            )
            return df.copy()

        return df.drop(columns=cols_to_drop)