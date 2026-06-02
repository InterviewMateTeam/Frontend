const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type AnalyzeSummary = {
  delivery: string;
  structure: string;
  confidence: string;
  timeManagement: string;
  logic: string;
};

export type AnalyzeDetailItem = {
  score: number;
  feedback: string;
};

export type AnalyzeDetails = {
  delivery: AnalyzeDetailItem;
  structure: AnalyzeDetailItem;
  confidence: AnalyzeDetailItem;
  timeManagement: AnalyzeDetailItem;
  logic: AnalyzeDetailItem;
};

export type AnalyzeResponse = {
  totalScore: number;
  oneLineReview: string;
  overallFeedback: string;
  summary: AnalyzeSummary;
  details: AnalyzeDetails;
  strengths: string[];
  improvements: string[];
};

const stripCodeFence = (value: string) => {
  return value
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
};

const parseAnalyzeResponse = (rawText: string): AnalyzeResponse => {
  const parsed = JSON.parse(stripCodeFence(rawText));

  if (typeof parsed.feedback === "string") {
    return JSON.parse(stripCodeFence(parsed.feedback));
  }

  if (typeof parsed.feedbackJson === "string") {
    return JSON.parse(stripCodeFence(parsed.feedbackJson));
  }

  return parsed;
};

export const analyzeInterview = async (
  answerText: string
): Promise<AnalyzeResponse> => {
  const trimmedAnswerText = answerText.trim();

  if (!trimmedAnswerText) {
    throw new Error("분석할 답변 텍스트가 없습니다.");
  }

  console.log("분석 요청 body:", {
    answerText: trimmedAnswerText,
  });

  const response = await fetch(`${BASE_URL}/api/gemini/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      answerText: trimmedAnswerText,
    }),
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error("전체 피드백 생성 실패:", response.status, rawText);
    throw new Error("전체 피드백 생성에 실패했습니다.");
  }

  return parseAnalyzeResponse(rawText);
};