import { useEffect, useRef, useState } from "react";

import stepCheckWhite from "../assets/check.svg";
import chatOrange from "../assets/chat-orange.svg";
import refreshBrown from "../assets/refresh-brown.svg";

import type { InterviewRecord } from "../App";

import { postSttAudio } from "../apis/stt";
import { submitAnswer } from "../apis/answer";
import { generateQuestion } from "../apis/question";
import { getAudioDuration } from "../utils/audio";
import { playQuestionAudio } from "../utils/playQuestionAudio";

type OneMinuteIntroPageProps = {
  sessionId: number | null;
  onFinishInterview: (records: InterviewRecord[]) => void;
  onGoHome: () => void;
};

type LoadingType = "feedback" | null;

const INITIAL_SECONDS = 60;

const OneMinuteIntroPage = ({
  sessionId,
  onFinishInterview,
  onGoHome,
}: OneMinuteIntroPageProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INITIAL_SECONDS);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] =
    useState("1분 자기소개를 해주세요.");
  const [loadingType, setLoadingType] = useState<LoadingType>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    requestIntroQuestion();
  }, [sessionId]);

  useEffect(() => {
    let timer: number | null = null;

    if (isRecording && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleStopRecording();
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isRecording, timeLeft]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const requestIntroQuestion = async () => {
    if (!sessionId) {
      setQuestionText("1분 자기소개를 해주세요.");
      return;
    }

    try {
      const result = await generateQuestion({
        sessionId,
        mode: "COMMON",
        stage: "INTRO",
        previousAnswer: "",
        userInput: "",
        questionOrder: 1,
      });

      console.log("1분 자기소개 질문 생성 완료:", result);

      setQuestionText(result.question || "1분 자기소개를 해주세요.");

      await playQuestionAudio({
        questionAudioBase64: result.questionAudioBase64,
        questionAudioContentType: result.questionAudioContentType,
      });
    } catch (error) {
      console.error(error);
      setQuestionText("1분 자기소개를 해주세요.");
    }
  };

  const formatDisplayTime = (seconds: number) => {
    return `00:${String(seconds).padStart(2, "0")}`;
  };

  const submitIntroAnswer = async (
    answerText: string,
    durationOverride?: number
  ) => {
    if (!sessionId) {
      console.warn("sessionId가 없어 /api/answers 제출을 건너뜁니다.");
      return;
    }

    const rawDuration =
      durationOverride ??
      (recordingStartedAt
        ? Math.round((Date.now() - recordingStartedAt) / 1000)
        : 1);

    const answerDuration = Math.max(1, rawDuration);

    const result = await submitAnswer({
      sessionId,
      questionText: questionText || "1분 자기소개를 해주세요.",
      answerText,
      answerDuration,
    });

    console.log("1분 자기소개 답변 제출 완료:", result);
  };

  const processAnswerText = async (text: string, duration?: number) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      alert("음성이 잘 인식되지 않았어요. 다시 시도해주세요.");
      return;
    }

    setAnswer(trimmedText);

    try {
      await submitIntroAnswer(trimmedText, duration);
    } catch (error) {
      console.warn("답변 저장 API 실패. 피드백 조회 단계에서 처리합니다.", error);
    }
  };

  const handleStartRecording = async () => {
    if (isSubmitting || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
        setAnswer("");
        setTimeLeft(INITIAL_SECONDS);
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
          alert("음성 인식 중 오류가 발생했어요.");
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
    if (isSubmitting) return;

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

    if (isSubmitting || isRecording) return;

    if (!file.type.startsWith("audio/")) {
      alert("오디오 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const duration = await getAudioDuration(file);
      const text = await postSttAudio(file);

      await processAnswerText(text, duration);

      console.log("1분 자기소개 업로드 답변 처리 완료");
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

    const finalAnswer = answer.trim();

    if (!finalAnswer) {
      alert("녹음하거나 오디오 파일을 업로드한 뒤 면접을 끝낼 수 있어요.");
      return;
    }

    const records: InterviewRecord[] = [
      {
        stepTitle: "1분 자기소개",
        aiQuestion: questionText,
        userAnswer: finalAnswer,
      },
    ];

    setLoadingType("feedback");

    setTimeout(() => {
      onFinishInterview(records);
    }, 1300);
  };

  if (loadingType) {
    return <InterviewLoadingPage />;
  }

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      <main className="relative z-10 w-full min-h-screen flex justify-center px-[40px] py-[36px]">
        <div className="w-full max-w-[1120px] flex flex-col items-center">
          <section className="text-center">
            <div className="flex items-center justify-center gap-[8px]">
              <span className="w-[12px] h-[12px] rounded-full bg-[#FF9029]" />

              <h1 className="text-[30px] font-bold text-[#734112]">
                자기소개 <span className="text-[#FF9029]">진행 중</span>
              </h1>
            </div>

            <p className="mt-[10px] text-[13px] font-semibold text-[#9A6A42]">
              1분 안에 핵심 경험과 강점을 자연스럽게 말해보세요.
            </p>
          </section>

          <section className="mt-[24px] w-full max-w-[960px] rounded-[12px] border border-[#F1BE8B] bg-[#FFF8F1] px-[54px] py-[20px] shadow-[0_6px_18px_rgba(115,65,18,0.04)] flex items-center">
            <IntroStepBlock title="준비하기" isDone isCurrent={false} />

            <StepLine isDone />

            <IntroStepBlock
              title="말하기"
              isDone={!!answer}
              isCurrent={!answer}
              subtitle={answer ? "완료" : "현재 진행"}
            />

            <StepLine isDone={!!answer} />

            <IntroStepBlock
              title="피드백 확인"
              isDone={false}
              isCurrent={false}
              subtitle="대기"
            />
          </section>

          <div className="mt-[24px] w-full max-w-[860px] h-px bg-[#E8DDD4]" />

          <StatusBadge
            isRecording={isRecording}
            isSubmitting={isSubmitting}
            hasAnswer={!!answer}
          />

          <section className="mt-[18px] w-full max-w-[760px] rounded-[16px] border border-[#F1BE8B] bg-white/70 px-[34px] py-[22px] shadow-[0_8px_26px_rgba(115,65,18,0.06)] flex flex-col items-center">
            <div className="mt-[4px] flex flex-col items-center">
              <p className="text-[17px] font-bold text-[#4A2A12]">
                남은 시간
              </p>

              <p className="mt-[8px] text-[58px] leading-none font-bold text-[#FF9029]">
                {formatDisplayTime(timeLeft)}
              </p>
            </div>

            <section className="mt-[10px] flex flex-col items-center">
              <div className="relative flex items-center justify-center w-[380px] h-[148px] overflow-visible">
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

                <div className="absolute w-[122px] h-[122px] rounded-full bg-[#FFDAB8]/45" />

                {isRecording && (
                  <>
                    <div className="absolute w-[140px] h-[140px] rounded-full bg-[#FFE1C4]/45 mic-ring-pulse" />
                    <div className="absolute w-[112px] h-[112px] rounded-full bg-[#FFD0A1]/35 mic-ring-pulse-delayed" />
                  </>
                )}

                <div className="absolute w-[100px] h-[100px] rounded-full bg-[#FFF0E1]" />

                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isSubmitting}
                  className={`
                    relative z-10 w-[78px] h-[78px] rounded-full border-none outline-none
                    flex items-center justify-center transition-transform duration-200
                    ${
                      isRecording
                        ? "bg-[#FF962E] scale-105 shadow-[0_0_0_8px_rgba(255,150,46,0.12),0_10px_24px_rgba(255,150,46,0.28)]"
                        : "bg-[#FF962E] hover:scale-105 shadow-[0_8px_22px_rgba(255,150,46,0.22)]"
                    }
                    ${
                      isSubmitting
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
                  mt-[2px] h-[32px] px-[16px] rounded-full border border-[#FF9029]/60
                  bg-white/80 text-[#FF9029] text-[12px] font-bold
                  flex items-center justify-center cursor-pointer
                  hover:bg-[#FFF0E2] transition
                  ${
                    isSubmitting || isRecording
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

              <p className="mt-[12px] text-[18px] font-bold text-[#734112]">
                {isSubmitting
                  ? "변환 중"
                  : isRecording
                  ? "녹음 중"
                  : "답하여 말하기"}
              </p>

              <p className="mt-[6px] text-[12px] font-medium text-[#A07A59]">
                {isSubmitting
                  ? "음성을 텍스트로 변환하고 답변을 처리하고 있어요."
                  : isRecording
                  ? "답변을 마쳤다면 마이크를 한 번 더 눌러 종료하세요."
                  : "마이크를 누르면 녹음이 시작됩니다."}
              </p>
            </section>
          </section>

          <section className="mt-[22px] w-full max-w-[960px] grid grid-cols-2 gap-[28px]">
            <AnswerBox
              icon={chatOrange}
              refreshIcon={refreshBrown}
              title="AI 인터뷰어"
              buttonText="질문 다시 듣기"
              text={questionText}
              onButtonClick={requestIntroQuestion}
            />

            <AnswerBox
              icon={chatOrange}
              title="나의 답변"
              buttonText="면접 끝내기"
              text={
                answer ||
                (isSubmitting
                  ? "음성을 텍스트로 변환하고 있습니다."
                  : "마이크로 답변하거나 오디오 파일을 업로드하면 여기에 텍스트로 표시됩니다.")
              }
              onButtonClick={handleFinishInterview}
            />
          </section>

          <section className="mt-[20px] mb-[32px] w-full max-w-[960px] flex justify-start">
            <button
              type="button"
              onClick={onGoHome}
              className="h-[34px] px-[16px] rounded-[6px] border border-[#D6BDA5] bg-white/75 text-[#734112] text-[13px] font-bold hover:bg-[#FFF7EF]"
            >
              ← 메인 화면으로
            </button>
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

const IntroStepBlock = ({
  title,
  isDone,
  isCurrent,
  subtitle,
}: {
  title: string;
  isDone: boolean;
  isCurrent: boolean;
  subtitle?: string;
}) => {
  const circleClass = isDone || isCurrent ? "bg-[#FF962E]" : "bg-[#F6C78F]";
  const displaySubtitle = subtitle ?? (isDone ? "완료" : "대기");

  return (
    <div className="flex items-center gap-[14px] min-w-[160px]">
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
          {displaySubtitle}
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
  hasAnswer,
}: {
  isRecording: boolean;
  isSubmitting: boolean;
  hasAnswer: boolean;
}) => {
  return (
    <div
      className={`
        mt-[22px] px-[22px] h-[36px] rounded-full
        flex items-center justify-center border shadow-sm
        ${
          isRecording
            ? "bg-[#FFF0E2] border-[#FF9029]/60"
            : isSubmitting
            ? "bg-[#EEF3EA] border-[#C8D5C1]"
            : hasAnswer
            ? "bg-[#F0F8EE] border-[#BFD7B8]"
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
              : isSubmitting
              ? "bg-[#95AA8D] animate-pulse"
              : hasAnswer
              ? "bg-[#5CA55C]"
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
              : isSubmitting
              ? "text-[#738267]"
              : hasAnswer
              ? "text-[#5C8755]"
              : "text-[#734112]"
          }
        `}
      >
        {isSubmitting
          ? "음성을 텍스트로 변환하고 답변을 처리 중입니다"
          : isRecording
          ? "녹음 중 · 답변을 마쳤다면 마이크를 한 번 더 눌러 종료하세요"
          : hasAnswer
          ? "답변이 저장되었습니다 · 면접 끝내기를 눌러 피드백을 확인하세요"
          : "면접 진행 중 · 마이크 녹음 또는 파일 업로드가 가능합니다"}
      </p>
    </div>
  );
};

const InterviewLoadingPage = () => {
  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-[#9B9188]/45 backdrop-blur-[3px]" />

      <div className="relative z-10 flex flex-col items-center">
        <LoadingBars />

        <p className="mt-[26px] text-[42px] font-bold text-[#FFE2C6]">
          피드백 단계로 넘어갑니다
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

const MicIcon = () => {
  return (
    <svg
      width="32"
      height="32"
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
    <div className="relative min-h-[240px] rounded-[12px] border border-[#FF9029]/45 bg-[#FFFAF5]">
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
              : "bg-transparent text-[#734112] cursor-default"
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

export default OneMinuteIntroPage;