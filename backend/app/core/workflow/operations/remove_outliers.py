# app/core/workflow/operations/remove_outliers.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class RemoveOutliersNode(NodeBase):
    """Removes rows containing numeric outliers using the IQR method
    (values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]) across all numeric columns."""

    _IQR_MULTIPLIER = 1.5

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside RemoveOutliersNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"RemoveOutliersNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("RemoveOutliersNode: received empty DataFrame, returning as-is.")
            return df.copy()

        numeric_cols = df.select_dtypes(include=["number"]).columns

        if len(numeric_cols) == 0:
            logger.info("RemoveOutliersNode: no numeric columns found; nothing to filter.")
            return df.copy()

        mask = pd.Series(True, index=df.index)

        for col in numeric_cols:
            try:
                col_data = df[col].dropna()
                if col_data.empty:
                    continue

                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1

                # Zero IQR (e.g. mostly-constant column) would flag almost everything
                # as an outlier — skip filtering on that column to avoid gutting the data.
                if iqr == 0:
                    logger.info(
                        "RemoveOutliersNode: column '%s' has zero IQR; skipping "
                        "outlier filtering for this column.", col
                    )
                    continue

                lower_bound = q1 - self._IQR_MULTIPLIER * iqr
                upper_bound = q3 + self._IQR_MULTIPLIER * iqr

                # NaNs in this column shouldn't cause the row to be excluded here;
                # only flag rows where the value is present AND out of bounds.
                col_mask = df[col].isna() | df[col].between(lower_bound, upper_bound)
                mask &= col_mask
            except Exception as e:
                logger.error(
                    "RemoveOutliersNode: failed to compute outlier bounds for "
                    "column '%s' (%s). Skipping column.", col, e
                )
                continue

        result = df[mask]

        if result.empty and not df.empty:
            logger.warning(
                "RemoveOutliersNode: outlier filtering removed all rows; "
                "returning original DataFrame instead to avoid destroying the dataset."
            )
            return df.copy()

        return result.reset_index(drop=True)