from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import json
import os
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage

# -------------------------
# Initialize
# -------------------------
app = FastAPI(
    title="Excel Mock Interviewer API",
    description="AI-powered Excel skills assessment system",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI LLM
llm = ChatOpenAI(
    model="gpt-4o-mini", 
    temperature=0.3,
    api_key=os.getenv("OPENAI_API_KEY")
)

# In-memory store for sessions (in production, use Firestore)
sessions: Dict[str, Dict] = {}

# Comprehensive Excel interview questions
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
    },
    {
        "id": 6,
        "question": "How would you create a dynamic chart that updates automatically when new data is added?",
        "category": "Charts & Visualization",
        "difficulty": "Advanced"
    },
    {
        "id": 7,
        "question": "Explain the difference between COUNT, COUNTA, COUNTIF, and COUNTIFS functions with examples.",
        "category": "Statistical Functions",
        "difficulty": "Intermediate"
    }
]

# -------------------------
# Data Models
# -------------------------
class StartInterviewRequest(BaseModel):
    candidate_name: Optional[str] = "Anonymous"

class StartInterviewResponse(BaseModel):
    session_id: str
    welcome_message: str
    first_question: str
    total_questions: int

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str

class SubmitAnswerResponse(BaseModel):
    question_id: int
    question: str
    evaluation: Dict
    next_question: Optional[str] = None
    finished: bool = False
    progress: str

class FinishInterviewRequest(BaseModel):
    session_id: str

class FinishInterviewResponse(BaseModel):
    summary: str
    overall_score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str
    detailed_feedback: List[Dict]

# -------------------------
# Helper Functions
# -------------------------
def evaluate_answer(question: str, answer: str, question_id: int) -> Dict:
    """Evaluate candidate's answer using GPT with structured prompt."""
    
    evaluation_prompt = ChatPromptTemplate.from_template("""
    You are an expert Excel interviewer evaluating a candidate's response. 
    
    Question ID: {question_id}
    Question: {question}
    Candidate Answer: {answer}
    
    Evaluate the candidate's answer based on:
    1. Technical accuracy (0-5)
    2. Practical application (0-5) 
    3. Clarity of explanation (0-5)
    4. Completeness (0-5)
    
    Provide constructive feedback and suggest improvements.
    
    Respond in this EXACT JSON format:
    {{
        "technical_accuracy": <int>,
        "practical_application": <int>,
        "clarity": <int>,
        "completeness": <int>,
        "overall_score": <float>,
        "feedback": "<detailed feedback string>",
        "strengths": ["<strength1>", "<strength2>"],
        "improvements": ["<improvement1>", "<improvement2>"]
    }}
    """)
    
    try:
        chain = evaluation_prompt | llm
        result = chain.invoke({
            "question_id": question_id,
            "question": question,
            "answer": answer
        })
        
        # Parse JSON response
        evaluation = json.loads(result.content)
        return evaluation
    except Exception as e:
        # Fallback evaluation if JSON parsing fails
        return {
            "technical_accuracy": 3,
            "practical_application": 3,
            "clarity": 3,
            "completeness": 3,
            "overall_score": 3.0,
            "feedback": f"Evaluation completed with standard scoring. Error: {str(e)}",
            "strengths": ["Answer provided"],
            "improvements": ["Could be more detailed"]
        }

def generate_final_summary(answers: List[Dict], candidate_name: str) -> Dict:
    """Generate comprehensive final performance report."""
    
    # Calculate overall statistics
    total_score = sum(answer.get('evaluation', {}).get('overall_score', 0) for answer in answers)
    average_score = total_score / len(answers) if answers else 0
    
    # Prepare detailed feedback for GPT
    feedback_text = "\n\n".join([
        f"Question {i+1}: {answer['question']}\n"
        f"Answer: {answer['answer']}\n"
        f"Score: {answer.get('evaluation', {}).get('overall_score', 0)}/5\n"
        f"Feedback: {answer.get('evaluation', {}).get('feedback', 'No feedback')}"
        for i, answer in enumerate(answers)
    ])
    
    summary_prompt = ChatPromptTemplate.from_template("""
    You are an Excel expert providing a final interview assessment for {candidate_name}.
    
    Interview Results:
    {feedback_text}
    
    Average Score: {average_score}/5
    
    Provide a comprehensive assessment in this EXACT JSON format:
    {{
        "summary": "<overall performance summary>",
        "strengths": ["<strength1>", "<strength2>", "<strength3>"],
        "weaknesses": ["<weakness1>", "<weakness2>"],
        "recommendation": "<Hire/Needs Improvement/Not Ready>",
        "detailed_feedback": [
            {{
                "question_id": <int>,
                "question": "<question>",
                "score": <float>,
                "feedback": "<specific feedback>"
            }}
        ]
    }}
    """)
    
    try:
        chain = summary_prompt | llm
        result = chain.invoke({
            "candidate_name": candidate_name,
            "feedback_text": feedback_text,
            "average_score": average_score
        })
        
        summary_data = json.loads(result.content)
        summary_data["overall_score"] = average_score
        return summary_data
    except Exception as e:
        # Fallback summary
        return {
            "summary": f"Interview completed for {candidate_name}. Average score: {average_score:.1f}/5",
            "strengths": ["Participated in interview"],
            "weaknesses": ["Areas for improvement identified"],
            "recommendation": "Needs Improvement" if average_score < 3 else "Hire",
            "overall_score": average_score,
            "detailed_feedback": [
                {
                    "question_id": answer.get('question_id', i),
                    "question": answer.get('question', 'Question'),
                    "score": answer.get('evaluation', {}).get('overall_score', 0),
                    "feedback": answer.get('evaluation', {}).get('feedback', 'No feedback')
                }
                for i, answer in enumerate(answers)
            ]
        }

# -------------------------
# API Endpoints
# -------------------------
@app.get("/")
def root():
    return {"message": "Excel Mock Interviewer API", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "sessions": len(sessions)}

@app.post("/interview/start", response_model=StartInterviewResponse)
def start_interview(request: StartInterviewRequest):
    """Start a new interview session."""
    session_id = str(uuid.uuid4())
    
    # Initialize session
    sessions[session_id] = {
        "candidate_name": request.candidate_name,
        "current_question": 0,
        "answers": [],
        "started_at": None,
        "finished_at": None
    }
    
    welcome_message = f"""
    Welcome to the Excel Skills Assessment, {request.candidate_name}!
    
    This interview consists of {len(QUESTIONS)} questions covering various Excel topics including:
    - Lookup functions and formulas
    - Data analysis and pivot tables
    - Cell references and data management
    - Charts and visualization
    - Statistical functions
    
    Please answer each question to the best of your ability. You'll receive immediate feedback after each response.
    
    Good luck!
    """
    
    return StartInterviewResponse(
        session_id=session_id,
        welcome_message=welcome_message.strip(),
        first_question=QUESTIONS[0]["question"],
        total_questions=len(QUESTIONS)
    )

@app.post("/interview/answer", response_model=SubmitAnswerResponse)
def submit_answer(request: SubmitAnswerRequest):
    """Submit an answer and get evaluation."""
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    current_idx = session["current_question"]
    if current_idx >= len(QUESTIONS):
        raise HTTPException(status_code=400, detail="Interview already completed")
    
    current_question = QUESTIONS[current_idx]
    
    # Evaluate the answer
    evaluation = evaluate_answer(
        current_question["question"], 
        request.answer, 
        current_question["id"]
    )
    
    # Store the answer and evaluation
    session["answers"].append({
        "question_id": current_question["id"],
        "question": current_question["question"],
        "answer": request.answer,
        "evaluation": evaluation,
        "category": current_question["category"],
        "difficulty": current_question["difficulty"]
    })
    
    # Move to next question
    session["current_question"] += 1
    finished = session["current_question"] >= len(QUESTIONS)
    
    # Prepare response
    next_question = None
    if not finished:
        next_question = QUESTIONS[session["current_question"]]["question"]
    
    progress = f"Question {current_idx + 1} of {len(QUESTIONS)}"
    
    return SubmitAnswerResponse(
        question_id=current_question["id"],
        question=current_question["question"],
        evaluation=evaluation,
        next_question=next_question,
        finished=finished,
        progress=progress
    )

@app.post("/interview/finish", response_model=FinishInterviewResponse)
def finish_interview(request: FinishInterviewRequest):
    """Generate final interview report."""
    session = sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session["answers"]:
        raise HTTPException(status_code=400, detail="No answers submitted")
    
    # Generate comprehensive summary
    summary_data = generate_final_summary(
        session["answers"], 
        session["candidate_name"]
    )
    
    return FinishInterviewResponse(
        summary=summary_data["summary"],
        overall_score=summary_data["overall_score"],
        strengths=summary_data["strengths"],
        weaknesses=summary_data["weaknesses"],
        recommendation=summary_data["recommendation"],
        detailed_feedback=summary_data["detailed_feedback"]
    )

@app.get("/interview/{session_id}/status")
def get_interview_status(session_id: str):
    """Get current interview status."""
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "candidate_name": session["candidate_name"],
        "current_question": session["current_question"],
        "total_questions": len(QUESTIONS),
        "answers_submitted": len(session["answers"]),
        "finished": session["current_question"] >= len(QUESTIONS)
    }

@app.get("/questions")
def get_questions():
    """Get all interview questions (for reference)."""
    return {"questions": QUESTIONS, "total": len(QUESTIONS)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

