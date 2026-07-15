# app/core/workflow/node_base.py
from abc import ABC, abstractmethod
import pandas as pd

class NodeBase(ABC):
    """
    Abstract blueprint ensuring identical code signatures across distinct operational modules.
    """
    def __init__(self, node_id: str, node_type: str):
        self.node_id = node_id
        self.node_type = node_type

    @abstractmethod
    def execute(self, inputs: dict) -> pd.DataFrame:
        """
        Must ingest the input data frame dictionary layout, compute clean arrays,
        and return a mutated Pandas DataFrame structure.
        """
        pass