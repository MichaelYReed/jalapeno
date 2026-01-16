import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import ChatRequest, ChatResponse, VoiceRequest
from services.ai_service import process_chat_message, process_chat_message_stream, transcribe_audio

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Process a natural language chat message and return product suggestions"""

    conversation_history = [
        {"role": msg.role, "content": msg.content}
        for msg in request.conversation_history
    ]

    result = await process_chat_message(
        message=request.message,
        conversation_history=conversation_history,
        db=db
    )

    return result


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    """Stream chat response via Server-Sent Events"""

    async def event_generator():
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        async for event in process_chat_message_stream(
            message=request.message,
            conversation_history=conversation_history,
            db=db
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/voice")
async def voice_order(request: VoiceRequest, db: Session = Depends(get_db)):
    """Process voice input: transcribe audio and process as chat"""

    try:
        # Transcribe audio to text
        transcribed_text = await transcribe_audio(request.audio_base64)

        if not transcribed_text or transcribed_text.strip() == "":
            return {
                "transcribed_text": "",
                "message": "I couldn't understand the audio. Please try again.",
                "suggestions": [],
                "needs_clarification": True
            }

        # Process the transcribed text through the chat system
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]

        result = await process_chat_message(
            message=transcribed_text,
            conversation_history=conversation_history,
            db=db
        )

        return {
            "transcribed_text": transcribed_text,
            **result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing voice input: {str(e)}"
        )


@router.get("/chat/suggestions")
async def get_suggestions(db: Session = Depends(get_db)):
    """Get example prompts for the chat interface"""
    return {
        "suggestions": [
            "I need 5 pounds of chicken breast and a dozen eggs",
            "Can I get a case of olive oil and some garlic?",
            "I'm looking for pasta and tomato sauce for Italian night",
            "What dairy products do you have?",
            "I need supplies for a breakfast menu - eggs, bacon, and butter"
        ]
    }
