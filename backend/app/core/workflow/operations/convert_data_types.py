# app/core/workflow/operations/convert_data_types.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class ConvertDataTypesNode(NodeBase):
    """Attempts to infer and coerce the best-fit dtype for each column:
    numeric first, then boolean, falling back to string/object if neither fits."""

    _BOOL_MAP = {
        "true": True, "false": False,
        "yes": True, "no": False,
        "1": True, "0": False,
        "t": True, "f": False,
    }

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside ConvertDataTypesNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"ConvertDataTypesNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("ConvertDataTypesNode: received empty DataFrame, returning as-is.")
            return df.copy()

        df_copy = df.copy()

        for col in df_copy.columns:
            series = df_copy[col]

            # Skip columns that are already a proper non-object dtype
            if series.dtype != object:
                continue

            try:
                # 1. Try numeric coercion
                numeric_attempt = pd.to_numeric(series, errors="coerce")
                non_null_original = series.notna().sum()
                non_null_converted = numeric_attempt.notna().sum()

                # Only accept the numeric conversion if it didn't wipe out
                # a significant chunk of valid data (guards against false positives)
                if non_null_original > 0 and non_null_converted / non_null_original >= 0.9:
                    df_copy[col] = numeric_attempt
                    continue

                # 2. Try boolean coercion for common true/false-like strings
                lowered = series.dropna().astype(str).str.strip().str.lower()
                if len(lowered) > 0 and lowered.isin(self._BOOL_MAP.keys()).all():
                    df_copy[col] = series.apply(
                        lambda x: self._BOOL_MAP.get(str(x).strip().lower())
                        if pd.notna(x) else x
                    )
                    continue

                # 3. Leave as-is (string/object) if nothing else fits

            except Exception as e:
                logger.error(
                    "ConvertDataTypesNode: failed to infer dtype for column '%s' (%s). "
                    "Leaving column unchanged.", col, e
                )
                continue

        return df_copy