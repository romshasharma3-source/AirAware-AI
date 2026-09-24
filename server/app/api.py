
import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

router = APIRouter(prefix="/api", tags=["AirAware AI"])

# --------------------------------------------------
# API Configuration
# --------------------------------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.1-flash-lite",
)

OPENWEATHER_BASE_URL = "https://api.openweathermap.org"


# --------------------------------------------------
# Request Models
# --------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    location: Optional[str] = "Bhopal, India"


# --------------------------------------------------
# Get Coordinates
# --------------------------------------------------

async def get_coordinates(location: str):

    if not OPENWEATHER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENWEATHER_API_KEY is not configured",
        )

    url = f"{OPENWEATHER_BASE_URL}/geo/1.0/direct"

    params = {
        "q": location,
        "limit": 1,
        "appid": OPENWEATHER_API_KEY,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch location information",
        )

    locations = response.json()

    if not locations:
        raise HTTPException(
            status_code=404,
            detail=f"Location not found: {location}",
        )

    return {
        "latitude": locations[0]["lat"],
        "longitude": locations[0]["lon"],
        "name": locations[0].get("name", location),
        "country": locations[0].get("country", ""),
    }


# --------------------------------------------------
# Get Air Quality Data
# --------------------------------------------------

async def get_air_quality_data(location: str):

    coordinates = await get_coordinates(location)

    url = f"{OPENWEATHER_BASE_URL}/data/2.5/air_pollution"

    params = {
        "lat": coordinates["latitude"],
        "lon": coordinates["longitude"],
        "appid": OPENWEATHER_API_KEY,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch air-quality data",
        )

    data = response.json()

    if not data.get("list"):
        raise HTTPException(
            status_code=404,
            detail="Air-quality data unavailable",
        )

    air_data = data["list"][0]
    components = air_data.get("components", {})

    return {
        "location": {
            "name": coordinates["name"],
            "country": coordinates["country"],
            "latitude": coordinates["latitude"],
            "longitude": coordinates["longitude"],
        },
        "openweather_aqi": air_data.get("main", {}).get("aqi"),
        "pollutants": {
            "co": components.get("co"),
            "no": components.get("no"),
            "no2": components.get("no2"),
            "o3": components.get("o3"),
            "so2": components.get("so2"),
            "pm2_5": components.get("pm2_5"),
            "pm10": components.get("pm10"),
            "nh3": components.get("nh3"),
        },
        "timestamp": air_data.get("dt"),
    }


# --------------------------------------------------
# Gemini LLM Calling
# --------------------------------------------------

async def ask_gemini(prompt: str):

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured",
        )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent"
    )

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
    }

    payload = {
        "system_instruction": {
            "parts": [
                {
                    "text": (
                        "You are AirAware AI, an air-quality assistant. "
                        "Provide clear, practical and concise answers. "
                        "Explain air pollution data in simple language. "
                        "Do not make medical diagnoses. "
                        "Do not invent missing measurements."
                    )
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt,
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 700,
        },
    }

    async with httpx.AsyncClient(timeout=40) as client:
        response = await client.post(
            url,
            headers=headers,
            json=payload,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {response.text[:300]}",
        )

    result = response.json()

    try:
        return result["candidates"][0]["content"]["parts"][0]["text"]

    except (KeyError, IndexError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="Invalid response received from Gemini",
        )


# --------------------------------------------------
# Air Quality Endpoint
# --------------------------------------------------

@router.get("/air-quality")
async def air_quality(
    location: str = "Bhopal, India",
):
    return await get_air_quality_data(location)


# --------------------------------------------------
# AI Chat Endpoint
# --------------------------------------------------

@router.post("/chat")
async def chat(request: ChatRequest):

    air_quality = await get_air_quality_data(
        request.location
    )

    prompt = f"""
User question:
{request.message}

Location:
{request.location}

Current air-quality data:
{air_quality}

Please answer the user's question using the available data.

Mention important pollutants when relevant.
Give practical precautions where appropriate.
Use simple language.
Do not invent missing measurements.
"""

    ai_response = await ask_gemini(prompt)

    return {
        "message": request.message,
        "location": request.location,
        "response": ai_response,
        "air_quality": air_quality,
    }