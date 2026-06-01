import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import BasicInterviewPage from "./pages/BasicInterviewPage";
import OneMinuteIntroPage from "./pages/OneMinuteIntroPage";
import FeedbackPage from "./pages/FeedbackPage";

import {
  createInterviewSession,
  endInterviewSession,
  saveUserInput,
  type CreateSessionResponse,
} from "./apis/session";

import {
  getFeedbackBySessionId,
  type FeedbackResponse,
} from "./apis/feedback";

export type InterviewRecord = {
  stepTitle: string;
  aiQuestion: string;
  userAnswer: string;
};

type FeedbackLocationState = {
  records?: InterviewRecord[];
  feedback?: FeedbackResponse | null;
};

function App() {
  const navigate = useNavigate();

  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>(
    []
  );

  const [currentSession, setCurrentSession] =
    useState<CreateSessionResponse | null>(null);

  const [feedbackResult, setFeedbackResult] =
    useState<FeedbackResponse | null>(null);

  const handleGoHome = () => {
    setInterviewRecords([]);
    setCurrentSession(null);
    setFeedbackResult(null);
    navigate("/home");
  };

  const handleStartCommonInterview = async (userPrompt: string) => {
    try {
      const session = await createInterviewSession({
        mode: "MOCK",
        totalQuestionCount: 3,
      });

      console.log("면접 세션 시작:", session);

      await saveUserInput({
        sessionId: session.sessionId,
        userPrompt,
      });

      console.log("사용자 입력 저장 완료");

      setCurrentSession(session);
      setFeedbackResult(null);
      navigate("/interview/common");
    } catch (error) {
      console.error(error);
      alert("면접 시작 중 오류가 발생했어요.");
    }
  };

  const handleStartOneMinuteIntro = async (userPrompt: string) => {
    try {
      const session = await createInterviewSession({
        mode: "MOCK",
        totalQuestionCount: 1,
      });

      console.log("면접 세션 시작:", session);

      await saveUserInput({
        sessionId: session.sessionId,
        userPrompt,
      });

      console.log("사용자 입력 저장 완료");

      setCurrentSession(session);
      setFeedbackResult(null);
      navigate("/interview/intro");
    } catch (error) {
      console.error(error);
      alert("면접 시작 중 오류가 발생했어요.");
    }
  };

  const handleFinishInterview = async (records: InterviewRecord[]) => {
    try {
      let feedback: FeedbackResponse | null = null;

      if (currentSession?.sessionId) {
        const endResult = await endInterviewSession(currentSession.sessionId);
        console.log("면접 세션 종료:", endResult);

        feedback = await getFeedbackBySessionId(currentSession.sessionId);
        console.log("피드백 조회 완료:", feedback);
      } else {
        console.warn("currentSession이 없어서 피드백 조회를 건너뜀");
      }

      setInterviewRecords(records);
      setFeedbackResult(feedback);

      navigate("/feedback", {
        state: {
          records,
          feedback,
        },
      });
    } catch (error) {
      console.error(error);
      alert("면접 종료 또는 피드백 조회 중 오류가 발생했어요.");

      setInterviewRecords(records);
      setFeedbackResult(null);

      navigate("/feedback", {
        state: {
          records,
          feedback: null,
        },
      });
    }
  };

  const handleRetry = () => {
    setInterviewRecords([]);
    setCurrentSession(null);
    setFeedbackResult(null);
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
          <BasicInterviewPage
            sessionId={currentSession?.sessionId ?? null}
            onFinishInterview={handleFinishInterview}
          />
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
          <FeedbackRoute
            fallbackRecords={interviewRecords}
            fallbackFeedback={feedbackResult}
            onGoHome={handleGoHome}
            onRetry={handleRetry}
          />
        }
      />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

type FeedbackRouteProps = {
  fallbackRecords: InterviewRecord[];
  fallbackFeedback: FeedbackResponse | null;
  onGoHome: () => void;
  onRetry: () => void;
};

const FeedbackRoute = ({
  fallbackRecords,
  fallbackFeedback,
  onGoHome,
  onRetry,
}: FeedbackRouteProps) => {
  const location = useLocation();
  const state = location.state as FeedbackLocationState | null;

  const records = state?.records ?? fallbackRecords;
  const feedback = state?.feedback ?? fallbackFeedback;

  return (
    <FeedbackPage
      records={records}
      feedback={feedback}
      onGoHome={onGoHome}
      onRetry={onRetry}
    />
  );
};

export default App;