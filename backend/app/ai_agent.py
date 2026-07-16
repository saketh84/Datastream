import os
import logging
import pandas as pd
from dotenv import load_dotenv
from pathlib import Path
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Global variables for rate-limit fallbacks and state
USE_FALLBACK_MODEL = False

def get_active_groq_llm(api_key: str, temperature: float = 0.0, is_langchain_groq: bool = False, model_kwargs: dict = None):
    """
    Returns ChatOpenAI or ChatGroq using either the primary model
    or falling back to a lightweight model if rate limited.
    """
    global USE_FALLBACK_MODEL
    primary_model = "llama-3.3-70b-versatile"
    fallback_model = "llama-3.1-8b-instant"
    
    selected_model = fallback_model if USE_FALLBACK_MODEL else primary_model
    
    kwargs = {}
    if model_kwargs:
        kwargs["model_kwargs"] = model_kwargs
        
    if is_langchain_groq:
        from langchain_groq import ChatGroq
        return ChatGroq(model=selected_model, groq_api_key=api_key, temperature=temperature, **kwargs)
    else:
        return ChatOpenAI(
            model=selected_model,
            api_key=api_key,
            openai_api_base="https://api.groq.com/openai/v1",
            temperature=temperature,
            **kwargs
        )

def mark_fallback_active():
    """Toggles global fallback model mode."""
    global USE_FALLBACK_MODEL
    if not USE_FALLBACK_MODEL:
        logger.warning("Switching global fallback mode to True (using llama-3.1-8b-instant).")
        USE_FALLBACK_MODEL = True

def clean_and_parse_json(content: str):
    import json
    content = content.strip()
    
    # Strip markdown fences if present
    if content.startswith("```"):
        lines = content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()
        
    # Extract the first outer JSON object/array if needed
    if not ((content.startswith("{") and content.endswith("}")) or (content.startswith("[") and content.endswith("]"))):
        start_brace = content.find("{")
        start_bracket = content.find("[")
        start_idx = -1
        end_idx = -1
        
        # Determine if it's an object or array
        if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
            start_idx = start_brace
            end_idx = content.rfind("}")
        elif start_bracket != -1:
            start_idx = start_bracket
            end_idx = content.rfind("]")
            
        if start_idx != -1 and end_idx != -1:
            content = content[start_idx:end_idx+1]
            
    # Try parsing normally
    try:
        return json.loads(content)
    except json.JSONDecodeError as decode_err:
        # Fallback to ast.literal_eval for single quotes or unescaped control chars
        try:
            import ast
            parsed = ast.literal_eval(content)
            if isinstance(parsed, (dict, list)):
                return parsed
        except Exception:
            pass
        raise decode_err

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
    llm = get_active_groq_llm(api_key, temperature=0.1)
    
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
    Self-heals and retries with the fallback model if a rate limit error is encountered.
    """
    global PANDAS_AGENT, ACTIVE_PANDAS_DF, CHAT_MEMORY
    if PANDAS_AGENT is None:
        return "No active clean dataset found. Please load your clean data first!"
    
    api_key = os.getenv("XAI_API_KEY")
    
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
        logger.warning(f"Primary agent execution failed: {e}")
        err_msg = str(e).lower()
        if "rate_limit" in err_msg or "429" in err_msg or "rate limit" in err_msg:
            mark_fallback_active()
            try:
                logger.info("Re-initializing agent with fallback model and retrying...")
                llm = get_active_groq_llm(api_key, temperature=0.1)
                base_agent = create_pandas_dataframe_agent(
                    llm,
                    ACTIVE_PANDAS_DF,
                    verbose=True,
                    agent_type="tool-calling",
                    allow_dangerous_code=True,
                    handle_parsing_errors=True
                )
                PANDAS_AGENT = RunnableWithMessageHistory(
                    base_agent,
                    get_session_history=lambda session_id: CHAT_MEMORY,
                    input_messages_key="input",
                    history_messages_key="chat_history"
                )
                
                # Retry invocation
                response = PANDAS_AGENT.invoke(
                    {"input": question},
                    config={"configurable": {"session_id": "single_user_session"}}
                )
                if isinstance(response, dict):
                    return response.get("output", str(response))
                return str(response)
            except Exception as retry_e:
                return f"AI calculation error (fallback retry failed): {str(retry_e)}"
        return f"AI calculation error: {str(e)}"

# Keep backward-compatible helper functions
def create_agent_logic(df: pd.DataFrame):
    api_key = os.getenv("XAI_API_KEY") 
    llm = get_active_groq_llm(api_key, temperature=0)
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
    try:
        llm = get_active_groq_llm(api_key, temperature=0)
        response = llm.invoke(prompt)
        return response
    except Exception as e:
        logger.warning(f"generate_dashboard_insights failed: {e}")
        err_msg = str(e).lower()
        if "rate_limit" in err_msg or "429" in err_msg or "rate limit" in err_msg:
            mark_fallback_active()
        llm = get_active_groq_llm(api_key, temperature=0)
        return llm.invoke(prompt)

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
    
    content = ""
    try:
        llm = get_active_groq_llm(api_key, temperature=0, model_kwargs={"response_format": {"type": "json_object"}})
        response = llm.invoke(prompt)
        content = response.content.strip()
    except Exception as e:
        logger.warning(f"generate_cleaning_recommendations failed: {e}")
        err_msg = str(e).lower()
        if "rate_limit" in err_msg or "429" in err_msg or "rate limit" in err_msg:
            mark_fallback_active()
        try:
            llm = get_active_groq_llm(api_key, temperature=0, model_kwargs={"response_format": {"type": "json_object"}})
            response = llm.invoke(prompt)
            content = response.content.strip()
        except Exception as retry_e:
            logger.error(f"generate_cleaning_recommendations fallback failed: {retry_e}")
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
            
    try:
        report = clean_and_parse_json(content)
        if not isinstance(report, list):
            report = []
        return report
    except Exception as e:
        logger.error(f"Failed to parse LLM recommendations content: {e}")
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