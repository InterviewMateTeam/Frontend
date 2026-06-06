const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type InterviewMode = "COMMON" | "ADVANCED";

export type InterviewStage = "INTRO" | "PERSONALITY" | "TECHNICAL" | "FINAL";

export type GenerateQuestionRequest = {
  sessionId: number;
  mode: InterviewMode;
  stage: InterviewStage;
  previousAnswer?: string;
  userInput?: string;
  questionOrder: number;
};

export type GenerateQuestionResponse = {
  sessionId: number;
  mode: InterviewMode;
  stage: InterviewStage;
  questionOrder: number;
  question: string;

  // TTS 추가
  questionAudioBase64?: string;
  questionAudioContentType?: string;
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