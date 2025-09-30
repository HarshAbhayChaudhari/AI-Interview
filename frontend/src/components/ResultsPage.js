import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Download,
  RotateCcw,
  Star
} from 'lucide-react';

const ResultsPage = ({ interviewData }) => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewData) {
      navigate('/');
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await fetch('/interview/finish', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: interviewData.sessionId
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error fetching results:', error);
        alert('Failed to load results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [interviewData, navigate]);

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

  const getRecommendationColor = (recommendation) => {
    if (recommendation.toLowerCase().includes('hire')) return 'text-success-600';
    if (recommendation.toLowerCase().includes('improvement')) return 'text-warning-600';
    return 'text-red-600';
  };

  const handleStartNewInterview = () => {
    navigate('/');
  };

  const handleDownloadReport = () => {
    if (!results) return;
    
    const reportData = {
      candidate: interviewData.candidateName,
      date: new Date().toLocaleDateString(),
      overallScore: results.overall_score,
      recommendation: results.recommendation,
      summary: results.summary,
      strengths: results.strengths,
      weaknesses: results.weaknesses,
      detailedFeedback: results.detailed_feedback
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel-interview-report-${interviewData.candidateName.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Generating Your Results
          </h2>
          <p className="text-gray-600">
            Please wait while we analyze your performance...
          </p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Results Not Available
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't generate your results. Please try again.
          </p>
          <button onClick={handleStartNewInterview} className="btn-primary">
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-success-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Interview Results
        </h1>
        <p className="text-lg text-gray-600">
          Congratulations, {interviewData.candidateName}! Here's your performance analysis.
        </p>
      </div>

      {/* Overall Score Card */}
      <div className="card mb-8">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-6xl font-bold text-primary-600 mb-2">
              {results.overall_score.toFixed(1)}
            </div>
            <div className="text-2xl text-gray-600 mb-4">out of 5.0</div>
            <span className={`score-badge ${getScoreColor(results.overall_score)} text-lg px-4 py-2`}>
              {getScoreText(results.overall_score)}
            </span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-lg font-medium text-gray-700">Recommendation:</span>
            <span className={`text-lg font-semibold ${getRecommendationColor(results.recommendation)}`}>
              {results.recommendation}
            </span>
          </div>
          
          <p className="text-gray-700 max-w-3xl mx-auto">
            {results.summary}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Strengths */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-success-600" />
            <h3 className="text-lg font-semibold text-gray-900">Strengths</h3>
          </div>
          <ul className="space-y-2">
            {results.strengths.map((strength, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-success-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown className="h-5 w-5 text-warning-600" />
            <h3 className="text-lg font-semibold text-gray-900">Areas for Improvement</h3>
          </div>
          <ul className="space-y-2">
            {results.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-warning-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="card mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <FileText className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Detailed Question Analysis</h3>
        </div>
        
        <div className="space-y-6">
          {results.detailed_feedback.map((feedback, index) => (
            <div key={index} className="border-l-4 border-primary-200 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  Question {feedback.question_id}
                </h4>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-warning-500" />
                  <span className={`score-badge ${getScoreColor(feedback.score)}`}>
                    {feedback.score}/5
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {feedback.question}
              </p>
              <p className="text-sm text-gray-700">
                {feedback.feedback}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleDownloadReport}
          className="btn-secondary flex items-center justify-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download Report</span>
        </button>
        
        <button
          onClick={handleStartNewInterview}
          className="btn-primary flex items-center justify-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Start New Interview</span>
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-sm text-gray-500">
        <p>
          This assessment was powered by OpenAI GPT-4 and designed to evaluate Excel proficiency.
        </p>
        <p className="mt-1">
          Results are for demonstration purposes and should be used as part of a comprehensive evaluation process.
        </p>
      </div>
    </div>
  );
};

export default ResultsPage;

