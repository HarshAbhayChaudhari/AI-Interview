from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
import base64

# HTTP client
import httpx

# Firestore
from google.cloud import firestore
from google.cloud import texttospeech
from google.oauth2 import service_account

# -------------------------
# Initialize FastAPI
# -------------------------
app = FastAPI(
    title="Excel Voice Interview API",
    description="AI-powered Excel voice interview with batch evaluation",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Gemini REST configuration
# -------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
GEMINI_AUDIO_MODEL = os.getenv("GEMINI_AUDIO_MODEL", "gemini-2.0-flash")
GEMINI_TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

def gemini_generate_content(parts: list, model: str, generation_config: Optional[dict] = None) -> dict:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")
    url = GEMINI_ENDPOINT.format(model=model, key=GEMINI_API_KEY)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": parts
            }
        ]
    }
    if generation_config:
        payload["generationConfig"] = generation_config
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        detail = e.response.text
        raise HTTPException(status_code=e.response.status_code, detail=f"Gemini API error: {detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini request failed: {str(e)}")

# -------------------------
# Initialize Firestore
# -------------------------
def init_firestore():
    """Initialize Firestore database"""
    try:
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not creds_path:
            project_root = Path(__file__).parent.parent
            creds_path = project_root / "ai-interview-a68d2-firebase-adminsdk-fbsvc-eeb9bc2e79.json"
        
        if os.path.exists(creds_path):
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            db = firestore.Client(credentials=credentials, project=os.getenv("GCP_PROJECT_ID", "ai-interview-a68d2"))
            print("✅ Firestore initialized successfully")
            return db
        else:
            print("⚠️ No Firestore credentials found, using in-memory storage")
            return None
    except Exception as e:
        print(f"⚠️ Firestore initialization failed: {e}, using in-memory storage")
        return None

db = init_firestore()

# In-memory fallback store
sessions_memory: Dict[str, Dict] = {}

# -------------------------
# Excel Interview Questions (First 5 Only)
# -------------------------
QUESTIONS = [
    {
        "id": 1,
        "question": "How would you use a VLOOKUP in Excel? Please provide a practical example with sample data.",
        "category": "Lookup Functions",
        "difficulty": "Intermediate"
    },
    {
        "id": 2,
        "question": "Explain the difference between Absolute and Relative cell references. When would you use each?",
        "category": "Cell References",
        "difficulty": "Basic"
    },
    {
        "id": 3,
        "question": "What is a Pivot Table and when would you use it? Walk me through creating one.",
        "category": "Data Analysis",
        "difficulty": "Intermediate"
    },
    {
        "id": 4,
        "question": "How do you handle duplicate values in Excel? What are the different methods available?",
        "category": "Data Management",
        "difficulty": "Basic"
    },
    {
        "id": 5,
        "question": "Write a formula to calculate the average of cells A1 through A10, excluding blank cells and zeros.",
        "category": "Formulas",
        "difficulty": "Intermediate"
    }
]

# -------------------------
# Data Models
# -------------------------
class StartInterviewRequest(BaseModel):
    candidate_name: str

class StartInterviewResponse(BaseModel):
    session_id: str
    introduction_audio_url: str
    first_question: Dict
    total_questions: int

class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: int

class SubmitAnswerResponse(BaseModel):
    next_question: Optional[Dict] = None
    finished: bool = False
    progress: str

class EvaluateRequest(BaseModel):
    session_id: str

class EvaluationResponse(BaseModel):
    summary: str
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str
    detailed_feedback: List[Dict]

# -------------------------
# Session Management
# -------------------------
def save_session_to_firestore(session_id: str, session_data: Dict):
    """Save session to Firestore"""
    if db:
        try:
            doc_ref = db.collection('voice_interview_sessions').document(session_id)
            # Convert any datetime objects to ISO format strings
            firestore_data = json.loads(json.dumps(session_data, default=str))
            doc_ref.set(firestore_data, merge=True)
        except Exception as e:
            print(f"Error saving to Firestore: {e}")

def load_session_from_firestore(session_id: str) -> Optional[Dict]:
    """Load session from Firestore"""
    if db:
        try:
            doc_ref = db.collection('voice_interview_sessions').document(session_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            print(f"Error loading from Firestore: {e}")
    return None

def get_session(session_id: str) -> Optional[Dict]:
    """Get session from Firestore or memory"""
    session = load_session_from_firestore(session_id)
    if session:
        return session
    return sessions_memory.get(session_id)

def update_session(session_id: str, updates: Dict):
    """Update session in Firestore and memory"""
    if session_id in sessions_memory:
        sessions_memory[session_id].update(updates)
    save_session_to_firestore(session_id, updates)

# -------------------------
# Helper Functions
# -------------------------
def transcribe_audio(file_path: str) -> str:
    """Convert speech to text using Gemini 2.0 Flash multimodal via REST."""
    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()
        b64 = base64.b64encode(audio_bytes).decode("utf-8")
        parts = [
            {"text": "Transcribe the spoken English audio to plain text. Return only the transcript."},
            {"inline_data": {"mime_type": "audio/wav", "data": b64}}
        ]
        data = gemini_generate_content(parts, GEMINI_AUDIO_MODEL)
        # Extract text
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("No candidates in transcription response")
        parts_out = candidates[0].get("content", {}).get("parts", [])
        for p in parts_out:
            if "text" in p:
                return p["text"].strip()
        raise RuntimeError("No text in transcription response parts")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech transcription failed: {str(e)}")

def synthesize_speech(text: str, output_path: str):
    """Convert text to speech using Google Cloud Text-to-Speech (Gemini-TTS), output MP3."""
    try:
        # Resolve credentials: prefer GOOGLE_APPLICATION_CREDENTIALS; fallback to bundled service account
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not creds_path or not os.path.exists(creds_path):
            # Try project root JSON
            project_root = Path(__file__).parent.parent
            default_path = project_root / "ai-interview-a68d2-firebase-adminsdk-fbsvc-eeb9bc2e79.json"
            # Or backend-local JSON
            backend_local = Path(__file__).parent / "ai-interview-a68d2-firebase-adminsdk-fbsvc-eeb9bc2e79.json"
            if default_path.exists():
                creds_path = str(default_path)
            elif backend_local.exists():
                creds_path = str(backend_local)
            else:
                raise HTTPException(status_code=500, detail="Google credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or place the service account JSON at project root or backend directory.")

        credentials = service_account.Credentials.from_service_account_file(creds_path)
        client = texttospeech.TextToSpeechClient(credentials=credentials)
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            model_name=os.getenv("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
        )
        print(f"TTS: model={voice.model_name}, voice={voice.name}")
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        with open(output_path, "wb") as f:
            f.write(response.audio_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

def generate_introduction() -> str:
    """Generate AI introduction speech"""
    return """Hello! I'm ExcelBot, your AI Excel interviewer today. 
    I'll be conducting a voice-based interview to assess your Excel skills. 
    I'll ask you five questions covering various Excel topics including formulas, data analysis, and spreadsheet management. 
    After each question, please record your answer and click submit when you're done. 
    At the end of all five questions, you'll receive comprehensive feedback on your performance. 
    Let's begin with the first question."""

def generate_question_speech(question_text: str, question_number: int) -> str:
    """Generate speech for asking a question"""
    return f"Question {question_number}. {question_text}"

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
def root():
    return {
        "message": "Excel Voice Interview API", 
        "version": "3.0.0",
        "features": ["voice_only_interview", "batch_evaluation", "firestore_persistence"]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "sessions_memory": len(sessions_memory),
        "firestore_enabled": db is not None,
        "total_questions": len(QUESTIONS)
    }

@app.post("/interview/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest):
    """Start a new voice-only interview session"""
    session_id = str(uuid.uuid4())
    
    # Create session data
    session_data = {
        "session_id": session_id,
        "candidate_name": request.candidate_name,
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None,
        "current_question": 0,
        "questions": [],
        "evaluation": None,
        "status": "in_progress"
    }
    
    # Save to both memory and Firestore
    sessions_memory[session_id] = session_data
    save_session_to_firestore(session_id, session_data)
    
    # Generate introduction audio
    introduction_text = generate_introduction()
    temp_dir = tempfile.mkdtemp()
    intro_audio_path = os.path.join(temp_dir, f"intro_{session_id}.mp3")
    synthesize_speech(introduction_text, intro_audio_path)
    
    # First question
    first_question = QUESTIONS[0]
    
    return StartInterviewResponse(
        session_id=session_id,
        introduction_audio_url=f"/audio/{session_id}/intro",
        first_question={
            "id": first_question["id"],
            "question": first_question["question"],
            "number": 1,
            "audio_url": f"/audio/{session_id}/question/1"
        },
        total_questions=len(QUESTIONS)
    )

@app.get("/audio/{session_id}/intro")
async def get_intro_audio(session_id: str):
    """Get introduction audio"""
    introduction_text = generate_introduction()
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"intro_{session_id}.mp3")
    synthesize_speech(introduction_text, audio_path)
    return FileResponse(audio_path, media_type="audio/mpeg", filename="introduction.mp3")

@app.get("/audio/{session_id}/question/{question_number}")
async def get_question_audio(session_id: str, question_number: int):
    """Get question audio"""
    if question_number < 1 or question_number > len(QUESTIONS):
        raise HTTPException(status_code=404, detail="Question not found")
    
    question = QUESTIONS[question_number - 1]
    question_speech = generate_question_speech(question["question"], question_number)
    
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"question_{session_id}_{question_number}.mp3")
    synthesize_speech(question_speech, audio_path)
    
    return FileResponse(audio_path, media_type="audio/mpeg", filename=f"question_{question_number}.mp3")

@app.post("/interview/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    session_id: str = Form(...),
    question_id: int = Form(...),
    audio: UploadFile = File(...)
):
    """Submit answer for a question (voice recording)"""
    
    # Get session
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")
    
    # Verify question ID
    if question_id < 1 or question_id > len(QUESTIONS):
        raise HTTPException(status_code=400, detail="Invalid question ID")
    
    current_question_idx = session["current_question"]
    if question_id != current_question_idx + 1:
        raise HTTPException(status_code=400, detail="Question ID mismatch")
    
    # Save uploaded audio
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"answer_{session_id}_{question_id}.wav")
    with open(audio_path, "wb") as f:
        content = await audio.read()
        f.write(content)
    
    # Transcribe audio
    transcript = transcribe_audio(audio_path)
    
    # Get question details
    question = QUESTIONS[current_question_idx]
    
    # Store Q&A pair
    qa_pair = {
        "question_id": question["id"],
        "question_text": question["question"],
        "category": question["category"],
        "difficulty": question["difficulty"],
        "answer_transcript": transcript,
        "asked_at": session.get("started_at"),
        "answered_at": datetime.utcnow().isoformat()
    }
    
    # Update session
    session["questions"].append(qa_pair)
    session["current_question"] += 1
    
    # Check if finished
    finished = session["current_question"] >= len(QUESTIONS)
    if finished:
        session["status"] = "awaiting_feedback"
    
    # Save session
    sessions_memory[session_id] = session
    save_session_to_firestore(session_id, session)
    
    # Prepare response
    next_question = None
    if not finished:
        next_q = QUESTIONS[session["current_question"]]
        next_question = {
            "id": next_q["id"],
            "question": next_q["question"],
            "number": session["current_question"] + 1,
            "audio_url": f"/audio/{session_id}/question/{session['current_question'] + 1}"
        }
    
    progress = f"Question {current_question_idx + 1} of {len(QUESTIONS)}"
    
    return SubmitAnswerResponse(
        next_question=next_question,
        finished=finished,
        progress=progress
    )

@app.post("/interview/evaluate", response_model=EvaluationResponse)
async def evaluate_interview(request: EvaluateRequest):
    """Evaluate all answers in batch and provide comprehensive feedback"""
    
    # Get session
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] != "awaiting_feedback":
        raise HTTPException(status_code=400, detail="Interview not ready for evaluation")
    
    if not session["questions"]:
        raise HTTPException(status_code=400, detail="No answers to evaluate")
    
    # Prepare evaluation prompt
    qa_text = "\n\n".join([
        f"Question {i+1} ({q['category']} - {q['difficulty']}):\n"
        f"Q: {q['question_text']}\n"
        f"Candidate's Answer: {q['answer_transcript']}"
        for i, q in enumerate(session["questions"])
    ])
    
    evaluation_prompt = f"""You are an expert Excel interviewer evaluating a candidate's performance in a voice interview.

Candidate Name: {session['candidate_name']}

Below are the 5 questions asked and the candidate's spoken answers (transcribed from voice):

{qa_text}

Please provide a comprehensive evaluation:

1. For each question, evaluate on:
   - Technical accuracy (0-5)
   - Practical application (0-5)
   - Clarity of explanation (0-5)
   - Completeness (0-5)
   - Overall score for the question (0-5, average of above)
   - Specific feedback

2. Overall assessment:
   - Key strengths (3-4 points)
   - Areas for improvement (2-3 points)
   - Overall score (average of all 5 questions, 0-5)
   - Final recommendation (Strong Hire / Hire / Needs Improvement / Not Ready)

Respond in this EXACT JSON format:
{{
    "detailed_feedback": [
        {{
            "question_id": 1,
            "question": "<question text>",
            "technical_accuracy": <int 0-5>,
            "practical_application": <int 0-5>,
            "clarity": <int 0-5>,
            "completeness": <int 0-5>,
            "score": <float 0-5>,
            "feedback": "<specific feedback for this question>"
        }},
        // ... repeat for all 5 questions
    ],
    "summary": "<overall performance summary paragraph>",
    "strengths": ["<strength1>", "<strength2>", "<strength3>"],
    "weaknesses": ["<weakness1>", "<weakness2>"],
    "overall_score": <float 0-5>,
    "recommendation": "<Strong Hire|Hire|Needs Improvement|Not Ready>"
}}
"""
    
    try:
        # Call Gemini 2.0 Flash via REST
        parts = [{"text": evaluation_prompt}]
        data = gemini_generate_content(parts, GEMINI_TEXT_MODEL, generation_config={"temperature": 0.3})
        # Extract model text
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("No candidates in evaluation response")
        parts_out = candidates[0].get("content", {}).get("parts", [])
        text_out = None
        for p in parts_out:
            if "text" in p:
                text_out = p["text"]
                break
        if not text_out:
            raise RuntimeError("No text found in evaluation response")
        evaluation_json = json.loads(text_out)
        
        # Update session with evaluation
        session["evaluation"] = evaluation_json
        session["status"] = "completed"
        session["finished_at"] = datetime.utcnow().isoformat()
        
        # Save session
        sessions_memory[request.session_id] = session
        save_session_to_firestore(request.session_id, session)
        
        return EvaluationResponse(
            summary=evaluation_json["summary"],
            overall_score=evaluation_json["overall_score"],
            strengths=evaluation_json["strengths"],
            weaknesses=evaluation_json["weaknesses"],
            recommendation=evaluation_json["recommendation"],
            detailed_feedback=evaluation_json["detailed_feedback"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.get("/interview/{session_id}/status")
def get_interview_status(session_id: str):
    """Get current interview status"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "candidate_name": session["candidate_name"],
        "status": session["status"],
        "current_question": session["current_question"],
        "total_questions": len(QUESTIONS),
        "questions_answered": len(session["questions"]),
        "started_at": session["started_at"],
        "finished_at": session.get("finished_at")
    }

@app.get("/interview/{session_id}/transcript")
def get_interview_transcript(session_id: str):
    """Get full interview transcript"""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "candidate_name": session["candidate_name"],
        "status": session["status"],
        "questions": session["questions"],
        "evaluation": session.get("evaluation"),
        "started_at": session["started_at"],
        "finished_at": session.get("finished_at")
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
