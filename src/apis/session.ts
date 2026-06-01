const BASE_URL = "https://interviewmate-backend-5agn.onrender.com";

export type CreateSessionRequest = {
  mode: string;
  totalQuestionCount: number;
};

export type CreateSessionResponse = {
  sessionId: number;
  sessionUuid: string;
  mode: string;
  status: string;
  totalQuestionCount: number;
};

export type EndSessionResponse = {
  message: string;
  sessionId: number;
  status: string;
};

export type SaveUserInputRequest = {
  sessionId: number;
  userPrompt: string;
};

export type SaveUserInputResponse = {
  inputId: number;
  sessionId: number;
  userPrompt: string;
};

export const createInterviewSession = async (
  body: CreateSessionRequest
): Promise<CreateSessionResponse> => {
  const response = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("면접 세션 시작 실패:", response.status, errorText);
    throw new Error("면접 세션 시작에 실패했습니다.");
  }

  return response.json();
};

export const saveUserInput = async (
  body: SaveUserInputRequest
): Promise<SaveUserInputResponse> => {
  const response = await fetch(`${BASE_URL}/api/inputs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("사용자 입력 저장 실패:", response.status, errorText);
    throw new Error("사용자 입력 저장에 실패했습니다.");
  }

  return response.json();
};

export const endInterviewSession = async (
  sessionId: number
): Promise<EndSessionResponse> => {
  const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}/end`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("면접 세션 종료 실패:", response.status, errorText);
    throw new Error("면접 세션 종료에 실패했습니다.");
  }

  return response.json();
};