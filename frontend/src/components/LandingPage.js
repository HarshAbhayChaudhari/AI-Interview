import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, FileSpreadsheet, Brain, Target, Clock } from 'lucide-react';

const LandingPage = ({ setInterviewData }) => {
  const [candidateName, setCandidateName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  const handleStartInterview = async () => {
    if (!candidateName.trim()) {
      alert('Please enter your name to continue');
      return;
    }

    setIsStarting(true);
    
    try {
      const response = await fetch('/interview/start', {
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
        welcomeMessage: data.welcome_message,
        totalQuestions: data.total_questions,
        currentQuestion: 0,
        answers: []
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
          <Brain className="h-12 w-12 text-primary-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Excel Skills Assessment
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Test your Excel proficiency with our AI-powered interview system. 
          Get instant feedback and detailed performance analysis.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="card text-center">
          <Target className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Comprehensive Assessment</h3>
          <p className="text-gray-600">
            7 carefully crafted questions covering formulas, pivot tables, data analysis, and more.
          </p>
        </div>
        <div className="card text-center">
          <Brain className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Evaluation</h3>
          <p className="text-gray-600">
            Advanced GPT-4 evaluation with detailed feedback on technical accuracy and practical application.
          </p>
        </div>
        <div className="card text-center">
          <Clock className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Instant Results</h3>
          <p className="text-gray-600">
            Get immediate feedback after each question and a comprehensive report at the end.
          </p>
        </div>
      </div>

      {/* Start Interview Form */}
      <div className="card max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Start Your Interview</h2>
        
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
            />
          </div>
          
          <button
            onClick={handleStartInterview}
            disabled={isStarting}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Interview</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">What to Expect:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 7 Excel-related questions</li>
            <li>• 15-20 minutes total time</li>
            <li>• Immediate feedback after each answer</li>
            <li>• Detailed performance report</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

