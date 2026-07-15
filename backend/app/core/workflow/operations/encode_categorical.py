# app/core/workflow/operations/encode_categorical.py
import pandas as pd
import logging
from app.core.workflow.node_base import NodeBase

logger = logging.getLogger(__name__)


class EncodeCategoricalNode(NodeBase):
    """
    One-hot encodes categorical (object/category) columns with a manageable
    number of unique values. Columns with too much cardinality are left
    untouched (one-hot encoding them would explode the column count).
    """

    _MAX_UNIQUE_FOR_ENCODING = 30

    def execute(self, inputs: dict) -> pd.DataFrame:
        df = inputs.get("input_1")

        if df is None:
            raise ValueError(
                "Execution context missing DataFrame reference inside EncodeCategoricalNode."
            )
        if not isinstance(df, pd.DataFrame):
            raise TypeError(
                f"EncodeCategoricalNode expected a pandas DataFrame, got {type(df).__name__}."
            )
        if df.empty:
            logger.info("EncodeCategoricalNode: received empty DataFrame, returning as-is.")
            return df.copy()

        categorical_cols = df.select_dtypes(include=["object", "category"]).columns

        if len(categorical_cols) == 0:
            logger.info("EncodeCategoricalNode: no categorical columns found; nothing to encode.")
            return df.copy()

        cols_to_encode = []
        for col in categorical_cols:
            try:
                n_unique = df[col].nunique(dropna=True)
                if 0 < n_unique <= self._MAX_UNIQUE_FOR_ENCODING:
                    cols_to_encode.append(col)
                else:
                    logger.info(
                        "EncodeCategoricalNode: column '%s' has %d unique values "
                        "(limit %d); skipping to avoid column explosion.",
                        col, n_unique, self._MAX_UNIQUE_FOR_ENCODING
                    )
            except TypeError:
                logger.warning(
                    "EncodeCategoricalNode: column '%s' contains unhashable values; "
                    "skipping encoding for this column.", col
                )
                continue

        if not cols_to_encode:
            logger.info("EncodeCategoricalNode: no columns eligible for encoding.")
            return df.copy()

        try:
            encoded_df = pd.get_dummies(
                df, columns=cols_to_encode, dummy_na=False, drop_first=False
            )
        except Exception as e:
            logger.error(
                "EncodeCategoricalNode: one-hot encoding failed (%s). "
                "Returning original DataFrame unchanged.", e
            )
            return df.copy()

        return encoded_df