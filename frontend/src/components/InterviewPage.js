import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, CheckCircle, Send } from 'lucide-react';

const InterviewPage = ({ interviewData, setInterviewData }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isPlayingIntro, setIsPlayingIntro] = useState(true);
  const [introPlayBlocked, setIntroPlayBlocked] = useState(false);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [questionPlayBlocked, setQuestionPlayBlocked] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 5 });
  const [isFinished, setIsFinished] = useState(false);
  
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewData) {
      navigate('/');
      return;
    }

    // Play introduction audio automatically
    playIntroduction();
  }, [interviewData, navigate]);

  // After intro ends and question is mounted, play question when audio element is present
  useEffect(() => {
    if (!isPlayingIntro && currentQuestion) {
      playQuestionAudio(currentQuestion);
    }
  }, [isPlayingIntro, currentQuestion]);

  const playIntroduction = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const audioUrl = `${apiUrl}${interviewData.introductionAudioUrl}`;
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        try {
          await audioRef.current.play();
          setIsPlayingIntro(true);
          setIntroPlayBlocked(false);
        } catch (err) {
          // Autoplay blocked by browser; require user gesture
          setIntroPlayBlocked(true);
        }
      }
    } catch (error) {
      console.error('Error playing introduction:', error);
      // If audio fails, proceed to first question
      handleIntroductionEnd();
    }
  };

  const handleIntroductionEnd = () => {
    setIsPlayingIntro(false);
    // Load first question
    setCurrentQuestion(interviewData.firstQuestion);
    setProgress({ current: 1, total: interviewData.totalQuestions });
    // Audio element will remount; playback will be triggered by useEffect
  };

  const playQuestionAudio = async (question) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const audioUrl = `${apiUrl}${question.audio_url}`;
      
      if (audioRef.current) {
        setIsPlayingQuestion(true);
        audioRef.current.src = audioUrl;
        try {
          await audioRef.current.play();
          setQuestionPlayBlocked(false);
        } catch (err) {
          setQuestionPlayBlocked(true);
        }
      }
    } catch (error) {
      console.error('Error playing question:', error);
      setIsPlayingQuestion(false);
    }
  };

  const handleQuestionAudioEnd = () => {
    setIsPlayingQuestion(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data]);
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const submitAnswer = async () => {
    if (audioChunks.length === 0) {
      alert('Please record your answer first');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      
      // Send to backend
      const formData = new FormData();
      formData.append('session_id', interviewData.sessionId);
      formData.append('question_id', currentQuestion.id);
      formData.append('audio', audioBlob, 'answer.wav');

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/interview/submit-answer`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      
      // Update interview data
      const updatedQuestions = [...interviewData.questions, {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answered: true
      }];

      setInterviewData({
        ...interviewData,
        questions: updatedQuestions,
        currentQuestion: interviewData.currentQuestion + 1
      });

      // Clear audio chunks for next recording
      setAudioChunks([]);

      if (data.finished) {
        // All questions answered
        setIsFinished(true);
      } else if (data.next_question) {
        // Load next question
        setCurrentQuestion(data.next_question);
        setProgress({ 
          current: data.next_question.number, 
          total: interviewData.totalQuestions 
        });
        // Auto-play next question
        playQuestionAudio(data.next_question);
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToFeedback = () => {
    navigate('/results');
  };

  if (!interviewData) {
    return null;
  }

  // Finished state
  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card text-center">
          <CheckCircle className="h-16 w-16 text-success-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            All Questions Completed!
          </h2>
          <p className="text-gray-600 mb-6">
            Great job! You've answered all 5 questions. 
            Click below to get your detailed feedback and performance evaluation.
          </p>
          <button
            onClick={goToFeedback}
            className="btn-primary mx-auto"
          >
            Get Feedback
          </button>
        </div>
      </div>
    );
  }

  // Playing introduction
  if (isPlayingIntro) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card text-center">
          <Volume2 className="h-16 w-16 text-primary-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Your Excel Interview
          </h2>
          <p className="text-gray-600 mb-6">
            Please listen to the AI introduction...
          </p>
          <div className="flex items-center justify-center space-x-2 text-primary-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-sm font-medium">Playing audio...</span>
          </div>
          {introPlayBlocked && (
            <div className="mt-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.play().then(() => setIntroPlayBlocked(false)).catch(() => {});
                  }
                }}
                className="btn-primary"
              >
                Tap to Play Introduction
              </button>
            </div>
          )}
        </div>
        {/* Hidden audio player (ensure present during intro) */}
        <audio
          ref={audioRef}
          onEnded={handleIntroductionEnd}
          onCanPlay={() => setIntroPlayBlocked(false)}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {progress.current} of {progress.total}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((progress.current / progress.total) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="card mb-6">
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold">
                  {currentQuestion.number}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Question {currentQuestion.number}
              </h3>
              <p className="text-gray-700 text-lg">
                {currentQuestion.question}
              </p>
              {isPlayingQuestion && (
                <div className="mt-3 flex items-center space-x-2 text-primary-600">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Playing question audio...</span>
                </div>
              )}
              {questionPlayBlocked && (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.play().then(() => setQuestionPlayBlocked(false)).catch(() => {});
                      }
                    }}
                    className="btn-primary"
                  >
                    Tap to Play Question
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recording Interface */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Record Your Answer
        </h3>
        
        <div className="text-center">
          {!isRecording && audioChunks.length === 0 && (
            <p className="text-gray-600 mb-6">
              Click the microphone to start recording your answer
            </p>
          )}

          {isRecording && (
            <p className="text-red-600 font-medium mb-6 animate-pulse">
              🔴 Recording... Click again to stop
            </p>
          )}

          {!isRecording && audioChunks.length > 0 && (
            <p className="text-success-600 font-medium mb-6">
              ✓ Recording complete! Click submit to continue
            </p>
          )}

          {/* Microphone Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isSubmitting || isPlayingQuestion}
            className={`mx-auto flex items-center justify-center w-24 h-24 rounded-full transition-all shadow-lg ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-primary-600 hover:bg-primary-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <MicOff className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            {isRecording ? 'Speak clearly into your microphone' : 'Hold and speak your answer'}
          </p>
        </div>

        {/* Submit Button */}
        {!isRecording && audioChunks.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={submitAnswer}
              disabled={isSubmitting}
              className="btn-primary flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Answer</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Success</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Speak clearly and at a moderate pace</li>
          <li>• Provide specific examples when possible</li>
          <li>• Take your time - quality over speed</li>
          <li>• You can re-record before submitting</li>
        </ul>
      </div>

      {/* Hidden audio player */}
      <audio
        ref={audioRef}
        onEnded={isPlayingIntro ? handleIntroductionEnd : handleQuestionAudioEnd}
        onError={() => { setQuestionPlayBlocked(true); setIsPlayingQuestion(false); }}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default InterviewPage;
