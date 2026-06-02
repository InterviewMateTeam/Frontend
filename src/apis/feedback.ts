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

const removeCodeBlock = (text: string) => {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
};

const parseFeedbackResponse = (rawText: string): FeedbackResponse => {
  const cleanedText = removeCodeBlock(rawText);

  const parsed = JSON.parse(cleanedText);

  // 백엔드가 { feedbackJson: "```json ... ```" } 형태로 주는 경우
  if (typeof parsed.feedbackJson === "string") {
    return JSON.parse(removeCodeBlock(parsed.feedbackJson));
  }

  // 백엔드가 { feedback: "```json ... ```" } 형태로 주는 경우
  if (typeof parsed.feedback === "string") {
    return JSON.parse(removeCodeBlock(parsed.feedback));
  }

  // 백엔드가 { feedbackJson: {...} } 형태로 주는 경우
  if (parsed.feedbackJson && typeof parsed.feedbackJson === "object") {
    return parsed.feedbackJson;
  }

  // 백엔드가 { feedback: {...} } 형태로 주는 경우
  if (parsed.feedback && typeof parsed.feedback === "object") {
    return parsed.feedback;
  }

  // 백엔드가 피드백 객체 자체를 바로 주는 경우
  return parsed;
};

export const getFeedbackBySessionId = async (
  sessionId: number
): Promise<FeedbackResponse> => {
  const response = await fetch(`${BASE_URL}/api/feedback/${sessionId}`, {
    method: "GET",
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error("피드백 조회 실패:", response.status, rawText);
    throw new Error("피드백 조회에 실패했습니다.");
  }

  try {
    return parseFeedbackResponse(rawText);
  } catch (error) {
    console.error("피드백 JSON 파싱 실패:", error);
    console.error("피드백 원본 응답:", rawText);
    throw new Error("피드백 데이터 형식이 올바르지 않습니다.");
  }
};