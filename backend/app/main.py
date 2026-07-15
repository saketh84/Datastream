# backend/app/main.py
import os
import io
import json
import traceback
import logging
from pathlib import Path
from fastapi import WebSocketDisconnect
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import uvicorn
import pandas as pd
import numpy as np
from fastapi.responses import StreamingResponse
from fastapi import WebSocket
from app.ai_agent import (
    create_agent_logic,
    execute_query,
    generate_cleaning_recommendations,
    initialize_live_chat_agent,
    ask_context_agent
)
from app.database_connector import router as db_router
from app.google_analytics import router as ga_router
from app.api_connector import router as api_router

from app.analysis_utils import (
    read_uploaded_file_to_df,
    get_kpis,
    get_actionable_insights,
    get_advanced_analytics,
    get_data_dictionary,
    get_column_distribution,
    get_time_series_data,
    get_table_data,
    get_data_health,
    get_correlation_matrix,
    perform_file_conversion,
    process_dataframe,
    generate_pdf_report,
    sanitize_data
)
from app.core.workflow.workflow import WorkflowExecutor
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_openai import ChatOpenAI



env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# DEBUG: Check if it actually loaded
print(f"DEBUG: Key found in env? {'Yes' if os.getenv('XAI_API_KEY') else 'No'}")


app = FastAPI(
    title="Data Analytics Platform API",
    description="API for processing files and running analytics dashboards & pipelines.",
    version="2.0.0"
)
app.include_router(
    ga_router,
    prefix="/api/v1"
)
app.include_router(
    db_router,
    prefix="/api/v1"
)

app.include_router(
    api_router,
    prefix="/api/v1"
)
origins = [
    "http://localhost:3000",  # Default React port
    "http://localhost:5173",  # Default Vite port
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# In-memory agent storage (keeps the last created agent)
# ----------------------------
agent_storage = {"agent": None}

# ----------------------------
# Pydantic model for agent query
# ----------------------------
class QueryRequest(BaseModel):
    question: str

# Replace the previous strict Pydantic model structure with this safe design:
class WorkflowRequest(BaseModel):
    operations: List[Any] = Field(default_factory=list)
    dataset: List[Any] = Field(default_factory=list)

class SyncAgentRequest(BaseModel):
    dataset: List[Any] = Field(default_factory=list)

# ----------------------------
# Endpoint 1: analyze file (unchanged logic, uses read_uploaded_file_to_df)
# ----------------------------

@app.post("/api/v1/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    col_dist_target: str = Form(None),
    col_time_target: str = Form(None)
):
    try:
        contents = await file.read()

        # Use your robust reader (handles csv/xlsx etc.)
        df = read_uploaded_file_to_df(contents, file.filename)

        # --- Run core analysis functions ---
        kpis = get_kpis(df)
        correlation_result = get_correlation_matrix(df)
        time_series_result = get_time_series_data(df, target_column=col_time_target)
        insights = get_actionable_insights(df, kpis, correlation_result['matrix'])

        # --- Generate advanced analytics (anomalies + forecast) ---
        advanced_data = {"anomalies": [], "forecast": []}
        if col_time_target:
            advanced_data = get_advanced_analytics(df, col_time_target)

        # --- Build response, injecting anomalies & forecast into kpiData ---
        response_data = {
            "kpiData": {
                **kpis,                                      # Spread existing KPIs
                "timeSeriesAnomalies": advanced_data["anomalies"], # Attach time series anomalies
                "forecast": advanced_data["forecast"]        # Attach forecast
            },
            "insights": insights,
            "dictionary": get_data_dictionary(df),
            "columnDist": get_column_distribution(df, target_column=col_dist_target),
            "timeSeries": time_series_result,
            "tableData": get_table_data(df),
            "dataHealth": get_data_health(df),
            "correlationMatrix": {
                "columns": correlation_result['columns'],
                "data": correlation_result['data']
            }
        }

        result_data = sanitize_data(response_data)
        return result_data

    except Exception as e:
        # Print full traceback to console for easier debugging in dev
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/get_recommendations")
async def get_recommendations(file: UploadFile = File(...)):
    """
    FastAPI endpoint that accepts the uploaded file, converts its 
    binary content into a Pandas DataFrame, and retrieves AI recommendations.
    """
    try:
        # 1. Read the raw binary content stream from the network
        file_contents = await file.read()
        
        # 2. Parse the bytes into a real Pandas DataFrame 
        # (This utility auto-detects if it is a CSV, XLS, or XLSX file)
        df = read_uploaded_file_to_df(file_contents, file.filename)
        
        # 3. Pass the parsed DataFrame directly into your recommendation engine
        recommendation_report = generate_cleaning_recommendations(df)
        
        return {
            "success": True, 
            "report": recommendation_report
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed processing dataset: {str(e)}")

# ----------------------------
# Endpoint 2: run workflow (pipeline builder)
# ----------------------------
# backend/app/main.py
@app.post("/api/v1/chat-with-context")
async def chat_with_context(
    message: str = Form(...), 
    context: str = Form(...) # This is the JSON string from our store
):
    try:
        # Instead of reading a file, we tell the AI what the data looks like
        # based on the analysis we ALREADY did.
        if not context:
            return {"reply": "No context provided."}
            
        parsed_context = json.loads(context)
        prompt = f"""
        The user is asking: "{message}"
        Based on this data context already analyzed:
        {parsed_context}
        
        Answer the question accurately. If you need to perform math, 
        refer to the KPIs provided in the context.
        """
        
        # Initialize LLM
        api_key = os.getenv("XAI_API_KEY")
        llm = ChatOpenAI(
            model="llama-3.3-70b-versatile",
            api_key=api_key,
            openai_api_base="https://api.groq.com/openai/v1",
            temperature=0
        )
        
        # We just use a standard Chat completion
        response = llm.invoke(prompt)
        return {"reply": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@app.post("/workflow/run/")
async def run_workflow(payload: WorkflowRequest):
    try:
        # 1. Ensure we got a valid, non-empty dataset
        if not payload.dataset:
            raise HTTPException(status_code=400, detail="The dataset sent to the workflow engine was empty.")

        # 2. Instantiate the sequential workflow executor engine
        executor = WorkflowExecutor(
            operations=payload.operations,
            raw_dataset=payload.dataset
        )
        
        # 3. Run sequential pipeline modifications
        transformed_df = executor.run()

        # 4. CRITICAL RE-INFERENCE FOR ANALYSIS
        # Ensures that newly transformed columns are recognized with the proper numeric/categorical types
        transformed_df = transformed_df.infer_objects()
        for col in transformed_df.columns:
            try:
                transformed_df[col] = pd.to_numeric(transformed_df[col], errors='raise')
            except Exception:
                pass

        # 5. Compute clean analytics matrices
        analysis_output = process_dataframe(transformed_df)

        # 6. Strip hazardous float states (NaN, Inf) out
        sanitized_result = sanitize_data(analysis_output)

        return {"success": True, "result": sanitized_result}

    except Exception as e:
        traceback.print_exc()
        logging.error(f"Sequential production switch-case pipeline run failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))





# backend/app/main.py

@app.post("/api/v1/chat")
async def chat_with_file(
    file: UploadFile = File(...), 
    message: str = Form(...) # Make sure this is 'message' or 'question'
):
    try:
        # 1. Read the file
        contents = await file.read()
        df = read_uploaded_file_to_df(contents, file.filename)
        
        # 2. Create the Grok agent logic
        initialize_live_chat_agent(df)
        
        # 3. Get the response
        answer = ask_context_agent(message)

        return {
            "status": "success",
            "reply": answer
        }
    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync_agent_data")
async def sync_agent_data(payload: SyncAgentRequest):
    try:
        if not payload.dataset:
            raise HTTPException(status_code=400, detail="Empty dataset payload received.")
            
        # Reconstruct DataFrame
        df = pd.DataFrame(payload.dataset)
        df = df.infer_objects()
        for col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='raise')
            except Exception:
                pass
                
        # Initialize the Langchain Pandas Dataframe Agent
        initialize_live_chat_agent(df)
        
        return {"success": True, "message": "Dashboard dataset successfully synced with AI Agent."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/sync_clean_data")
async def sync_clean_data(payload: SyncAgentRequest):
    return await sync_agent_data(payload)

@app.post("/query_agent")
async def handle_agent_query(request: QueryRequest):
    user_question = request.question

    try:
        answer = ask_context_agent(user_question)
        return {"answer": answer}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/api/v1/query_clean_agent")
async def handle_query_clean_agent(request: QueryRequest):
    return await handle_agent_query(request)
@app.post("/api/v1/convert")
async def convert_file(
    file: UploadFile = File(...),
    target_format: str = Form(...)
):
    try:
        # Read the uploaded file into memory
        content = await file.read()
        
        # Call the utility function
        converted_file_stream = perform_file_conversion(
            content, 
            file.filename, 
            target_format.lower()
        )
        
        # Map target format to proper download filename
        download_name = f"converted_{file.filename.split('.')[0]}.{target_format}"
        
        # Return as a stream so the browser triggers a download
        return StreamingResponse(
            converted_file_stream,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={download_name}"}
        )
        
    except Exception as e:
        print(f"Conversion Error: {str(e)}")
        return {"error": str(e)}, 400
# ----------------------------
# Root health endpoint
# ----------------------------
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            await websocket.send_json({
                "status": "connected"
            })

            await asyncio.sleep(5)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")

    except Exception as e:
        print(f"WebSocket Error: {e}")

    finally:
        try:
            await websocket.close()
        except:
            pass
@app.post("/api/v1/generate-report")
async def report_endpoint(payload: dict):
    try:
        # 1. Parse incoming dashboard state
        df = pd.DataFrame(payload['rawData'])
        kpi_data = payload.get('kpiData', [])
        health_data = payload.get('healthData', [])
        
        # 2. Generate PDF in memory
        pdf_buffer = generate_pdf_report(df, kpi_data, health_data)
        
        # 3. Stream back to user
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=Data_Analysis_Report.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"Report Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/v1/finalize")
async def finalize_and_download(file: UploadFile = File(...)):
    try:
        # 1. Read the file sent from the frontend
        df = pd.read_csv(file.file)
        
        # 2. (Optional) Perform one last 'Auto-Clean' if needed
        df = df.drop_duplicates()

        # 3. Create an in-memory buffer for the CSV
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        
        # 4. Convert String memory to Bytes memory for the response
        response = io.BytesIO(stream.getvalue().encode())
        
        return StreamingResponse(
            response,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cleaned_{file.filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/")
def read_root():
    return {"status": "Backend server is running!"}

# ----------------------------
# Run
# ----------------------------
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)