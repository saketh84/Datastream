import traceback
import pandas as pd
import requests

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.analysis_utils import process_dataframe

router = APIRouter()


class ApiRequest(BaseModel):
    api_url: str


@router.post("/api-source/analyze")
def analyze_api(req: ApiRequest):
    try:
        print("Fetching API Source:", req.api_url)

        # ----------------------------
        # 1. Fetch API response
        # ----------------------------
        response = requests.get(req.api_url)
        response.raise_for_status()
        data = response.json()

        print("API RESPONSE TYPE:", type(data))

        # ----------------------------
        # 2. Normalize JSON Structure Robustly
        # ----------------------------
        if isinstance(data, list):
            df = pd.json_normalize(data)
        elif isinstance(data, dict):
            # Safe parsing: explicit error handling only if 'error' key exists 
            # and is the ONLY or primary message block returned from the server.
            if "error" in data and len(data) <= 2:
                error_msg = data.get("error")
                if isinstance(error_msg, dict):
                    error_msg = error_msg.get("message", str(error_msg))
                raise ValueError(f"Target API Server Error Response: {error_msg}")
            
            df = pd.json_normalize([data])
        else:
            df = pd.json_normalize([data])

        print(f"DATAFRAME CREATED SUCCESSFULLY. Shape: {df.shape}")

        # ----------------------------
        # 3. Clean up complex structural nested list/dict fields
        # ----------------------------
        for col in df.columns:
            # Convert series to strings safely if items are dictionary or lists
            df[col] = df[col].apply(
                lambda x: str(x)
                if isinstance(x, (dict, list))
                else x
            )

        print("DATAFRAME OBJECT DE-NESTING COMPLETE")

        # Fallback safeguard for completely empty streams
        if df.empty or len(df.columns) == 0:
            raise ValueError("The provided API endpoint did not yield any parseable dataset tables.")

        # ----------------------------
        # 4. AUTOMATIC TARGET COLUMN SELECTION
        # ----------------------------
        detected_time_col = None
        detected_dist_col = None

        # Pass 1: Text-matching optimization
        for col in df.columns:
            col_lower = str(col).lower()
            if not detected_time_col and any(k in col_lower for k in ['date', 'time', 'timestamp', 'year', 'month', 'created']):
                detected_time_col = col
            if not detected_dist_col and any(k in col_lower for k in ['category', 'type', 'status', 'group', 'gender', 'role', 'name']):
                detected_dist_col = col

        # Pass 2: Timestamp parsing fallback checks
        if not detected_time_col and len(df.columns) > 0:
            for col in df.columns:
                try:
                    # Check first few rows if they match timestamp criteria
                    pd.to_datetime(df[col].dropna().iloc[:3], errors='raise')
                    detected_time_col = col
                    break
                except:
                    continue

        # Pass 3: Final safety values if nothing is found
        if not detected_time_col and len(df.columns) > 0:
            detected_time_col = df.columns[0]
        if not detected_dist_col and len(df.columns) > 0:
            detected_dist_col = df.columns[0]

        print(f"Auto-configured pipeline mappings -> Time Column: '{detected_time_col}', Distribution Column: '{detected_dist_col}'")

        # ----------------------------
        # 5. CORRELATION MATRIX CRASH MITIGATION SHIELD
        # ----------------------------
        # If the API yields predominantly text data (like the Country API), 
        # get_correlation_matrix drops all columns and misses the 'matrix' dictionary key.
        # We append temporary metrics tracking variables to satisfy analysis requirements.
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) < 2:
            print("Notice: Insufficient numeric data fields found for correlation. Injecting placeholder numeric tracking variables.")
            df['__analytical_index__'] = range(len(df))
            df['__metrics_scalar__'] = 1.0

        # ----------------------------
        # 6. Execute calculation analysis engines
        # ----------------------------
        result = process_dataframe(
            df, 
            col_dist_target=detected_dist_col, 
            col_time_target=detected_time_col
        )

        print("ANALYTICS ENGINE EXECUTED SUCCESSFULLY")
        return result

    except Exception as e:
        print("\n========== API CONNECTOR PIPELINE RUNTIME ERROR ==========")
        traceback.print_exc()
        print("==========================================================\n")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )