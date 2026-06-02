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

import {
  analyzeInterview,
  type AnalyzeResponse,
} from "./apis/analyze";

export type InterviewRecord = {
  stepTitle: string;
  aiQuestion: string;
  userAnswer: string;
};

export type FeedbackData = FeedbackResponse | AnalyzeResponse;

type FeedbackLocationState = {
  records?: InterviewRecord[];
  feedback?: FeedbackData | null;
};

function App() {
  const navigate = useNavigate();

  const [interviewRecords, setInterviewRecords] = useState<InterviewRecord[]>(
    []
  );

  const [currentSession, setCurrentSession] =
    useState<CreateSessionResponse | null>(null);

  const [feedbackResult, setFeedbackResult] = useState<FeedbackData | null>(
    null
  );

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

  const makeAnalyzeText = (records: InterviewRecord[]) => {
    return records
      .map((record) => record.userAnswer)
      .filter((answer) => answer.trim().length > 0)
      .join("\n\n");
  };

  const handleFinishInterview = async (records: InterviewRecord[]) => {
    try {
      let feedback: FeedbackData | null = null;

      if (currentSession?.sessionId) {
        try {
          const endResult = await endInterviewSession(currentSession.sessionId);
          console.log("면접 세션 종료:", endResult);
        } catch (error) {
          console.warn("면접 종료 API 실패. 피드백 생성은 계속 진행합니다.", error);
        }

        try {
          feedback = await getFeedbackBySessionId(currentSession.sessionId);
          console.log("저장된 피드백 조회 완료:", feedback);
        } catch (error) {
          console.warn(
            "저장된 피드백 조회 실패. /api/gemini/analyze로 대체합니다.",
            error
          );
        }
      }

      if (!feedback) {
        const combinedAnswerText = makeAnalyzeText(records);

        console.log("Gemini analyze에 보낼 텍스트:", combinedAnswerText);

        if (combinedAnswerText.trim().length > 0) {
          feedback = await analyzeInterview(combinedAnswerText);
          console.log("Gemini 직접 피드백 생성 완료:", feedback);
        } else {
          console.warn("분석할 답변 텍스트가 없습니다.");
        }
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
      alert("피드백 생성 중 오류가 발생했어요.");

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
            sessionId={currentSession?.sessionId ?? null}
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
  fallbackFeedback: FeedbackData | null;
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