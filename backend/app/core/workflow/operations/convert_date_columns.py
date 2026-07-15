# app/core/workflow/operations/convert_date_columns.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class ConvertDateColumnsNode(NodeBase):
    """Detects columns that look like dates (by name hint or content) and
    converts them to pandas datetime, leaving unparseable columns untouched."""

    _NAME_HINTS = ("date", "time", "timestamp", "created", "updated", "dob")
    _MIN_PARSE_SUCCESS_RATIO = 0.8

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside ConvertDateColumnsNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"ConvertDateColumnsNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("ConvertDateColumnsNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()
        object_cols = df_copy.select_dtypes(include=["object"]).columns

        for col in object_cols:
            try:
                col_lower = str(col).lower()
                name_looks_like_date = any(hint in col_lower for hint in self._NAME_HINTS)

                series = df_copy[col]
                non_null_count = series.notna().sum()

                if non_null_count == 0:
                    continue

                parsed = pd.to_datetime(series, errors="coerce", utc=False)
                success_ratio = parsed.notna().sum() / non_null_count

                # Convert if either the column name strongly hints at a date
                # AND a reasonable portion parses, OR nearly everything parses
                # regardless of the name (catches unlabeled date columns).
                if (name_looks_like_date and success_ratio >= 0.5) or (
                    success_ratio >= self._MIN_PARSE_SUCCESS_RATIO
                ):
                    df_copy[col] = parsed
                    logger.info(
                        "ConvertDateColumnsNode: converted column '%s' to datetime "
                        "(%.0f%% parse success).", col, success_ratio * 100
                    )
            except Exception as e:
                logger.error(
                    "ConvertDateColumnsNode: failed to parse column '%s' as date (%s). "
                    "Leaving column unchanged.", col, e
                )
                continue

        return df_copy