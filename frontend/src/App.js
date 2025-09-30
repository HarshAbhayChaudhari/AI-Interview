import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import InterviewPage from './components/InterviewPage';
import ResultsPage from './components/ResultsPage';
import Header from './components/Header';

function App() {
  const [interviewData, setInterviewData] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route 
            path="/" 
            element={<LandingPage setInterviewData={setInterviewData} />} 
          />
          <Route 
            path="/interview" 
            element={<InterviewPage interviewData={interviewData} setInterviewData={setInterviewData} />} 
          />
          <Route 
            path="/results" 
            element={<ResultsPage interviewData={interviewData} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

