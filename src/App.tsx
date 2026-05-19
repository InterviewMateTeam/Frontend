import { useState } from "react";
import HomePage from "./pages/HomePage";
import BasicInterviewPage from "./pages/BasicInterviewPage";
import FeedbackPage from "./pages/FeedbackPage";

type Page = "home" | "loading" | "basicInterview" | "feedback";

export type InterviewRecord = {
  stepTitle: string;
  aiQuestion: string;
  userAnswer: string;
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>(
    []
  );

  const handleStartBasicInterview = () => {
    setPage("loading");

    setTimeout(() => {
      setPage("basicInterview");
    }, 1200);
  };

  const handleFinishInterview = (records: InterviewRecord[]) => {
    setInterviewRecords(records);
    setPage("loading");

    setTimeout(() => {
      setPage("feedback");
    }, 1300);
  };

  if (page === "loading") {
    return <LoadingPage />;
  }

  if (page === "basicInterview") {
    return <BasicInterviewPage onFinishInterview={handleFinishInterview} />;
  }

  if (page === "feedback") {
    return (
      <FeedbackPage
        records={interviewRecords}
        onGoHome={() => setPage("home")}
        onRetry={() => setPage("basicInterview")}
      />
    );
  }

  return <HomePage onStartBasicInterview={handleStartBasicInterview} />;
}

const LoadingPage = () => {
  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-hidden flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-[10px] h-[84px]">
          <span className="loading-bar" style={{ animationDelay: "0s" }} />
          <span className="loading-bar" style={{ animationDelay: "0.12s" }} />
          <span className="loading-bar" style={{ animationDelay: "0.24s" }} />
          <span className="loading-bar" style={{ animationDelay: "0.36s" }} />
          <span className="loading-bar" style={{ animationDelay: "0.48s" }} />
        </div>

        <p className="mt-[26px] text-[42px] font-bold text-[#FFE2C6]">
          피드백 단계로 넘어갑니다
        </p>
      </div>
    </div>
  );
};

export default App;