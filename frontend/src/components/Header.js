import React from 'react';
import { FileSpreadsheet, Brain } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-8 w-8 text-primary-600" />
              <Brain className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Excel Skills Interviewer
              </h1>
              <p className="text-sm text-gray-500">
                AI-Powered Assessment Platform
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Powered by OpenAI GPT-4
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

