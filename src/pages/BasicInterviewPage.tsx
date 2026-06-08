import { useEffect, useRef, useState } from "react";

import stepCheckWhite from "../assets/check.svg";
import chatOrange from "../assets/chat-orange.svg";
import refreshBrown from "../assets/refresh-brown.svg";

import { postSttAudio } from "../apis/stt";
import { submitAnswer } from "../apis/answer";
import {
  generateQuestion,
  type InterviewMode,
  type InterviewStage,
} from "../apis/question";
import { getAudioDuration } from "../utils/audio";
import { playQuestionAudio } from "../utils/playQuestionAudio";

import type { InterviewRecord } from "../App";

type BasicInterviewPageProps = {
  sessionId: number | null;
  interviewMode: InterviewMode;
  onFinishInterview: (records: InterviewRecord[]) => void;
};

type LoadingType = "next" | "feedback" | null;

type QuestionStep = {
  title: string;
  progressTitle: string;
  stage: InterviewStage;
  fallbackQuestion: string;
};

const questionSteps: QuestionStep[] = [
  {
    title: "자기소개",
    progressTitle: "자기소개",
    stage: "INTRO",
    fallbackQuestion: "안녕하세요. 먼저 자기소개를 해주세요.",
  },
  {
    title: "후속 질문 1",
    progressTitle: "후속 질문 1/5",
    stage: "PERSONALITY",
    fallbackQuestion: "앞선 답변을 바탕으로 조금 더 구체적으로 설명해주세요.",
  },
  {
    title: "후속 질문 2",
    progressTitle: "후속 질문 2/5",
    stage: "PERSONALITY",
    fallbackQuestion: "해당 경험에서 본인의 역할을 더 설명해주세요.",
  },
  {
    title: "후속 질문 3",
    progressTitle: "후속 질문 3/5",
    stage: "PERSONALITY",
    fallbackQuestion: "문제를 해결하는 과정에서 어려웠던 점은 무엇인가요?",
  },
  {
    title: "후속 질문 4",
    progressTitle: "후속 질문 4/5",
    stage: "PERSONALITY",
    fallbackQuestion: "그 경험을 통해 배운 점은 무엇인가요?",
  },
  {
    title: "후속 질문 5",
    progressTitle: "후속 질문 5/5",
    stage: "PERSONALITY",
    fallbackQuestion: "비슷한 상황이 다시 온다면 어떻게 개선하고 싶나요?",
  },
  {
    title: "기타 인터뷰",
    progressTitle: "기타 인터뷰",
    stage: "FINAL",
    fallbackQuestion: "마지막으로 면접에서 더 하고 싶은 말이 있나요?",
  },
];

const getBigStepIndex = (questionIndex: number) => {
  if (questionIndex === 0) return 0;
  if (questionIndex >= 1 && questionIndex <= 5) return 1;
  return 2;
};

const getBigStepSubtitle = (questionIndex: number) => {
  if (questionIndex === 0) return "현재 진행";
  if (questionIndex >= 1 && questionIndex <= 5) {
    return `${questionIndex}/5 진행`;
  }
  return "현재 진행";
};

const BasicInterviewPage = ({
  sessionId,
  interviewMode,
  onFinishInterview,
}: BasicInterviewPageProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);

  const [myAnswer, setMyAnswer] = useState("");
  const [aiText, setAiText] = useState(questionSteps[0].fallbackQuestion);

  const [loadingType, setLoadingType] = useState<LoadingType>(null);
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const latestAnswerRef = useRef("");

  const currentQuestion = questionSteps[currentQuestionIndex];
  const currentTitle = currentQuestion.progressTitle;
  const currentBigStep = getBigStepIndex(currentQuestionIndex);
  const isLastQuestion = currentQuestionIndex === questionSteps.length - 1;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setRecords([]);
    setMyAnswer("");
    latestAnswerRef.current = "";
    setRecordingStartedAt(null);
    setAiText(questionSteps[0].fallbackQuestion);
    requestQuestion(0);
  }, [sessionId, interviewMode]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const requestQuestion = async (
    questionIndex: number,
    previousAnswer = ""
  ) => {
    const targetQuestion = questionSteps[questionIndex];

    if (!sessionId) {
      setAiText(targetQuestion.fallbackQuestion);
      return;
    }

    try {
      setIsQuestionLoading(true);

      const result = await generateQuestion({
        sessionId,
        mode: interviewMode,
        stage: targetQuestion.stage,
        previousAnswer,
        userInput: "",
        questionOrder: questionIndex + 1,
      });

      console.log("질문 생성 완료:", result);

      setAiText(result.question);

      await playQuestionAudio({
        questionAudioBase64: result.questionAudioBase64,
        questionAudioContentType: result.questionAudioContentType,
      });
    } catch (error) {
      console.error(error);
      setAiText(targetQuestion.fallbackQuestion);
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const getCurrentAnswer = () => {
    return latestAnswerRef.current.trim() || myAnswer.trim();
  };

  const createCurrentRecord = (answerOverride?: string): InterviewRecord | null => {
    const answer = (answerOverride ?? getCurrentAnswer()).trim();

    if (!answer) return null;

    return {
      stepTitle: currentQuestion.title,
      aiQuestion: aiText,
      userAnswer: answer,
    };
  };

  const submitCurrentAnswer = async (
    answerText: string,
    durationOverride?: number
  ) => {
    const rawDuration =
      durationOverride ??
      (recordingStartedAt
        ? Math.round((Date.now() - recordingStartedAt) / 1000)
        : 1);

    const answerDuration = Math.max(1, rawDuration);

    if (!sessionId) {
      console.warn("sessionId가 없어 /api/answers 제출을 건너뜁니다.");
      return;
    }

    const result = await submitAnswer({
      sessionId,
      questionText: aiText || currentQuestion.fallbackQuestion,
      answerText,
      answerDuration,
    });

    console.log("답변 제출 완료:", result);
  };

  const finishInterviewWithAnswer = (answerText?: string) => {
    const currentRecord = createCurrentRecord(answerText);

    const finalRecords = currentRecord
      ? [...records, currentRecord]
      : records;

    if (finalRecords.length === 0) {
      alert("먼저 답변을 녹음하거나 오디오 파일을 업로드해주세요.");
      return;
    }

    setLoadingType("feedback");

    setTimeout(() => {
      onFinishInterview(finalRecords);
    }, 1300);
  };

  const moveToNextStepWithLoading = (answerOverride?: string) => {
    if (currentQuestionIndex >= questionSteps.length - 1) return;

    const currentRecord = createCurrentRecord(answerOverride);

    if (!currentRecord) {
      alert("먼저 답변을 녹음하거나 오디오 파일을 업로드해주세요.");
      return;
    }

    setRecords((prev) => [...prev, currentRecord]);
    setLoadingType("next");

    setTimeout(async () => {
      const nextQuestionIndex = currentQuestionIndex + 1;

      setCurrentQuestionIndex(nextQuestionIndex);
      setMyAnswer("");
      latestAnswerRef.current = "";
      setRecordingStartedAt(null);

      await requestQuestion(nextQuestionIndex, currentRecord.userAnswer);

      setLoadingType(null);
    }, 1200);
  };

  const processAnswerText = async (answerText: string, duration?: number) => {
    const trimmedText = answerText.trim();

    if (!trimmedText) {
      alert("음성이 잘 인식되지 않았어요. 다시 말해보세요.");
      return;
    }

    setMyAnswer(trimmedText);
    latestAnswerRef.current = trimmedText;

    try {
      await submitCurrentAnswer(trimmedText, duration);
    } catch (error) {
      console.warn("답변 저장 API 실패. 화면 진행은 계속합니다.", error);
    }

    if (isLastQuestion) {
      setTimeout(() => {
        finishInterviewWithAnswer(trimmedText);
      }, 500);
      return;
    }

    setTimeout(() => {
      moveToNextStepWithLoading(trimmedText);
    }, 500);
  };

  const handleStartRecording = async () => {
    if (loadingType || isSubmitting || isQuestionLoading || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setMyAnswer("");
        latestAnswerRef.current = "";
        setRecordingStartedAt(Date.now());
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (audioBlob.size === 0) {
          alert("녹음된 음성이 없습니다. 다시 시도해주세요.");
          return;
        }

        try {
          setIsSubmitting(true);

          const text = await postSttAudio(audioBlob);
          await processAnswerText(text);
        } catch (error) {
          console.error(error);
          alert("음성 변환 중 오류가 발생했어요.");
        } finally {
          setIsSubmitting(false);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error(error);
      alert("마이크 권한을 허용해주세요.");
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = async () => {
    if (loadingType || isSubmitting || isQuestionLoading) return;

    if (isRecording) {
      handleStopRecording();
      return;
    }

    await handleStartRecording();
  };

  const handleAudioFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (loadingType || isSubmitting || isQuestionLoading || isRecording) return;

    if (!file.type.startsWith("audio/")) {
      alert("오디오 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const duration = await getAudioDuration(file);
      const text = await postSttAudio(file);

      await processAnswerText(text, duration);

      console.log("업로드 파일 답변 처리 완료");
    } catch (error) {
      console.error(error);
      alert("오디오 파일 변환 중 오류가 발생했어요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishInterview = () => {
    if (isRecording) {
      alert("먼저 마이크를 다시 눌러 녹음을 종료해주세요.");
      return;
    }

    if (isSubmitting) {
      alert(
        "음성을 텍스트로 변환하고 답변을 제출 중입니다. 잠시만 기다려주세요."
      );
      return;
    }

    if (isQuestionLoading) {
      alert("질문을 생성 중입니다. 잠시만 기다려주세요.");
      return;
    }

    finishInterviewWithAnswer();
  };

  if (loadingType) {
    return <InterviewLoadingPage type={loadingType} />;
  }

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      <main className="relative z-10 w-full min-h-screen flex justify-center px-[40px] py-[56px]">
        <div className="w-full max-w-[1280px] min-h-[calc(100vh-112px)] rounded-[2px] bg-transparent flex flex-col items-center">
          <section className="text-center">
            <div className="flex items-center justify-center gap-[8px]">
              <span className="w-[12px] h-[12px] rounded-full bg-[#FF9029]" />

              <h1 className="text-[30px] font-bold text-[#734112]">
                {currentTitle} <span className="text-[#FF9029]">진행 중</span>
              </h1>
            </div>

            <p className="mt-[10px] text-[13px] font-semibold text-[#9A6A42]">
              {interviewMode === "COMMON"
                ? "공통 질문 면접 · 총 7개의 질문으로 진행됩니다."
                : "심화 꼬리 질문 면접 · 더 깊은 후속질문으로 진행됩니다."}
            </p>
          </section>

          <section className="mt-[30px] w-full max-w-[1113px] rounded-[12px] border border-[#F1BE8B] bg-[#FFF8F1] px-[66px] py-[24px] shadow-[0_6px_18px_rgba(115,65,18,0.04)] flex items-center">
            <BigStepBlock
              index={0}
              currentBigStep={currentBigStep}
              title="자기소개"
              subtitle={
                currentBigStep === 0
                  ? "현재 진행"
                  : currentBigStep > 0
                  ? "완료"
                  : "대기"
              }
            />

            <StepLine isDone={currentBigStep > 0} />

            <BigStepBlock
              index={1}
              currentBigStep={currentBigStep}
              title="후속 질문"
              subtitle={
                currentBigStep === 1
                  ? getBigStepSubtitle(currentQuestionIndex)
                  : currentBigStep > 1
                  ? "완료"
                  : "대기"
              }
            />

            <StepLine isDone={currentBigStep > 1} />

            <BigStepBlock
              index={2}
              currentBigStep={currentBigStep}
              title="기타 인터뷰"
              subtitle={
                currentBigStep === 2
                  ? "현재 진행"
                  : currentBigStep > 2
                  ? "완료"
                  : "대기"
              }
            />
          </section>

          <div className="mt-[28px] w-full max-w-[950px] h-px bg-[#E8DDD4]" />

          <StatusBadge
            isRecording={isRecording}
            isSubmitting={isSubmitting}
            isQuestionLoading={isQuestionLoading}
          />

          <section className="mt-[18px] flex flex-col items-center">
            <div className="relative flex items-center justify-center w-[380px] h-[172px] overflow-visible">
              {isRecording && (
                <>
                  <div className="absolute left-[8px] top-1/2 -translate-y-1/2 flex items-center gap-[7px]">
                    {[54, 82, 104, 74, 48, 36, 68, 92].map(
                      (height, index) => (
                        <span
                          key={`left-${index}`}
                          className="voice-wave-bar rounded-full bg-[#F7DEC1]"
                          style={{
                            width: "10px",
                            height: `${height}px`,
                            animationDelay: `${index * 0.08}s`,
                          }}
                        />
                      )
                    )}
                  </div>

                  <div className="absolute right-[8px] top-1/2 -translate-y-1/2 flex items-center gap-[7px]">
                    {[92, 68, 36, 48, 74, 104, 82, 54].map(
                      (height, index) => (
                        <span
                          key={`right-${index}`}
                          className="voice-wave-bar rounded-full bg-[#F7DEC1]"
                          style={{
                            width: "10px",
                            height: `${height}px`,
                            animationDelay: `${index * 0.08}s`,
                          }}
                        />
                      )
                    )}
                  </div>
                </>
              )}

              <div className="absolute w-[132px] h-[132px] rounded-full bg-[#FFDAB8]/45" />

              {isRecording && (
                <>
                  <div className="absolute w-[150px] h-[150px] rounded-full bg-[#FFE1C4]/45 mic-ring-pulse" />
                  <div className="absolute w-[122px] h-[122px] rounded-full bg-[#FFD0A1]/35 mic-ring-pulse-delayed" />
                </>
              )}

              <div className="absolute w-[110px] h-[110px] rounded-full bg-[#FFF0E1]" />

              <button
                type="button"
                onClick={handleMicClick}
                disabled={isSubmitting || isQuestionLoading}
                className={`
                  relative z-10 w-[86px] h-[86px] rounded-full border-none outline-none
                  flex items-center justify-center
                  transition-transform duration-200
                  ${
                    isRecording
                      ? "bg-[#FF962E] scale-105 shadow-[0_0_0_8px_rgba(255,150,46,0.12),0_10px_24px_rgba(255,150,46,0.28)]"
                      : "bg-[#FF962E] hover:scale-105 shadow-[0_8px_22px_rgba(255,150,46,0.22)]"
                  }
                  ${
                    isSubmitting || isQuestionLoading
                      ? "opacity-70 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                `}
              >
                <MicIcon />
              </button>
            </div>

            <label
              className={`
                mt-[6px] h-[34px] px-[18px] rounded-full border border-[#FF9029]/60
                bg-white/80 text-[#FF9029] text-[12px] font-bold
                flex items-center justify-center cursor-pointer
                hover:bg-[#FFF0E2] transition
                ${
                  isSubmitting || isQuestionLoading || isRecording
                    ? "opacity-60 pointer-events-none"
                    : ""
                }
              `}
            >
              오디오 파일 업로드
              <input
                type="file"
                accept="audio/*,.webm,.wav,.mp3,.m4a"
                onChange={handleAudioFileUpload}
                className="hidden"
              />
            </label>

            <p className="mt-[16px] text-[18px] font-bold text-[#734112]">
              {isQuestionLoading
                ? "질문 생성 중"
                : isSubmitting
                ? "변환 및 제출 중"
                : isRecording
                ? "녹음 중"
                : "답하여 말하기"}
            </p>

            <p className="mt-[8px] text-[12px] font-medium text-[#A07A59]">
              {isQuestionLoading
                ? "AI가 다음 질문을 준비하고 있어요."
                : isSubmitting
                ? "음성을 텍스트로 변환하고 답변을 처리하고 있어요."
                : isRecording
                ? "답변을 마쳤다면 마이크를 한 번 더 눌러 종료하세요."
                : "마이크를 누르면 녹음이 시작됩니다."}
            </p>
          </section>

          <section className="mt-[28px] mb-[72px] w-full max-w-[1113px] grid grid-cols-2 gap-[42px]">
            <AnswerBox
              icon={chatOrange}
              refreshIcon={refreshBrown}
              title="AI 인터뷰어"
              buttonText="질문 다시 듣기"
              text={isQuestionLoading ? "질문을 생성하고 있습니다." : aiText}
              onButtonClick={() =>
                requestQuestion(currentQuestionIndex, getCurrentAnswer())
              }
            />

            <AnswerBox
              icon={chatOrange}
              title="나의 답변"
              buttonText={isLastQuestion ? "면접 끝내기" : "다음 질문으로"}
              text={
                myAnswer ||
                (isSubmitting
                  ? "음성을 텍스트로 변환하고 답변을 처리하고 있습니다."
                  : "마이크로 답변하거나 오디오 파일을 업로드하면 여기에 텍스트로 표시됩니다.")
              }
              onButtonClick={
                isLastQuestion ? handleFinishInterview : () => moveToNextStepWithLoading()
              }
            />
          </section>
        </div>
      </main>

      <style>
        {`
          @keyframes voiceWave {
            0% {
              transform: scaleY(0.52);
              opacity: 0.45;
            }
            35% {
              transform: scaleY(1.08);
              opacity: 0.95;
            }
            70% {
              transform: scaleY(0.72);
              opacity: 0.65;
            }
            100% {
              transform: scaleY(0.5);
              opacity: 0.42;
            }
          }

          .voice-wave-bar {
            transform-origin: center;
            animation-name: voiceWave;
            animation-duration: 0.95s;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }

          @keyframes micRingPulse {
            0% {
              transform: scale(0.92);
              opacity: 0.48;
            }
            50% {
              transform: scale(1.08);
              opacity: 0.18;
            }
            100% {
              transform: scale(0.92);
              opacity: 0.48;
            }
          }

          .mic-ring-pulse {
            animation: micRingPulse 1.45s ease-in-out infinite;
          }

          .mic-ring-pulse-delayed {
            animation: micRingPulse 1.45s ease-in-out infinite;
            animation-delay: 0.3s;
          }
        `}
      </style>
    </div>
  );
};

const MicIcon = () => {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 14.5C10.34 14.5 9 13.16 9 11.5V6.5C9 4.84 10.34 3.5 12 3.5C13.66 3.5 15 4.84 15 6.5V11.5C15 13.16 13.66 14.5 12 14.5Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 10.5V11.4C6.8 14.27 9.13 16.6 12 16.6C14.87 16.6 17.2 14.27 17.2 11.4V10.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16.6V20.2"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 20.2H14.8"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

const BigStepBlock = ({
  index,
  currentBigStep,
  title,
  subtitle,
}: {
  index: number;
  currentBigStep: number;
  title: string;
  subtitle: string;
}) => {
  const isDone = index < currentBigStep;
  const isCurrent = index === currentBigStep;

  const circleClass = isDone || isCurrent ? "bg-[#FF962E]" : "bg-[#F6C78F]";

  return (
    <div className="flex items-center gap-[14px] min-w-[190px]">
      <div
        className={`w-[44px] h-[44px] rounded-full flex items-center justify-center ${circleClass}`}
      >
        {isDone ? (
          <img
            src={stepCheckWhite}
            alt="완료"
            className="w-[22px] h-[22px] object-contain"
          />
        ) : isCurrent ? (
          <span className="w-[10px] h-[10px] rounded-full bg-white" />
        ) : null}
      </div>

      <div>
        <p className="text-[15px] font-bold text-[#734112]">{title}</p>
        <p
          className={`mt-[4px] text-[10px] font-semibold ${
            isDone || isCurrent ? "text-[#FF962E]" : "text-[#B78B66]"
          }`}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
};

const StepLine = ({ isDone }: { isDone: boolean }) => {
  return (
    <div className="flex-1 mx-[18px]">
      <div className="relative h-[4px] rounded-full bg-[#E9D3BC]">
        <div
          className={`absolute left-0 top-0 h-full rounded-full bg-[#FF962E] transition-all duration-300 ${
            isDone ? "w-full" : "w-0"
          }`}
        />
      </div>
    </div>
  );
};

const StatusBadge = ({
  isRecording,
  isSubmitting,
  isQuestionLoading,
}: {
  isRecording: boolean;
  isSubmitting: boolean;
  isQuestionLoading: boolean;
}) => {
  return (
    <div
      className={`
        mt-[22px] px-[22px] h-[36px] rounded-full
        flex items-center justify-center border shadow-sm
        ${
          isRecording
            ? "bg-[#FFF0E2] border-[#FF9029]/60"
            : isSubmitting || isQuestionLoading
            ? "bg-[#EEF3EA] border-[#C8D5C1]"
            : "bg-white/85 border-[#E4CDB8]"
        }
      `}
    >
      <span
        className={`
          w-[9px] h-[9px] rounded-full mr-[8px]
          ${
            isRecording
              ? "bg-[#FF9029] animate-pulse"
              : isSubmitting || isQuestionLoading
              ? "bg-[#95AA8D] animate-pulse"
              : "bg-[#C89568]"
          }
        `}
      />

      <p
        className={`
          text-[13px] font-bold
          ${
            isRecording
              ? "text-[#FF9029]"
              : isSubmitting || isQuestionLoading
              ? "text-[#738267]"
              : "text-[#734112]"
          }
        `}
      >
        {isQuestionLoading
          ? "AI 질문을 생성 중입니다"
          : isSubmitting
          ? "음성을 텍스트로 변환하고 답변을 처리 중입니다"
          : isRecording
          ? "녹음 중 · 답변을 마쳤다면 마이크를 한 번 더 눌러 종료하세요"
          : "면접 진행 중 · 마이크 녹음 또는 파일 업로드가 가능합니다"}
      </p>
    </div>
  );
};

const InterviewLoadingPage = ({
  type,
}: {
  type: Exclude<LoadingType, null>;
}) => {
  const isFeedback = type === "feedback";

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-hidden flex items-center justify-center">
      {isFeedback && (
        <div className="absolute inset-0 bg-[#9B9188]/45 backdrop-blur-[3px]" />
      )}

      <div className="relative z-10 flex flex-col items-center">
        <LoadingBars />

        <p className="mt-[26px] text-[42px] font-bold text-[#FFE2C6]">
          {isFeedback ? "피드백 단계로 넘어갑니다" : "다음 단계로 넘어갑니다"}
        </p>
      </div>
    </div>
  );
};

const LoadingBars = () => {
  return (
    <div className="flex items-center gap-[10px] h-[84px]">
      <span className="loading-bar" style={{ animationDelay: "0s" }} />
      <span className="loading-bar" style={{ animationDelay: "0.12s" }} />
      <span className="loading-bar" style={{ animationDelay: "0.24s" }} />
      <span className="loading-bar" style={{ animationDelay: "0.36s" }} />
      <span className="loading-bar" style={{ animationDelay: "0.48s" }} />
    </div>
  );
};

const AnswerBox = ({
  icon,
  refreshIcon,
  title,
  buttonText,
  text,
  onButtonClick,
}: {
  icon: string;
  refreshIcon?: string;
  title: string;
  buttonText: string;
  text?: string;
  onButtonClick?: () => void;
}) => {
  return (
    <div className="relative h-[500px] rounded-[10px] border border-[#FF9029]/50 bg-[#FFFAF5]">
      <div className="absolute left-[16px] top-[14px] flex items-center gap-[8px]">
        <img src={icon} alt="" className="w-[22px] h-[22px] object-contain" />
        <p className="text-[15px] font-bold text-[#734112]">{title}</p>
      </div>

      <div className="absolute left-[20px] right-[20px] top-[58px] bottom-[56px] overflow-y-auto">
        <p className="whitespace-pre-wrap text-[14px] leading-[24px] text-[#4A2A12]">
          {text}
        </p>
      </div>

      <button
        type="button"
        onClick={onButtonClick}
        className="absolute right-[16px] bottom-[14px] h-[28px] px-[12px] rounded-full flex items-center gap-[6px] text-[12px] font-bold bg-white/80 text-[#734112] border border-[#D8BFA8] cursor-pointer hover:bg-[#FFF0E2]"
      >
        {refreshIcon && (
          <img
            src={refreshIcon}
            alt=""
            className="w-[18px] h-[18px] object-contain"
          />
        )}
        {buttonText}
      </button>
    </div>
  );
};

export default BasicInterviewPage;