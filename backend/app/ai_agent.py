import os
import pandas as pd
from dotenv import load_dotenv
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# 1. Global storage for our single-user workspace
ACTIVE_PANDAS_DF = None
PANDAS_AGENT = None
# This stores the list of past messages in our server's memory
CHAT_MEMORY = InMemoryChatMessageHistory()

def initialize_live_chat_agent(df: pd.DataFrame):
    """
    Called immediately after your Preprocessing Pipeline finishes.
    This saves the cleaned DataFrame and initializes our smart agent.
    """
    global ACTIVE_PANDAS_DF, PANDAS_AGENT, CHAT_MEMORY
    
    ACTIVE_PANDAS_DF = df
    # Clear memory when a new dataset is synchronized
    CHAT_MEMORY.clear()
    
    api_key = os.getenv("XAI_API_KEY")
    llm = ChatOpenAI(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        openai_api_base="https://api.groq.com/openai/v1",
        temperature=0.1
    )
    
    # We create the standard LangChain Pandas agent
    base_agent = create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        agent_type="tool-calling",
        allow_dangerous_code=True,
        handle_parsing_errors=True
    )

    # Wrap the agent with a message history handler to make it context-aware
    PANDAS_AGENT = RunnableWithMessageHistory(
        base_agent,
        get_session_history=lambda session_id: CHAT_MEMORY,
        input_messages_key="input",
        history_messages_key="chat_history"
    )

def ask_context_agent(question: str) -> str:
    """
    Queries the agent. Because of RunnableWithMessageHistory,
    the agent automatically reads past conversation context before answering.
    """
    global PANDAS_AGENT
    if PANDAS_AGENT is None:
        return "No active clean dataset found. Please load your clean data first!"
    
    try:
        # We pass a dummy session_id since we are tracking a single session in memory
        response = PANDAS_AGENT.invoke(
            {"input": question},
            config={"configurable": {"session_id": "single_user_session"}}
        )
        
        # Extract the text answer
        if isinstance(response, dict):
            return response.get("output", str(response))
        return str(response)
    except Exception as e:
        return f"AI calculation error: {str(e)}"

# Keep backward-compatible helper functions
def create_agent_logic(df: pd.DataFrame):
    api_key = os.getenv("XAI_API_KEY") 
    llm = ChatOpenAI(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        openai_api_base="https://api.groq.com/openai/v1",
        temperature=0
    )
    return create_pandas_dataframe_agent(
        llm,
        df,
        verbose=True,
        agent_type="tool-calling", 
        allow_dangerous_code=True,
        handle_parsing_errors=True
    )

def execute_query(agent, question: str):
    try:
        if agent is None:
            return "Agent not initialized."
        response = agent.invoke({"input": question})
        if isinstance(response, dict):
            result = response.get("output", "")
        else:
            result = str(response)
        if not result or result.strip() == "":
            return "The agent ran successfully but returned no output. Try rephrasing your question."
        return result
    except Exception as e:
        return f"AI Error: {str(e)}"

def generate_dashboard_insights(df):
    from app.analysis_utils import extract_dataset_context
    context = extract_dataset_context(df)
    
    prompt = f"""
    You are a Senior Data Scientist. Analyze the following data context:
    {context}
    
    1. Identify the top 3 KPIs.
    2. Spot any anomalies or outliers in the trends.
    3. Suggest a data cleaning pipeline (e.g., handles nulls in specific columns).
    4. Provide an executive summary for a non-tech manager.
    """
    api_key = os.getenv("XAI_API_KEY") 
    llm = ChatOpenAI(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        openai_api_base="https://api.groq.com/openai/v1",
        temperature=0
    )
    response = llm.invoke(prompt)
    return response

def generate_cleaning_recommendations(df: pd.DataFrame) -> list:
    from app.analysis_utils import extract_dataset_context
    import json
    context = extract_dataset_context(df)
    
    prompt = f"""
    You are an expert Data Quality Agent. Analyze the following data context:
    {context}
    
    Identify data quality issues (missing values, outliers, duplicate rows, incorrect data types, constant columns, non-standard text/whitespaces).
    
    Choose which of the following operations are recommended to clean the dataset:
    - remove_empty_rows_cols
    - remove_duplicates
    - trim_whitespace
    - convert_data_types
    - convert_date_columns
    - handle_missing_values
    - remove_constant_columns
    - remove_outliers
    - encode_categorical
    - normalize_scale
    
    You MUST respond with a valid JSON array of recommendation objects. Each object in the array MUST contain exactly these keys:
    - "operation": string (one of the recommended operations listed above, e.g. "remove_duplicates")
    - "description": string (brief summary of what it does)
    - "severity": string ("High", "Medium", or "Low")
    - "recommended": boolean (true or false)
    - "reason": string (specific reason explaining why this operation is recommended for this dataset based on the data context)
    - "example": string (example of the effect, optional)
    - "warning": string (warning about data loss or structural changes, optional)

    Do NOT include any introduction, explanation, or markdown code block other than the raw JSON array.
    """
    api_key = os.getenv("XAI_API_KEY") 
    llm = ChatOpenAI(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        openai_api_base="https://api.groq.com/openai/v1",
        temperature=0
    )
    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
        report = json.loads(content)
        if not isinstance(report, list):
            report = []
        return report
    except Exception as e:
        logger.error(f"Failed to generate/parse LLM recommendations: {e}")
        # Standard bulletproof fallback
        return [
            {
                "operation": "remove_duplicates",
                "description": "Delete duplicate rows from the dataset.",
                "severity": "High",
                "recommended": True,
                "reason": "Removing duplicates ensures statistical models are not biased by redundant observations."
            },
            {
                "operation": "remove_empty_rows_cols",
                "description": "Drop empty rows and columns.",
                "severity": "High",
                "recommended": True,
                "reason": "Dropping empty rows and columns cleans up the dataset structure."
            }
        ]