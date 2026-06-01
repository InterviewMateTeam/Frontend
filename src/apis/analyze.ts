const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type AnalyzeRequest = {
  answerText: string;
};

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

export const analyzeInterview = async (
  answerText: string
): Promise<AnalyzeResponse> => {
  const response = await fetch(`${BASE_URL}/api/gemini/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      answerText,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("전체 피드백 생성 실패:", response.status, errorText);
    throw new Error("전체 피드백 생성에 실패했습니다.");
  }

  return response.json();
};