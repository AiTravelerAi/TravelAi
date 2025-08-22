# /ai-engine/main.py

import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("❌ Missing OPENAI_API_KEY in .env")

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-engine")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Create FastAPI app
app = FastAPI(
    title="TravelAi AI Engine",
    description="Handles AI processing for TravelAi",
    version="1.0.0"
)

# Request schema
class ChatRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o-mini"  # Default model

# Response schema
class ChatResponse(BaseModel):
    response: str


@app.get("/")
def root():
    return {"status": "ok", "message": "TravelAi AI Engine running"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Generate a response from the AI model.
    """
    logger.info(f"Received prompt: {request.prompt}")

    try:
        completion = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": "You are TravelAi, an AI travel assistant."},
                {"role": "user", "content": request.prompt}
            ],
            temperature=0.7
        )
        ai_response = completion.choices[0].message.content
        logger.info(f"Generated response: {ai_response}")

        return ChatResponse(response=ai_response)

    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
