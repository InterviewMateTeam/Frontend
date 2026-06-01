const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type InterviewMode = "BASIC" | "ADVANCED";

export type InterviewStage =
  | "INTRODUCTION"
  | "PERSONALITY"
  | "TECHNICAL"
  | "FINAL";

export type GenerateQuestionRequest = {
  sessionId: number;
  mode: InterviewMode;
  stage: InterviewStage;
  previousAnswer?: string;
  questionOrder: number;
};

export type GenerateQuestionResponse = {
  questionId: number;
  questionText: string;
  stage: InterviewStage;
  questionOrder: number;
};

export const generateQuestion = async (
  body: GenerateQuestionRequest
): Promise<GenerateQuestionResponse> => {
  const response = await fetch(`${BASE_URL}/api/gemini/question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("질문 생성 실패:", response.status, errorText);
    throw new Error("질문 생성에 실패했습니다.");
  }

  return response.json();
};