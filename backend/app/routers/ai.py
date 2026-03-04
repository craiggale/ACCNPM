"""AI Assistant router — LLM Bridge to Vertex AI (Claude)."""

import json
import subprocess
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

SYSTEM_INSTRUCTION = """You are a translator for a project management tool called ACCN-PM. Your job is to convert user requests into structured JSON for the Orchestrator system.

Available actions:
- "resolve_gaps" — Detect and resolve resource conflicts/overbookings. Params: none required.
- "get_capacity" — Get team capacity overview by role. Params: { "role"?: string }
- "toggle_sandbox" — Toggle sandbox/draft mode for a project. Params: { "projectName"?: string }
- "adjust_schedule" — Shift project timeline. Params: { "projectName"?: string, "shiftMonths"?: number }
- "get_project_status" — Get project health/progress summary. Params: { "projectName"?: string }
- "assign_resource" — Assign a team member to a project. Params: { "resourceName"?: string, "projectName"?: string, "role"?: string }

RULES:
1. You DO NOT make decisions. You only interpret intent and narrate results.
2. Always respond with valid JSON in a code block wrapped with ```json ... ``` containing: { "action": "<action_name>", "params": { ... } }
3. If the user's request is ambiguous, ask a clarifying question instead of guessing.
4. After receiving tool results, narrate them in clear, concise language suitable for a PM audience.
5. If the request doesn't map to any available action, say so politely and list what you can help with.
6. Keep responses brief and professional."""


class ChatRequest(BaseModel):
    """Request body for the AI chat endpoint."""
    prompt: str
    context: Optional[dict] = None
    conversation_history: Optional[list] = None


class ChatResponse(BaseModel):
    """Response body for the AI chat endpoint."""
    response: str
    intent: Optional[dict] = None
    error: Optional[str] = None


def _get_access_token() -> str:
    """Get GCP access token via gcloud CLI."""
    try:
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            raise RuntimeError(f"gcloud auth failed: {result.stderr}")
        return result.stdout.strip()
    except FileNotFoundError:
        raise RuntimeError("gcloud CLI not found. Please install and authenticate.")
    except subprocess.TimeoutExpired:
        raise RuntimeError("gcloud auth timed out.")


def _build_messages(prompt: str, context: Optional[dict], history: Optional[list]) -> list:
    """Build the messages array for the Vertex AI request."""
    messages = []

    # Add conversation history if present
    if history:
        for msg in history[-10:]:  # Keep last 10 messages for context window
            messages.append({
                "role": msg.get("role", "user"),
                "content": [{"type": "text", "text": msg.get("content", "")}]
            })

    # Build the current user message
    user_content = prompt
    if context:
        user_content += f"\n\nCurrent application context:\n```json\n{json.dumps(context, indent=2, default=str)}\n```"

    messages.append({
        "role": "user",
        "content": [{"type": "text", "text": user_content}]
    })

    return messages


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    AI Chat endpoint — sends user prompt to Vertex AI (Claude) and returns
    the LLM's interpretation as structured intent + natural language narration.
    """
    settings = get_settings()

    try:
        access_token = _get_access_token()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Build the Vertex AI request
    messages = _build_messages(request.prompt, request.context, request.conversation_history)

    vertex_payload = {
        "anthropic_version": "vertex-2023-10-16",
        "stream": False,
        "max_tokens": 1024,
        "temperature": 0.3,  # Low temperature for consistent structured output
        "system": SYSTEM_INSTRUCTION,
        "messages": messages,
    }

    url = (
        f"https://{settings.vertex_endpoint}/v1/projects/{settings.vertex_project_id}"
        f"/locations/{settings.vertex_location}/publishers/anthropic"
        f"/models/{settings.vertex_model_id}:rawPredict"
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
                json=vertex_payload,
            )

            if response.status_code != 200:
                logger.error(f"Vertex AI error {response.status_code}: {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"LLM service returned {response.status_code}"
                )

            result = response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM request timed out")
    except httpx.RequestError as e:
        logger.error(f"Vertex AI request error: {e}")
        raise HTTPException(status_code=502, detail="Failed to reach LLM service")

    # Extract the response text from Claude's response format
    llm_text = ""
    if "content" in result and len(result["content"]) > 0:
        llm_text = result["content"][0].get("text", "")
    elif "choices" in result:
        llm_text = result["choices"][0].get("message", {}).get("content", "")

    # Try to extract structured intent from the response
    intent = _extract_intent(llm_text)

    return ChatResponse(
        response=llm_text,
        intent=intent,
    )


@router.post("/narrate")
async def ai_narrate(request: ChatRequest):
    """
    Narration endpoint — sends tool execution results back to the LLM
    to produce a human-readable summary for the user.
    """
    settings = get_settings()

    try:
        access_token = _get_access_token()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    narration_prompt = (
        "You are narrating the results of a tool execution in ACCN-PM. "
        "Explain the following results clearly and concisely to a project manager. "
        "If there are suggested actions, describe each option briefly. "
        "Do NOT output JSON. Speak naturally.\n\n"
        f"Tool results:\n```json\n{json.dumps(request.context, indent=2, default=str)}\n```\n\n"
        f"Original user request: {request.prompt}"
    )

    vertex_payload = {
        "anthropic_version": "vertex-2023-10-16",
        "stream": False,
        "max_tokens": 512,
        "temperature": 0.5,
        "messages": [{
            "role": "user",
            "content": [{"type": "text", "text": narration_prompt}]
        }],
    }

    url = (
        f"https://{settings.vertex_endpoint}/v1/projects/{settings.vertex_project_id}"
        f"/locations/{settings.vertex_location}/publishers/anthropic"
        f"/models/{settings.vertex_model_id}:rawPredict"
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
                json=vertex_payload,
            )

            if response.status_code != 200:
                raise HTTPException(status_code=502, detail=f"LLM service returned {response.status_code}")

            result = response.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail="Failed to reach LLM service")

    llm_text = ""
    if "content" in result and len(result["content"]) > 0:
        llm_text = result["content"][0].get("text", "")

    return {"narration": llm_text}


def _extract_intent(text: str) -> Optional[dict]:
    """Try to extract a JSON intent block from the LLM response."""
    try:
        # Look for ```json ... ``` blocks
        if "```json" in text:
            start = text.index("```json") + 7
            end = text.index("```", start)
            json_str = text[start:end].strip()
            return json.loads(json_str)

        # Try to parse the entire response as JSON
        stripped = text.strip()
        if stripped.startswith("{"):
            return json.loads(stripped)

    except (json.JSONDecodeError, ValueError):
        pass

    return None
