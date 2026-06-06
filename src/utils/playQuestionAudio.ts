type PlayQuestionAudioParams = {
  questionAudioBase64?: string;
  questionAudioContentType?: string;
};

export const playQuestionAudio = async ({
  questionAudioBase64,
  questionAudioContentType,
}: PlayQuestionAudioParams) => {
  if (!questionAudioBase64) return;

  const contentType = questionAudioContentType || "audio/mpeg";

  try {
    const audio = new Audio(
      `data:${contentType};base64,${questionAudioBase64}`
    );

    await audio.play();
  } catch (error) {
    console.warn("질문 TTS 자동 재생 실패:", error);
  }
};