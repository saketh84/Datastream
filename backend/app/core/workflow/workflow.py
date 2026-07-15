# app/core/workflow/workflow.py
import pandas as pd
import logging

# Explicit operation node modules extraction
from app.core.workflow.operations.remove_empty_rows import RemoveEmptyRowsNode
from app.core.workflow.operations.remove_empty_columns import RemoveEmptyColumnsNode
from app.core.workflow.operations.remove_duplicates import RemoveDuplicatesNode
from app.core.workflow.operations.trim_whitespace import TrimWhitespaceNode
from app.core.workflow.operations.convert_data_types import ConvertDataTypesNode
from app.core.workflow.operations.convert_date_columns import ConvertDateColumnsNode
from app.core.workflow.operations.handle_missing_values import HandleMissingValuesNode
from app.core.workflow.operations.fill_missing_mean import FillMissingMeanNode
from app.core.workflow.operations.drop_missing_rows import DropMissingRowsNode
from app.core.workflow.operations.remove_constant_columns import RemoveConstantColumnsNode
from app.core.workflow.operations.remove_outliers import RemoveOutliersNode
from app.core.workflow.operations.encode_categorical import EncodeCategoricalNode
from app.core.workflow.operations.normalize_scale import NormalizeScaleNode

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    def __init__(self, operations: list, raw_dataset: list):
        self.operations = operations or []
        self.raw_dataset = raw_dataset

    def run(self) -> pd.DataFrame:
        """
        Builds working data matrices, then iteratively transforms them using a
        clean switch-case system mapping to operational class files.
        """
        if not self.raw_dataset:
            raise ValueError("No records found inside the payload dataset array context.")

        # Re-build matrix frame structure from JSON memory array items
        try:
            df = pd.DataFrame(self.raw_dataset)
        except Exception as e:
            raise ValueError(f"Failed to construct DataFrame from raw dataset: {e}")

        if df.empty:
            logger.warning("WorkflowExecutor: constructed DataFrame is empty; "
                            "skipping all pipeline operations.")
            return df

        # --- CRITICAL TYPE INFERENCE WORKAROUND ---
        # Forces Pandas to convert stringified numbers/nulls to their true datatypes
        df = df.infer_objects()
        for col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='raise')
            except Exception:
                pass
        # ------------------------------------------

        # Process each instruction array criteria step sequentially (FIFO order)
        for idx, op in enumerate(self.operations):
            step_id = f"step_{idx}_{op}"

            # Guard: if a previous step somehow zeroed out the DataFrame entirely,
            # stop running further operations against an empty frame.
            if df.empty:
                logger.warning(
                    "WorkflowExecutor: DataFrame became empty before step #%d ('%s'); "
                    "halting remaining pipeline steps.", idx + 1, op
                )
                break

            node_inputs = {"input_1": df}

            print(f"[PROCESS ENGINE] Executing Queue Sequence Step #{idx+1} -> Route: {op}")

            try:
                # Routing switch-case statement pattern matching to specific module wrappers
                match op:
                    case "remove_empty_rows":
                        node = RemoveEmptyRowsNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "remove_empty_columns":
                        node = RemoveEmptyColumnsNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "remove_empty_rows_cols":
                        node_rows = RemoveEmptyRowsNode(node_id=step_id + "_rows", node_type=op)
                        df = node_rows.execute(node_inputs)
                        node_cols = RemoveEmptyColumnsNode(node_id=step_id + "_cols", node_type=op)
                        df = node_cols.execute({"input_1": df})

                    case "remove_duplicates":
                        node = RemoveDuplicatesNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "trim_whitespace" | "clean_text" | "strip_whitespace":
                        node = TrimWhitespaceNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "convert_data_types":
                        node = ConvertDataTypesNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "convert_date_columns":
                        node = ConvertDateColumnsNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "handle_missing_values":
                        node = HandleMissingValuesNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "fill_missing_mean":
                        node = FillMissingMeanNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "drop_missing_rows":
                        node = DropMissingRowsNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "remove_constant_columns":
                        node = RemoveConstantColumnsNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "remove_outliers":
                        node = RemoveOutliersNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "encode_categorical":
                        node = EncodeCategoricalNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case "normalize_scale" | "scale_numeric":
                        node = NormalizeScaleNode(node_id=step_id, node_type=op)
                        df = node.execute(node_inputs)

                    case _:
                        logging.warning(f"Operation statement matching matrix rule '{op}' skipped.")

            except Exception as e:
                # A single bad step shouldn't crash the entire pipeline run silently —
                # log it clearly and re-raise so the caller (API layer) can report
                # exactly which step failed.
                logger.error(
                    "WorkflowExecutor: step #%d ('%s') failed: %s", idx + 1, op, e
                )
                raise RuntimeError(f"Pipeline failed at step #{idx+1} ('{op}'): {e}") from e

        return df