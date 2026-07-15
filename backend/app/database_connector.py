import traceback
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, inspect, text
from app.analysis_utils import process_dataframe

router = APIRouter()

class DbRequest(BaseModel):
    host: str
    port: int
    username: str
    password: str
    database: str

@router.post("/database/analyze")
def analyze_database(req: DbRequest):
    try:
        # --- TEST FALLBACK: If user inputs "sqlite" or "local_test", use an in-memory DB ---
        if req.host.lower() in ["sqlite", "local_test", "test"]:
            print("System Alert: Using local mock SQLite instance for pipeline testing.")
            engine = create_engine("sqlite:///:memory:")
            
            # Create a mock table instantly so your pipeline functions work flawlessly
            mock_data = pd.DataFrame({
                "Date": pd.date_range(start="2026-01-01", periods=10, freq="D"),
                "Category": ["Electronics", "Clothing", "Electronics", "Home", "Clothing"] * 2,
                "Sales": [150.0, 80.5, 210.0, 45.0, 95.0, 300.0, 110.0, 55.0, 400.0, 85.0],
                "Quantity": [3, 2, 5, 1, 2, 7, 3, 1, 8, 2]
            })
            mock_data.to_sql("sales_report", engine, index=False)
        else:
            # Standard production route for PostgreSQL connections
            connection_string = f"postgresql://{req.username}:{req.password}@{req.host}:{req.port}/{req.database}"
            engine = create_engine(connection_string)
        
        # Discover tables dynamically
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if not tables:
            raise ValueError("Connection established successfully, but no tables exist in this schema.")
        
        target_table = tables[0]
        print(f"Database Connected! Reading from table target: '{target_table}'")
        
        # Read data from the detected table
        df = pd.read_sql(f'SELECT * FROM "{target_table}" LIMIT 1000', engine)
        
        if df.empty:
            raise ValueError(f"Target table '{target_table}' contains no parseable data records.")
            
        # Clear complex structural dictionary elements
        for col in df.columns:
            df[col] = df[col].apply(lambda x: str(x) if isinstance(x, (dict, list)) else x)
            
        # Execute the calculation analysis dashboard engine
        result = process_dataframe(df)
        print("DATABASE ANALYTICS PIPELINE RUN SUCCESSFUL")
        return result

    except Exception as e:
        print("\n========== DATABASE CONNECTOR PIPELINE RUNTIME ERROR ==========")
        traceback.print_exc()
        print("==============================================================\n")
        raise HTTPException(status_code=500, detail=str(e))