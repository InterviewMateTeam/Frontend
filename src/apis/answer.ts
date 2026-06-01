const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type SubmitAnswerRequest = {
  questionId: number;
  answerText: string;
  answerDuration: number;
};

export type SubmitAnswerResponse = {
  answerId: number;
  answerText: string;
  answerDuration: number;
};

export const submitAnswer = async (
  body: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> => {
  const response = await fetch(`${BASE_URL}/api/answers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("답변 제출 실패:", response.status, errorText);
    throw new Error("답변 제출에 실패했습니다.");
  }

  return response.json();
};