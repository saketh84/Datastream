import os
import pandas as pd

from fastapi import APIRouter, HTTPException
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

# IMPORT YOUR SHARED ANALYTICS FUNCTION
from app.analysis_utils import process_dataframe

router = APIRouter()

# ---------------------------------------------------
# ENV VARIABLES
# ---------------------------------------------------

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

GA4_PROPERTY_ID = os.getenv("GA4_PROPERTY_ID")

REDIRECT_URI = (
    "http://localhost:5173/google/callback"
)

SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly"
]

# ---------------------------------------------------
# GOOGLE OAUTH FLOW
# ---------------------------------------------------

def create_google_flow():

    return Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        },
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    print("CLIENT_ID:", CLIENT_ID)
print("CLIENT_SECRET:", CLIENT_SECRET)

# ---------------------------------------------------
# STEP 1:
# GENERATE GOOGLE LOGIN URL
# ---------------------------------------------------

@router.get("/auth/google")
def google_auth():

    try:
        flow = create_google_flow()


        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true"
        )

        return {
            "auth_url": auth_url
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ---------------------------------------------------
# STEP 2:
# GOOGLE CALLBACK
# ---------------------------------------------------

@router.get("/auth/google/callback")
def google_callback(code: str):
    flow = create_google_flow()
    try:

        # --------------------------------------------
        # FETCH GOOGLE TOKEN
        # --------------------------------------------

        flow.fetch_token(code=code)

        credentials = flow.credentials

        # --------------------------------------------
        # CREATE ANALYTICS CLIENT
        # --------------------------------------------

        analytics = build(
            "analyticsdata",
            "v1beta",
            credentials=credentials
        )

        # --------------------------------------------
        # FETCH ANALYTICS REPORT
        # --------------------------------------------

        response = analytics.properties().runReport(
            property=f"properties/{GA4_PROPERTY_ID}",

            body={

                "dateRanges": [
                    {
                        "startDate": "30daysAgo",
                        "endDate": "today"
                    }
                ],

                "dimensions": [
                    {"name": "date"}
                ],

                "metrics": [
                    {"name": "activeUsers"},
                    {"name": "sessions"},
                    {"name": "screenPageViews"},
                    {"name": "bounceRate"}
                ]
            }

        ).execute()

        # --------------------------------------------
        # CONVERT API RESPONSE → ROWS
        # --------------------------------------------

        rows = []

        for row in response.get("rows", []):

            rows.append({

                "date":
                    row["dimensionValues"][0]["value"],

                "activeUsers":
                    int(row["metricValues"][0]["value"]),

                "sessions":
                    int(row["metricValues"][1]["value"]),

                "pageViews":
                    int(row["metricValues"][2]["value"]),

                "bounceRate":
                    float(row["metricValues"][3]["value"])

            })

        # --------------------------------------------
        # CONVERT TO DATAFRAME
        # --------------------------------------------

        df = pd.DataFrame(rows)

        # --------------------------------------------
        # REUSE SAME ANALYTICS ENGINE
        # --------------------------------------------

        result = process_dataframe(

            df,

            col_dist_target="date",

            col_time_target="date"

        )

        # --------------------------------------------
        # RETURN SAME DASHBOARD RESPONSE
        # --------------------------------------------

        return result

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )