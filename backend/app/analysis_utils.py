import warnings
import pandas as pd
import numpy as np
import io
import json
from pathlib import Path
from statsmodels.tsa.arima.model import ARIMA
from reportlab.lib.pagesizes import letter
import math

# Suppress the statsmodels SARIMAX "too few observations" UserWarning.
# This fires whenever seasonal ARMA starting parameters can't be estimated.
# We handle this gracefully in code by falling back to plain ARIMA.
warnings.filterwarnings(
    "ignore",
    message="Too few observations to estimate starting parameters",
    category=UserWarning,
    module="statsmodels",
)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
def sanitize_data(obj):

    

    if isinstance(obj, dict):

        return {
            k: sanitize_data(v)
            for k, v in obj.items()
        }

    elif isinstance(obj, list):

        return [
            sanitize_data(v)
            for v in obj
        ]

    elif isinstance(obj, tuple):

        return tuple(
            sanitize_data(v)
            for v in obj
        )

    elif isinstance(obj, (np.integer,)):

        return int(obj)

    elif isinstance(obj, (np.floating,)):

        if math.isnan(obj) or math.isinf(obj):
            return None

        return float(obj)

    elif isinstance(obj, (pd.Timestamp,)):

        return obj.isoformat()

    elif pd.isna(obj):

        return None

    return obj
def read_uploaded_file_to_df(file_contents: bytes, file_name: str) -> pd.DataFrame:
    """
    Reads a file's contents into a pandas DataFrame, automatically
    detecting the file type from its extension.
    """
    extension = Path(file_name).suffix.lower()
    
    try:
        if extension == '.csv':
            try:
                # Try standard utf-8
                df = pd.read_csv(io.StringIO(file_contents.decode('utf-8')))
            except UnicodeDecodeError:
                # Fallback to latin-1
                df = pd.read_csv(io.StringIO(file_contents.decode('latin-1')))
        
        elif extension in ['.xls', '.xlsx']:
            # Excel files must be read from bytes
            # Determine the engine to use
            if extension == '.xlsx':
                engine = 'openpyxl'
            else:
                # For .xls files, try to use xlrd, but fallback to openpyxl or None
                engine = None
                try:
                    import xlrd
                    engine = 'xlrd'
                except ImportError:
                    # xlrd not installed, try openpyxl or let pandas choose
                    engine = 'openpyxl'  # openpyxl can sometimes handle .xls
            
            # Try multiple approaches to read the Excel file
            df = None
            last_error = None
            
            # Approach 1: Try reading with header=0 (standard approach)
            try:
                buffer = io.BytesIO(file_contents)
                read_params = {
                    'io': buffer,
                    'sheet_name': 0,
                    'header': 0,
                }
                if engine:
                    read_params['engine'] = engine
                    
                df = pd.read_excel(**read_params)
            except Exception as e1:
                last_error = e1
                # Approach 2: Try reading without header, then detect it
                try:
                    buffer = io.BytesIO(file_contents)
                    read_params = {
                        'io': buffer,
                        'sheet_name': 0,
                        'header': None,  # No header
                    }
                    if engine:
                        read_params['engine'] = engine
                    else:
                        # Try without engine specification
                        pass
                    
                    df_temp = pd.read_excel(**read_params)
                    
                    # Find first row with substantial data (likely the header)
                    header_idx = 0
                    max_cols = len(df_temp.columns) if len(df_temp.columns) > 0 else 1
                    for idx in range(min(10, len(df_temp))):  # Check first 10 rows
                        row = df_temp.iloc[idx]
                        non_null = row.notna().sum()
                        if non_null >= max(2, max_cols * 0.3):  # At least 30% filled or 2 columns
                            header_idx = idx
                            break
                    
                    # Use the detected header row
                    if header_idx >= 0 and header_idx < len(df_temp):
                        # Set the header row - safely get column values
                        header_row = df_temp.iloc[header_idx]
                        new_columns = []
                        for i, val in enumerate(header_row):
                            if pd.notna(val) and str(val).strip():
                                new_columns.append(str(val).strip())
                            else:
                                new_columns.append(f'Unnamed_{i}')
                        df_temp.columns = new_columns[:len(df_temp.columns)]
                        # Skip the header row and any rows before it
                        if header_idx + 1 < len(df_temp):
                            df = df_temp.iloc[header_idx + 1:].copy().reset_index(drop=True)
                        else:
                            df = df_temp.iloc[header_idx:].copy().reset_index(drop=True)
                    else:
                        df = df_temp.copy()
                    last_error = None
                except Exception as e2:
                    last_error = e2
                    # Approach 3: Try with openpyxl engine regardless of extension
                    try:
                        buffer = io.BytesIO(file_contents)
                        df = pd.read_excel(
                            buffer,
                            sheet_name=0,
                            header=0,
                            engine='openpyxl'
                        )
                        last_error = None
                    except Exception as e3:
                        last_error = e3
                        # Approach 4: Try without specifying engine (let pandas decide)
                        try:
                            buffer = io.BytesIO(file_contents)
                            df = pd.read_excel(
                                buffer,
                                sheet_name=0,
                                header=0
                            )
                            last_error = None
                        except Exception as e4:
                            last_error = e4
            
            if df is None:
                error_msg = str(last_error) if last_error else "Unknown error"
                # Provide more helpful error message
                if 'tokenizing' in error_msg.lower():
                    raise ValueError(
                        f"Error reading Excel file '{file_name}'. The file may have formatting issues "
                        f"such as merged cells, inconsistent rows, or empty header rows. "
                        f"Please check the file structure. Original error: {error_msg}"
                    )
                else:
                    raise ValueError(
                        f"Error reading Excel file '{file_name}': {error_msg}. "
                        f"Please ensure the file is a valid Excel file (.xls or .xlsx) and not corrupted."
                    )
            
            # Clean up the dataframe: remove completely empty rows and columns
            df = df.dropna(how='all').dropna(axis=1, how='all')
            
            # If dataframe is empty after cleanup, the file might have issues
            if df.empty:
                raise ValueError("Excel file appears to be empty or contains no valid data rows.")
            
            # Reset index
            df = df.reset_index(drop=True)
            
            # Ensure column names are valid (no NaN column names, handle duplicates)
            new_columns = []
            seen = {}
            for i, col in enumerate(df.columns):
                col_str = str(col).strip() if pd.notna(col) else f'Unnamed_{i}'
                if col_str == '' or col_str == 'nan':
                    col_str = f'Unnamed_{i}'
                # Handle duplicate column names
                if col_str in seen:
                    count = seen[col_str]
                    seen[col_str] = count + 1
                    col_str = f'{col_str}_{count}'
                else:
                    seen[col_str] = 1
                new_columns.append(col_str)
            df.columns = new_columns
        
        elif extension == '.json':
            # JSON is text
            df = pd.read_json(io.StringIO(file_contents.decode('utf-8')))
        
        elif extension == '.parquet':
            # Parquet is binary
            df = pd.read_parquet(io.BytesIO(file_contents))
            
        elif extension == '.feather':
            # Feather is binary
            df = pd.read_feather(io.BytesIO(file_contents))
            
        elif extension == '.h5':
            # HDF5 is binary
            df = pd.read_hdf(io.BytesIO(file_contents))
            
        else:
            raise ValueError(f"Unsupported file type: {extension}")
        
        # Final validation: ensure we have a valid dataframe
        if df.empty:
            raise ValueError("The file appears to be empty or contains no valid data.")
        
        return df
        
    except ValueError:
        # Re-raise ValueError as-is (these are our custom errors)
        raise
    except Exception as e:
        print(f"Error reading {file_name}: {e}")
        import traceback
        traceback.print_exc()
        # Re-raise the error so the frontend can see it
        raise ValueError(f"Error analyzing file: {str(e)}")



# --- Helper function for finding anomalies ---
def get_anomalies(df, numeric_col):
    """Finds anomalies in a numeric column using the IQR method."""
    dtype_str = str(df[numeric_col].dtype).lower()
    if 'int' not in dtype_str and 'float' not in dtype_str:
        return [] # Can't find anomalies in non-numeric data
        
    Q1 = df[numeric_col].quantile(0.25)
    Q3 = df[numeric_col].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    anomalies = df[(df[numeric_col] < lower_bound) | (df[numeric_col] > upper_bound)]
    
    # Format for the insights panel
    return [
        f"Found {len(anomalies)} anomalies (outliers) in '{numeric_col}'."
    ]

# --- Helper function for finding correlations ---
def get_correlations(correlation_matrix):
    """Finds strong correlations from the matrix."""
    correlations = []
    for col in correlation_matrix:
        for idx in correlation_matrix.index:
            if col != idx and abs(correlation_matrix.loc[idx, col]) > 0.75:
                corr_value = correlation_matrix.loc[idx, col]
                corr_type = "positive" if corr_value > 0 else "negative"
                insight = f"Found a strong {corr_type} correlation ({corr_value:.2f}) between '{idx}' and '{col}'."
                # Add insight only once (avoid duplicates)
                if not any(f"between '{col}' and '{idx}'" in s for s in correlations):
                     correlations.append(insight)
    return correlations

def get_kpis(df):
    """Calculates all the Key Performance Indicators."""
    # Force column type inference locally just in case
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col], errors='raise')
        except Exception:
            pass

    total_records = int(len(df))
    
    total_cells = int(np.prod(df.shape))
    missing_values = int(df.isnull().sum().sum())
    valid_cells = total_cells - missing_values
    data_quality_score = float((valid_cells / total_cells) * 100 if total_cells > 0 else 0)
    
    total_columns = int(len(df.columns))
    numeric_cols = df.select_dtypes(include=np.number).columns
    categorical_cols = df.select_dtypes(include='object').columns
    
    anomalies = int(df.duplicated().sum())
    anomalies_percent = float((anomalies / total_records) * 100 if total_records > 0 else 0)

    # Find age and gender columns dynamically
    age_col = next((c for c in df.columns if c.lower() == 'age'), None)
    gender_col = next((c for c in df.columns if c.lower() == 'gender'), None)

    # Calculate Average Age
    if age_col is not None and not df[age_col].dropna().empty:
        avg_age = float(df[age_col].mean())
    else:
        avg_age = 0.0

    # Calculate Top Category Gender safely
    if gender_col is not None and not df[gender_col].dropna().empty:
        # Get the top value count string index directly instead of returning the series object
        top_gender = str(df[gender_col].value_counts().index[0])
    else:
        top_gender = "N/A"

    return {
        "totalRecords": f"{total_records:,}",
        "totalRecordsDelta": "Uploaded file",
        "dataQuality": f"{data_quality_score:.1f}%",
        "dataQualityDelta": f"{missing_values:,} missing",
        "columns": f"{total_columns}",
        "columnsDelta": f"{len(categorical_cols)} Cat, {len(numeric_cols)} Num",
        "anomalies": f"{anomalies:,}",
        "anomaliesDelta": f"{anomalies_percent:.1f}% duplicate",
        "anomaliesDeltaType": "negative" if anomalies > 0 else "positive",
        "average_age": round(avg_age, 1),
        "top_gender": top_gender,
        "unique_fields": int(len(df.columns))
    }

# --- UPGRADED FUNCTION ---
def get_actionable_insights(df, kpis, correlation_matrix):
    """Generates simple text-based insights."""
    insights = [
        {"id": "i1", "insight": f"Analysis complete for {kpis['totalRecords']} records."},
        {"id": "i2", "insight": f"Data Quality Score is {kpis['dataQuality']}. Check 'Data Health' for details on missing values."},
    ]
    if int(kpis['anomalies'].replace(',', '')) > 0:
        insights.append({"id": "i3", "insight": f"Found {kpis['anomalies']} duplicate rows. Recommend running 'Deduplication' process."})
    
    # --- New AI Insights ---
    # 1. Add Correlation Insights
    corr_insights = get_correlations(correlation_matrix)
    for i, insight in enumerate(corr_insights, 1):
        insights.append({"id": f"c{i}", "insight": insight})

    # 2. Add Anomaly Insights (check first 2 numeric columns)
    numeric_cols = df.select_dtypes(include=np.number).columns
    for i, col in enumerate(numeric_cols[:2]):
        anomaly_insights = get_anomalies(df, col)
        for j, insight in enumerate(anomaly_insights, 1):
            insights.append({"id": f"a{i}{j}", "insight": insight})
            
    return insights

# --- Original Function (Unchanged) ---
def get_data_dictionary(df):
    """Generates a list of all columns, their types, and missing %."""
    dictionary = []
    total_records = len(df)
    for col in df.columns:
        col_type = str(df[col].dtype)
        missing_count = df[col].isnull().sum()
        missing_percent = (missing_count / total_records) * 100 if total_records > 0 else 0
        
        dictionary.append({
            "id": col,
            "columnName": col,
            "columnType": col_type,
            "metric": f"{missing_percent:.1f}% missing"
        })
    return dictionary

# --- Original Function (Unchanged) ---
def get_column_distribution(df, target_column=None):
    if df.empty or len(df.columns) == 0:
        return {"columnName": "N/A", "chartData": []}
    
    col_to_analyze = target_column
    
    if col_to_analyze is None:
        categorical_cols = df.select_dtypes(include='object').columns
        if len(categorical_cols) > 0:
            col_to_analyze = categorical_cols[0]
        else:
            col_to_analyze = df.columns[0]
    
    if col_to_analyze not in df.columns:
        raise ValueError(f"Column '{col_to_analyze}' not found in file.")

    counts = df[col_to_analyze].value_counts().nlargest(10).to_dict()
    chart_data = [{"name": str(key), "value": int(val)} for key, val in counts.items()]
    
    return {
        "columnName": col_to_analyze,
        "chartData": chart_data
    }

# --- FORECASTING FUNCTION ---
def get_forecasting(monthly_data):
    """Generates a 12-month forecast using plain ARIMA(1,1,1).

    Seasonal ARIMA (SARIMA) has been intentionally avoided here: it requires
    2-3 full seasonal cycles (24-36+ months) to estimate starting parameters,
    and emits a UserWarning when that threshold isn't met. Plain ARIMA is
    reliable, warning-free, and accurate enough for monthly business forecasts.
    """
    # Require at least 12 data points for a stable ARIMA fit
    if len(monthly_data) < 12:
        return []

    try:
        # Ensure the Series carries an explicit DatetimeIndex frequency
        monthly_data = monthly_data.asfreq('ME')

        model = ARIMA(monthly_data, order=(1, 1, 1))
        model_fit = model.fit()

        forecast = model_fit.forecast(steps=12)

        return [
            {"name": date.strftime('%Y-%m-%d'), "value": float(f_val)}
            for date, f_val in forecast.items()
        ]

    except Exception as e:
        print(f"[get_forecasting] Error during forecasting: {e}")
        return []

# --- UPGRADED FUNCTION ---
# ... (all your other functions like get_kpis, get_forecasting, etc. are fine) ...

# ... (keep all your other functions like get_kpis, get_anomalies, etc.) ...

# --- REPLACE THIS ENTIRE FUNCTION ---
def get_time_series_data(df, target_column=None):
    """
    Finds the first datetime column (or uses target_column) and aggregates by month.
    Returns actual series, forecast series, and combined x-axis labels.
    """
    if df.empty:
        return {"timeColumn": None, "seriesData": [], "xAxisData": [], "forecastData": []}

    date_col = target_column

    # --- AUTO-GUESS LOGIC ---
    if date_col is None:
        # First, look for column names that contain "date" or "time"
        for col in df.columns:
            if 'date' in col.lower() or 'time' in col.lower():
                try:
                    temp_col = pd.to_datetime(df[col], errors='coerce')
                    if not temp_col.isnull().all() and temp_col.nunique() > 1:
                        date_col = col
                        df[date_col] = temp_col
                        break
                except Exception:
                    continue

        # If still not found, try converting all object columns
        if date_col is None:
            for col in df.select_dtypes(include='object').columns:
                try:
                    temp_col = pd.to_datetime(
                      df[col],
                      errors='coerce',
                      format='mixed'
                    )
                    if not temp_col.isnull().all() and temp_col.nunique() > 1:
                        date_col = col
                        df[date_col] = temp_col
                        break
                except Exception:
                    continue
    else:
        if target_column not in df.columns:
            raise ValueError(f"Time column '{target_column}' not found in file.")
        try:
            # Use format='mixed' (pandas >= 2.0) to handle varied date formats
            # gracefully instead of a rigid '%Y-%m-%d' that silently drops rows.
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce', format='mixed')
            if df[date_col].isnull().all():
                date_col = None
        except Exception:
            # Fallback: let pandas infer the format
            try:
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce', infer_datetime_format=True)
                if df[date_col].isnull().all():
                    date_col = None
            except Exception:
                date_col = None

    if date_col is None:
        return {"timeColumn": None, "seriesData": [], "xAxisData": [], "forecastData": []}

    # Aggregate by month-end frequency ('ME')
    monthly_counts = df.set_index(date_col).resample('ME').size()

    # --- Actual data ---
    actual_data_values = monthly_counts.tolist()
    actual_data_dates = [date.strftime('%Y-%m-%d') for date in monthly_counts.index]

    # --- Forecast data ---
    forecast_results = get_forecasting(monthly_counts)  # list of {"name":…, "value":…}
    forecast_data_values = [item['value'] for item in forecast_results]
    forecast_data_dates = [item['name'] for item in forecast_results]

    # Combined x-axis (actual + forecast dates)
    all_dates = actual_data_dates + forecast_data_dates

    # Padded series so both share the same x-axis length
    actual_series_padded = actual_data_values + ([None] * len(forecast_data_values))
    forecast_series_padded = ([None] * len(actual_data_values)) + forecast_data_values

    return {
        "timeColumn": date_col,
        "seriesData": actual_series_padded,       # Actual values (+ None padding)
        "forecastData": forecast_series_padded,   # ✅ now included in response
        "xAxisData": all_dates
    }

# --- NEW CORRELATION FUNCTION ---
def get_correlation_matrix(df):
    """Generates a correlation matrix for all numeric columns."""
    numeric_df = df.select_dtypes(include=np.number)
    if numeric_df.empty:
        return {"columns": [], "data": [], "matrix": pd.DataFrame()}
        
    correlation_matrix = numeric_df.corr().fillna(0)
    
    columns = correlation_matrix.columns.tolist()
    data = []
    for i in range(len(columns)):
        for j in range(len(columns)):
            data.append([i, j, round(correlation_matrix.iloc[i, j], 3)])
            
    return {"columns": columns, "data": data, "matrix": correlation_matrix}
# --- Original Function (Unchanged) ---
def get_table_data(df):
    column_defs = []
    for col in df.columns:
        column_defs.append({
            "headerName": col,
            "field": col,
            "sortable": True,
            "filter": True,
            "resizable": True,
        })
    
    df_head = df.head(100).replace({np.nan: None})
    row_data = df_head.to_dict(orient='records')
    
    return {"columnDefs": column_defs, "rowData": row_data}

# --- Original Function (Unchanged) ---
def get_data_health(df):
    if df.empty:
        return [
            {"metric": "Completeness", "value": "0%", "status": "negative"},
            {"metric": "Uniqueness", "value": "0%", "status": "negative"},
        ]
        
    total_records = len(df)
    missing_values = df.isnull().sum().sum()
    total_cells = np.prod(df.shape)
    completeness = (total_cells - missing_values) / total_cells * 100 if total_cells > 0 else 0
    
    duplicates = df.duplicated().sum()
    duplicate_percent = (duplicates / total_records) * 100 if total_records > 0 else 0

    return [
        {"metric": "Completeness", "value": f"{completeness:.1f}%", "status": "positive" if completeness > 95 else "neutral"},
        {"metric": "Uniqueness", "value": f"{(100 - duplicate_percent):.1f}%", "status": "positive" if duplicate_percent == 0 else "negative"},
        {"metric": "Total Duplicates", "value": f"{duplicates:,}", "status": "positive" if duplicates == 0 else "negative"},
        {"metric": "Missing Values", "value": f"{missing_values:,}", "status": "positive" if missing_values == 0 else "negative"},
    ]
def perform_file_conversion(file_content: bytes, filename: str, target_format: str) -> io.BytesIO:
    """
    Converts input file (CSV, Excel, JSON) into the target format.
    """
    # 1. Load the data into a DataFrame based on input extension
    if filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(file_content))
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(file_content))
    elif filename.endswith('.json'):
        df = pd.read_json(io.BytesIO(file_content))
    else:
        raise ValueError("Unsupported input file format")

    # 2. Export to the target format in memory
    output = io.BytesIO()
    
    if target_format == 'csv':
        df.to_csv(output, index=False)
        media_type = "text/csv"
    elif target_format == 'json':
        # 'records' orientation is best for frontend compatibility
        df.to_json(output, orient='records', indent=4)
        media_type = "application/json"
    elif target_format == 'parquet':
        # Note: requires 'pyarrow' or 'fastparquet' installed
        df.to_parquet(output, index=False)
        media_type = "application/octet-stream"
    else:
        raise ValueError(f"Unsupported target format: {target_format}")

    output.seek(0)
    return output
# Add these functions to analysis_utils.py

def get_advanced_analytics(df, date_col):
    """Provides the logic for the 'Perfect' Trend Chart"""
    try:
        df[date_col] = pd.to_datetime(df[date_col])
        # Resample to daily counts
        series = df.groupby(date_col).size().resample('D').sum().fillna(0)
        
        # 1. ANOMALY DETECTION (Z-Score)
        mean, std = series.mean(), series.std()
        anomalies = []
        if std > 0:
            # Find points 2 standard deviations away
            a_points = series[np.abs(series - mean) > (2 * std)]
            anomalies = [{"date": d.strftime('%Y-%m-%d'), "value": float(v)} for d, v in a_points.items()]

        # 2. FORECASTING (ARIMA) - Requires at least 2 cycles of data
        forecast = []
        if len(series) > 20:
            try:
                model = ARIMA(series, order=(5,1,0)).fit()
                fc = model.forecast(steps=7)
                forecast = [
                    {"date": str(idx.date()), "value": float(val)}
                    for idx, val in fc.items()
                ]
            except Exception as arima_err:
                print(f"[get_advanced_analytics] ARIMA forecast failed: {arima_err}")

        return {"anomalies": anomalies, "forecast": forecast}
    except Exception as e:
        return {"anomalies": [], "forecast": []}
def get_pareto_data(df, category_col):
    """Calculates 80/20 distribution for charts"""
    counts = df[category_col].value_counts().reset_index()
    counts.columns = [category_col, 'value']
    counts = counts.sort_values(by='value', ascending=False)
    counts['cumulative_perc'] = (counts['value'].cumsum() / counts['value'].sum()) * 100
    return counts.to_dict(orient='records')
def generate_pdf_report(df, kpi_data, health_data):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # --- Title & Header ---
    elements.append(Paragraph("Enterprise Data Analysis Report", styles['Title']))
    elements.append(Paragraph(f"Generated on: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 12))

    # --- Executive Summary ---
    elements.append(Paragraph("1. Executive Summary", styles['Heading2']))
    summary_text = f"The dataset contains <b>{len(df)}</b> total records across <b>{len(df.columns)}</b> variables. " \
                   f"The analysis identifies key trends and data quality metrics below."
    elements.append(Paragraph(summary_text, styles['Normal']))
    elements.append(Spacer(1, 12))

    # --- KPI Table ---
    elements.append(Paragraph("2. Key Performance Indicators", styles['Heading3']))
    # Prepare Table Data
    table_data = [["Metric Name", "Current Value"]]
    for kpi in kpi_data:
        # Extract name and value safely
        name = kpi.get('metric', 'N/A')
        val = kpi.get('value', '0')
        table_data.append([name, str(val)])

    kpi_table = Table(table_data, colWidths=[250, 150])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D07C5C')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
    ]))
    elements.append(kpi_table)
    elements.append(Spacer(1, 20))

    # --- Data Health Section ---
    elements.append(Paragraph("3. Data Quality Audit", styles['Heading3']))
    for health in health_data:
        health_status = f"<b>{health.get('metric', 'Health')}:</b> {health.get('value', '0')}"
        elements.append(Paragraph(health_status, styles['Normal']))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
def extract_dataset_context(df):
    """
    Extracts high-level summaries to reduce API token usage.
    """
    context = {
        "columns": list(df.columns),
        "data_types": df.dtypes.astype(str).to_dict(),
        "shape": df.shape,
        "null_counts": df.isnull().sum().to_dict(),
        "stats": df.describe(include='all').to_dict(), # Mean, Max, Min, etc.
        "sample_data": df.head(3).to_dict(orient='records') # Give the AI a 'feel' for the data
    }
    return json.dumps(context)

def process_dataframe(
    df,
    col_dist_target=None,
    col_time_target=None
):

    # --- Run core analysis functions ---
    kpis = get_kpis(df)

    correlation_result = get_correlation_matrix(df)

    time_series_result = get_time_series_data(
        df,
        target_column=col_time_target
    )

    insights = get_actionable_insights(
        df,
        kpis,
        correlation_result['matrix']
    )

    # --- Generate advanced analytics ---
    advanced_data = {
        "anomalies": [],
        "forecast": []
    }

    if col_time_target:
        advanced_data = get_advanced_analytics(
            df,
            col_time_target
        )

    # --- Build response ---
    response_data = {
        "kpiData": {
            **kpis,
            "timeSeriesAnomalies": advanced_data["anomalies"],
            "forecast": advanced_data["forecast"]
        },

        "insights": insights,

        "dictionary": get_data_dictionary(df),

        "columnDist": get_column_distribution(
            df,
            target_column=col_dist_target
        ),

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