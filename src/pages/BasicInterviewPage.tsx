import { useEffect, useRef, useState } from "react";

import mainBg from "../assets/main-bg.svg";
import micWhite from "../assets/mic-white.svg";
import stepCheckWhite from "../assets/check.svg";
import chatOrange from "../assets/chat-orange.svg";
import refreshBrown from "../assets/refresh-brown.svg";

import { postSttAudio } from "../apis/stt";
import { submitAnswer } from "../apis/answer";
import { generateQuestion, type InterviewStage } from "../apis/question";

import type { InterviewRecord } from "../App";

type BasicInterviewPageProps = {
  sessionId: number | null;
  onFinishInterview: (records: InterviewRecord[]) => void;
};

type InterviewStep = 0 | 1 | 2;
type LoadingType = "next" | "feedback" | null;

const steps: {
  title: string;
  subtitle: string;
  progressTitle: string;
  stage: InterviewStage;
  fallbackQuestion: string;
}[] = [
  {
    title: "자기소개",
    subtitle: "현재 진행",
    progressTitle: "자기소개",
    stage: "INTRODUCTION",
    fallbackQuestion: "안녕하세요. 먼저 자기소개를 해주세요.",
  },
  {
    title: "후속 질문",
    subtitle: "다음 제공",
    progressTitle: "후속 질문",
    stage: "PERSONALITY",
    fallbackQuestion:
      "좋습니다. 자기소개 내용을 바탕으로 후속 질문에 답변해 주세요.",
  },
  {
    title: "기타 인터뷰 질문",
    subtitle: "-",
    progressTitle: "기타 인터뷰 질문",
    stage: "TECHNICAL",
    fallbackQuestion: "마지막으로 직무 관련 질문에 답변해 주세요.",
  },
];

const BasicInterviewPage = ({
  sessionId,
  onFinishInterview,
}: BasicInterviewPageProps) => {
  const [currentStep, setCurrentStep] = useState<InterviewStep>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);

  const [myAnswer, setMyAnswer] = useState("");
  const [aiText, setAiText] = useState(steps[0].fallbackQuestion);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(
    null
  );

  const [loadingType, setLoadingType] = useState<LoadingType>(null);
  const [records, setRecords] = useState<InterviewRecord[]>([]);

  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const latestAnswerRef = useRef("");

  const currentTitle = steps[currentStep].progressTitle;

  useEffect(() => {
    requestQuestion(0);
  }, [sessionId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const requestQuestion = async (
    step: InterviewStep,
    previousAnswer = ""
  ) => {
    if (!sessionId) {
      setAiText(steps[step].fallbackQuestion);
      setCurrentQuestionId(null);
      return;
    }

    try {
      setIsQuestionLoading(true);

      const result = await generateQuestion({
        sessionId,
        mode: "BASIC",
        stage: steps[step].stage,
        previousAnswer,
        questionOrder: step + 1,
      });

      setAiText(result.questionText);
      setCurrentQuestionId(result.questionId);

      console.log("질문 생성 완료:", result);
    } catch (error) {
      console.error(error);
      setAiText(steps[step].fallbackQuestion);
      setCurrentQuestionId(null);
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const getCurrentAnswer = () => {
    return latestAnswerRef.current.trim() || myAnswer.trim();
  };

  const createCurrentRecord = (): InterviewRecord | null => {
    const answer = getCurrentAnswer();

    if (!answer) {
      return null;
    }

    return {
      stepTitle: steps[currentStep].title,
      aiQuestion: aiText,
      userAnswer: answer,
    };
  };

  const submitCurrentAnswer = async (answerText: string) => {
    const answerDuration = recordingStartedAt
      ? Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000))
      : 0;

    if (!currentQuestionId) {
      console.warn("currentQuestionId가 없어 답변 제출을 건너뜀");
      return;
    }

    const result = await submitAnswer({
      questionId: currentQuestionId,
      answerText,
      answerDuration,
    });

    console.log("답변 제출 완료:", result);
  };

  const moveToNextStepWithLoading = () => {
    if (currentStep >= 2) return;

    const currentRecord = createCurrentRecord();

    if (currentRecord) {
      setRecords((prev) => [...prev, currentRecord]);
    }

    setLoadingType("next");

    setTimeout(async () => {
      const nextStep = (currentStep + 1) as InterviewStep;

      setCurrentStep(nextStep);
      setMyAnswer("");
      latestAnswerRef.current = "";
      setCurrentQuestionId(null);
      setRecordingStartedAt(null);

      await requestQuestion(nextStep, currentRecord?.userAnswer ?? "");

      setLoadingType(null);
    }, 1200);
  };

  const handleStartRecording = async () => {
    if (loadingType || isSubmitting || isQuestionLoading) return;

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
          const trimmedText = text.trim();

          if (!trimmedText) {
            alert("음성이 잘 인식되지 않았어요. 다시 말해보세요.");
            return;
          }

          setMyAnswer(trimmedText);
          latestAnswerRef.current = trimmedText;

          await submitCurrentAnswer(trimmedText);

          if (currentStep < 2) {
            setTimeout(() => {
              moveToNextStepWithLoading();
            }, 500);
          }
        } catch (error) {
          console.error(error);
          alert("음성 변환 또는 답변 제출 중 오류가 발생했어요.");
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

  const handleFinishInterview = () => {
    if (isRecording) {
      alert("먼저 마이크를 다시 눌러 녹음을 종료해주세요.");
      return;
    }

    if (isSubmitting) {
      alert("음성을 텍스트로 변환하고 답변을 제출 중입니다. 잠시만 기다려주세요.");
      return;
    }

    if (isQuestionLoading) {
      alert("질문을 생성 중입니다. 잠시만 기다려주세요.");
      return;
    }

    const currentRecord = createCurrentRecord();

    const finalRecords = currentRecord
      ? [...records, currentRecord]
      : records;

    setLoadingType("feedback");

    setTimeout(() => {
      onFinishInterview(finalRecords);
    }, 1300);
  };

  if (loadingType) {
    return <InterviewLoadingPage type={loadingType} />;
  }

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      <img
        src={mainBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <main className="relative z-10 w-full min-h-screen flex justify-center px-[40px] py-[56px]">
        <div className="w-full max-w-[1280px] min-h-[calc(100vh-112px)] rounded-[2px] bg-white/10 flex flex-col items-center">
          <section className="text-center">
            <div className="flex items-center justify-center gap-[8px]">
              <span className="w-[12px] h-[12px] rounded-full bg-[#FF9029]" />

              <h1 className="text-[30px] font-bold text-[#734112]">
                {currentTitle} <span className="text-[#FF9029]">진행 중</span>
              </h1>
            </div>

            <p className="mt-[10px] text-[13px] font-semibold text-[#9A6A42]">
              마이크를 눌러 답변을 시작하세요
            </p>
          </section>

          <section className="mt-[30px] w-full max-w-[1113px] h-[118px] rounded-[10px] border border-[#FF9029]/50 bg-[#FFDDDD]/60 px-[66px] flex items-center">
            {steps.map((step, index) => (
              <StepBlock
                key={step.title}
                index={index}
                currentStep={currentStep}
                title={step.title}
                defaultSubtitle={step.subtitle}
              />
            ))}
          </section>

          <div className="mt-[34px] w-full max-w-[950px] h-px bg-[#E8DDD4]" />

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
                ? "음성을 텍스트로 변환하고 답변을 제출 중입니다"
                : isRecording
                ? "녹음 중 · 말을 마쳤다면 마이크를 한 번 더 눌러 종료하세요"
                : "면접 진행 중 · 마이크를 누르면 녹음이 시작됩니다"}
            </p>
          </div>

          <section className="mt-[22px] flex flex-col items-center">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isSubmitting || isQuestionLoading}
              className={`
                relative w-[112px] h-[112px] rounded-full bg-[#FF9029]
                flex items-center justify-center
                shadow-[0_0_0_12px_rgba(255,144,41,0.18),0_0_0_24px_rgba(255,144,41,0.08)]
                transition active:scale-95
                ${
                  isSubmitting || isQuestionLoading
                    ? "opacity-70 cursor-default"
                    : isRecording
                    ? "scale-105 animate-pulse cursor-pointer"
                    : "hover:scale-105 cursor-pointer"
                }
              `}
            >
              <img
                src={micWhite}
                alt="마이크"
                className="w-[46px] h-[46px] object-contain"
              />
            </button>

            <p className="mt-[20px] text-[18px] font-bold text-[#734112]">
              {isQuestionLoading
                ? "질문 생성 중"
                : isSubmitting
                ? "변환 및 제출 중"
                : isRecording
                ? "다 말했으면 마이크를 한 번 더 눌러 종료"
                : "답하여 말하기"}
            </p>

            <p className="mt-[6px] text-[12px] font-semibold text-[#8B6F58]">
              {isQuestionLoading
                ? "AI가 다음 면접 질문을 준비하고 있어요."
                : isSubmitting
                ? "녹음된 음성을 텍스트로 변환하고 답변을 저장하고 있어요."
                : isRecording
                ? "종료 후 자동으로 다음 단계 로딩 화면이 표시됩니다."
                : "마이크를 누르면 녹음이 시작됩니다."}
            </p>
          </section>

          <section className="mt-[34px] mb-[72px] w-full max-w-[1113px] grid grid-cols-2 gap-[42px]">
            <AnswerBox
              icon={chatOrange}
              refreshIcon={refreshBrown}
              title="AI 인터뷰어"
              buttonText="질문 다시 생성"
              text={isQuestionLoading ? "질문을 생성하고 있습니다." : aiText}
              onButtonClick={() =>
                requestQuestion(currentStep, getCurrentAnswer())
              }
            />

            <AnswerBox
              icon={chatOrange}
              title="나의 답변"
              buttonText="면접 끝내기"
              text={
                myAnswer ||
                (isSubmitting
                  ? "음성을 텍스트로 변환하고 답변을 제출하고 있습니다."
                  : "마이크를 누르고 답변하면 여기에 텍스트로 표시됩니다.")
              }
              onButtonClick={handleFinishInterview}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

type InterviewLoadingPageProps = {
  type: Exclude<LoadingType, null>;
};

const InterviewLoadingPage = ({ type }: InterviewLoadingPageProps) => {
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

type StepBlockProps = {
  index: number;
  currentStep: InterviewStep;
  title: string;
  defaultSubtitle: string;
};

const StepBlock = ({
  index,
  currentStep,
  title,
  defaultSubtitle,
}: StepBlockProps) => {
  const isDone = index < currentStep;
  const isCurrent = index === currentStep;
  const isLast = index === steps.length - 1;

  const circleClass = isDone || isCurrent ? "bg-[#FF9029]" : "bg-[#FFC38B]";
  const subtitle = isDone ? "완료" : isCurrent ? "현재 진행" : defaultSubtitle;

  return (
    <>
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
              isDone || isCurrent ? "text-[#FF9029]" : "text-[#9B7A60]"
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {!isLast && (
        <div className="flex-1 mx-[18px]">
          <div className="relative h-[4px] rounded-full bg-[#EAD6C6]">
            <div
              className={`absolute left-0 top-0 h-full rounded-full bg-[#FF9029] transition-all duration-300 ${
                index < currentStep ? "w-full" : "w-0"
              }`}
            />
          </div>
        </div>
      )}
    </>
  );
};

type AnswerBoxProps = {
  icon: string;
  refreshIcon?: string;
  title: string;
  buttonText: string;
  text?: string;
  onButtonClick?: () => void;
};

const AnswerBox = ({
  icon,
  refreshIcon,
  title,
  buttonText,
  text,
  onButtonClick,
}: AnswerBoxProps) => {
  return (
    <div className="relative h-[500px] rounded-[10px] border border-[#FF9029]/50 bg-[#FFFAF5]">
      <div className="absolute left-[16px] top-[14px] flex items-center gap-[8px]">
        <img src={icon} alt="" className="w-[22px] h-[22px] object-contain" />
        <p className="text-[15px] font-bold text-[#734112]">{title}</p>
      </div>

      <div className="absolute left-[20px] right-[20px] top-[58px] bottom-[56px] overflow-y-auto">
        <p
          className={`whitespace-pre-wrap text-[14px] leading-[24px] ${
            text ? "text-[#4A2A12]" : "text-[#B8A99B]"
          }`}
        >
          {text}
        </p>
      </div>

      <button
        type="button"
        onClick={onButtonClick}
        className={`
          absolute right-[16px] bottom-[14px] h-[28px] px-[12px] rounded-full
          flex items-center gap-[6px] text-[12px] font-bold
          ${
            onButtonClick
              ? "bg-white/80 text-[#734112] border border-[#D8BFA8] cursor-pointer hover:bg-[#FFF0E2]"
              : "bg-transparent text-[#734112] cursor-pointer"
          }
        `}
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