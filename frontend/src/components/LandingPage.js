import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, FileSpreadsheet, Brain, Mic, AlertCircle, CheckCircle } from 'lucide-react';

const LandingPage = ({ setInterviewData }) => {
  const [candidateName, setCandidateName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [micPermission, setMicPermission] = useState(null); // null, 'granted', 'denied', 'checking'
  const [micError, setMicError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check microphone permission on mount
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    setMicPermission('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Got permission, stop the stream
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      setMicError('');
    } catch (error) {
      console.error('Microphone permission error:', error);
      setMicPermission('denied');
      if (error.name === 'NotAllowedError') {
        setMicError('Microphone permission denied. Please enable microphone access to continue.');
      } else if (error.name === 'NotFoundError') {
        setMicError('No microphone found. Please connect a microphone to continue.');
      } else {
        setMicError('Unable to access microphone. Please check your browser settings.');
      }
    }
  };

  const handleStartInterview = async () => {
    if (!candidateName.trim()) {
      alert('Please enter your name to continue');
      return;
    }

    // Force microphone check before starting
    if (micPermission !== 'granted') {
      alert('Microphone access is required for the voice interview. Please enable it and try again.');
      return;
    }

    setIsStarting(true);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_name: candidateName.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview');
      }

      const data = await response.json();
      
      setInterviewData({
        sessionId: data.session_id,
        candidateName: candidateName.trim(),
        introductionAudioUrl: data.introduction_audio_url,
        firstQuestion: data.first_question,
        totalQuestions: data.total_questions,
        currentQuestion: 0,
        questions: []
      });

      navigate('/interview');
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center space-x-4 mb-6">
          <FileSpreadsheet className="h-16 w-16 text-primary-600" />
          <Mic className="h-12 w-12 text-primary-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Excel Voice Interview
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          AI-powered voice interview system to assess your Excel skills. 
          Speak your answers naturally and receive detailed feedback.
        </p>
      </div>

      {/* Microphone Permission Status */}
      <div className="card max-w-md mx-auto mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Microphone Access</h3>
        
        {micPermission === 'checking' && (
          <div className="flex items-center space-x-3 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span>Checking microphone access...</span>
          </div>
        )}

        {micPermission === 'granted' && (
          <div className="flex items-center space-x-3 text-success-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Microphone access granted ✓</span>
          </div>
        )}

        {micPermission === 'denied' && (
          <div>
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Microphone access required</span>
            </div>
            <p className="text-sm text-red-700 mb-3">{micError}</p>
            <button
              onClick={checkMicrophonePermission}
              className="btn-secondary text-sm"
            >
              Try Again
            </button>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900 font-medium mb-2">How to enable microphone:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Click the lock/info icon in your browser's address bar</li>
                <li>Find "Microphone" in permissions</li>
                <li>Set it to "Allow"</li>
                <li>Refresh this page</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Interview Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card text-center">
          <Mic className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Voice-Only Interview</h3>
          <p className="text-gray-600 text-sm">
            Speak your answers naturally. No typing required.
          </p>
        </div>
        <div className="card text-center">
          <Brain className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Evaluation</h3>
          <p className="text-gray-600 text-sm">
            Advanced AI analyzes your responses for technical accuracy and clarity.
          </p>
        </div>
        <div className="card text-center">
          <FileSpreadsheet className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">5 Excel Questions</h3>
          <p className="text-gray-600 text-sm">
            Covering formulas, pivot tables, data analysis, and more.
          </p>
        </div>
      </div>

      {/* Start Interview Form */}
      <div className="card max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Start Voice Interview</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="candidateName"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="input-field"
              placeholder="Enter your full name"
              onKeyPress={(e) => e.key === 'Enter' && handleStartInterview()}
              disabled={micPermission !== 'granted'}
            />
          </div>
          
          <button
            onClick={handleStartInterview}
            disabled={isStarting || !candidateName.trim() || micPermission !== 'granted'}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Voice Interview</span>
              </>
            )}
          </button>

          {micPermission !== 'granted' && (
            <p className="text-xs text-center text-red-600">
              ⚠️ Microphone access required to start
            </p>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">What to Expect:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• AI introduction (voice)</li>
            <li>• 5 Excel-related questions</li>
            <li>• Record voice answers</li>
            <li>• 10-15 minutes total time</li>
            <li>• Detailed feedback at the end</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
