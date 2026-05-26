import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";

import HomePage from "./pages/HomePage";
import BasicInterviewPage from "./pages/BasicInterviewPage";
import FeedbackPage from "./pages/FeedbackPage";
import OneMinuteIntroPage from "./pages/OneMinuteIntroPage";

export type InterviewRecord = {
  stepTitle: string;
  aiQuestion: string;
  userAnswer: string;
};

function App() {
  const navigate = useNavigate();

  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>(
    []
  );

  const handleGoHome = () => {
    setInterviewRecords([]);
    navigate("/home");
  };

  const handleStartCommonInterview = () => {
    navigate("/interview/common");
  };

  const handleStartOneMinuteIntro = () => {
    navigate("/interview/intro");
  };

  const handleFinishInterview = (records: InterviewRecord[]) => {
    setInterviewRecords(records);
    navigate("/feedback");
  };

  const handleRetry = () => {
    setInterviewRecords([]);
    navigate("/home");
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />

      <Route
        path="/home"
        element={
          <HomePage
            onStartCommonInterview={handleStartCommonInterview}
            onStartOneMinuteIntro={handleStartOneMinuteIntro}
          />
        }
      />

      <Route
        path="/interview/common"
        element={
          <BasicInterviewPage onFinishInterview={handleFinishInterview} />
        }
      />

      <Route
        path="/interview/intro"
        element={
          <OneMinuteIntroPage
            onFinishInterview={handleFinishInterview}
            onGoHome={handleGoHome}
          />
        }
      />

      <Route
        path="/feedback"
        element={
          <FeedbackPage
            records={interviewRecords}
            onGoHome={handleGoHome}
            onRetry={handleRetry}
          />
        }
      />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;