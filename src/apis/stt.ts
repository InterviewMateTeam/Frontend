export type SttResponse = {
  text: string;
};

const STT_API_URL = "https://interviewmate-backend-5agn.onrender.com/api/stt";

export const postSttAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();

  // 백엔드 명세상 key 이름은 반드시 audio
  formData.append("audio", audioBlob, "answer.webm");

  const response = await fetch(STT_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("STT 변환 요청에 실패했습니다.");
  }

  const data: SttResponse = await response.json();

  return data.text;
};