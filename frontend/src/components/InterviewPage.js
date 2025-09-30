import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const InterviewPage = ({ interviewData, setInterviewData }) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewData) {
      navigate('/');
      return;
    }
    
    // Start with the first question
    if (interviewData.answers.length === 0) {
      setCurrentQuestion(interviewData.welcomeMessage + '\n\n' + 'Question 1: How would you use a VLOOKUP in Excel? Please provide a practical example with sample data.');
    } else {
      // Load the next question from the last answer
      const lastAnswer = interviewData.answers[interviewData.answers.length - 1];
      if (lastAnswer.nextQuestion) {
        setCurrentQuestion(`Question ${interviewData.answers.length + 1}: ${lastAnswer.nextQuestion}`);
      }
    }
  }, [interviewData, navigate]);

  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) {
      alert('Please provide an answer before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/interview/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: interviewData.sessionId,
          answer: currentAnswer.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      
      // Update interview data
      const updatedAnswers = [...interviewData.answers, {
        question: data.question,
        answer: currentAnswer.trim(),
        evaluation: data.evaluation,
        nextQuestion: data.next_question
      }];

      setInterviewData({
        ...interviewData,
        answers: updatedAnswers,
        currentQuestion: interviewData.currentQuestion + 1
      });

      setEvaluation(data.evaluation);
      setCurrentAnswer('');

      if (data.finished) {
        setIsFinished(true);
        // Auto-navigate to results after a short delay
        setTimeout(() => {
          navigate('/results');
        }, 3000);
      } else {
        setCurrentQuestion(`Question ${updatedAnswers.length + 1}: ${data.next_question}`);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'score-excellent';
    if (score >= 3) return 'score-good';
    if (score >= 2) return 'score-fair';
    return 'score-poor';
  };

  const getScoreText = (score) => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Needs Improvement';
  };

  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card text-center">
          <CheckCircle className="h-16 w-16 text-success-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Interview Completed!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for completing the Excel skills assessment. 
            Your results are being generated and you'll be redirected shortly.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {interviewData.answers.length} of {interviewData.totalQuestions} questions
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((interviewData.answers.length / interviewData.totalQuestions) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(interviewData.answers.length / interviewData.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Question */}
      <div className="card mb-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-sm">
                {interviewData.answers.length + 1}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Current Question
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-line">
                {currentQuestion}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Input */}
      <div className="card mb-6">
        <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
          Your Answer
        </label>
        <textarea
          id="answer"
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          className="input-field min-h-[200px] resize-none"
          placeholder="Type your answer here..."
          disabled={isSubmitting}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !currentAnswer.trim()}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Evaluation Display */}
      {evaluation && (
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-success-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Evaluation Results
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Score:</span>
                <span className={`score-badge ${getScoreColor(evaluation.overall_score)}`}>
                  {evaluation.overall_score}/5 - {getScoreText(evaluation.overall_score)}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Technical Accuracy: {evaluation.technical_accuracy}/5</div>
                <div>Practical Application: {evaluation.practical_application}/5</div>
                <div>Clarity: {evaluation.clarity}/5</div>
                <div>Completeness: {evaluation.completeness}/5</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Feedback:</h4>
              <p className="text-sm text-gray-700 mb-3">{evaluation.feedback}</p>
              
              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <div className="mb-2">
                  <h5 className="font-medium text-success-700 text-sm">Strengths:</h5>
                  <ul className="text-sm text-gray-600">
                    {evaluation.strengths.map((strength, index) => (
                      <li key={index}>• {strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {evaluation.improvements && evaluation.improvements.length > 0 && (
                <div>
                  <h5 className="font-medium text-warning-700 text-sm">Areas for Improvement:</h5>
                  <ul className="text-sm text-gray-600">
                    {evaluation.improvements.map((improvement, index) => (
                      <li key={index}>• {improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previous Answers */}
      {interviewData.answers.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Previous Answers
          </h3>
          <div className="space-y-4">
            {interviewData.answers.map((answer, index) => (
              <div key={index} className="border-l-4 border-primary-200 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Question {index + 1}
                  </span>
                  <span className={`score-badge ${getScoreColor(answer.evaluation.overall_score)}`}>
                    {answer.evaluation.overall_score}/5
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Answer:</strong> {answer.answer}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Feedback:</strong> {answer.evaluation.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;

