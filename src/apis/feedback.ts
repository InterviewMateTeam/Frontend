const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type FeedbackSummary = {
  delivery: string;
  structure: string;
  confidence: string;
  timeManagement: string;
  logic: string;
};

export type FeedbackDetailItem = {
  score: number;
  feedback: string;
};

export type FeedbackDetails = {
  delivery: FeedbackDetailItem;
  structure: FeedbackDetailItem;
  confidence: FeedbackDetailItem;
  timeManagement: FeedbackDetailItem;
  logic: FeedbackDetailItem;
};

export type FeedbackResponse = {
  totalScore: number;
  oneLineReview: string;
  overallFeedback: string;
  summary: FeedbackSummary;
  details: FeedbackDetails;
  strengths: string[];
  improvements: string[];
};

export const getFeedbackBySessionId = async (
  sessionId: number
): Promise<FeedbackResponse> => {
  const response = await fetch(`${BASE_URL}/api/feedback/${sessionId}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("피드백 조회 실패:", response.status, errorText);
    throw new Error("피드백 조회에 실패했습니다.");
  }

  return response.json();
};