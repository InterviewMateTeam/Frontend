import { useEffect, useRef, useState } from "react";

import mainBg from "../assets/main-bg.svg";
import micWhite from "../assets/mic-white.svg";

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

const INITIAL_SECONDS = 60;

const barHeights = [
  122, 122, 96, 70, 36, 36, 72, 98, 122, 122, 92, 70, 36, 36, 72, 84, 122,
  122, 96, 70, 36, 36, 72, 98, 122, 122, 96, 70, 36, 36,
];

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

      setQuestionText(result.question);

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

  const handleStartRecording = async () => {
    if (isSubmitting) return;

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

        if (audioBlob.size === 0) return;

        try {
          setIsSubmitting(true);

          const text = await postSttAudio(audioBlob);
          const trimmedText = text.trim();

          if (!trimmedText) {
            alert("음성이 잘 인식되지 않았어요. 다시 시도해주세요.");
            return;
          }

          setAnswer(trimmedText);

          try {
            await submitIntroAnswer(trimmedText);
          } catch (error) {
            console.warn(
              "답변 저장 API 실패. 피드백 직접 생성으로 진행합니다.",
              error
            );
          }
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
      const trimmedText = text.trim();

      if (!trimmedText) {
        alert("음성이 잘 인식되지 않았어요. 다른 파일로 다시 시도해주세요.");
        return;
      }

      setAnswer(trimmedText);

      try {
        await submitIntroAnswer(trimmedText, duration);
      } catch (error) {
        console.warn(
          "답변 저장 API 실패. 피드백 직접 생성으로 진행합니다.",
          error
        );
      }

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

    onFinishInterview(records);
  };

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      <img
        src={mainBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <main className="relative z-10 w-full min-h-screen flex justify-center px-[40px] py-[36px]">
        <div className="w-full max-w-[1200px] min-h-[calc(100vh-72px)] flex flex-col items-center">
          <section className="text-center">
            <div className="flex items-center justify-center gap-[8px]">
              <span className="w-[12px] h-[12px] rounded-full bg-[#FF9029]" />

              <h1 className="text-[30px] font-bold text-[#734112]">
                자기소개 <span className="text-[#FF9029]">진행 중</span>
              </h1>
            </div>

            <p className="mt-[10px] text-[13px] font-semibold text-[#9A6A42]">
              마이크 녹음 또는 오디오 파일 업로드로 답변할 수 있어요.
            </p>
          </section>

          <section className="mt-[28px] w-full max-w-[1060px] h-[72px] rounded-[10px] border border-[#FF9029]/40 bg-[#FFE9D5]/80 px-[60px] flex items-center justify-between">
            <StepItem title="준비하기" done />
            <StepItem title="말하기 (1분)" done={isRecording || !!answer} />
            <StepItem title="피드백 확인" done={false} />
          </section>

          <section className="mt-[42px] w-[420px] min-h-[580px] rounded-[10px] border border-[#FF9029]/35 bg-white/35 flex flex-col items-center px-[28px] py-[28px]">
            <div className="h-[26px] px-[16px] rounded-full bg-[#EEF3EA] flex items-center justify-center">
              <span className="w-[7px] h-[7px] rounded-full bg-[#95AA8D] mr-[6px]" />
              <p className="text-[12px] font-bold text-[#738267]">
                {isSubmitting
                  ? "음성 변환 중..."
                  : isRecording
                  ? "면접 진행 중..."
                  : "대기 중"}
              </p>
            </div>

            <section className="mt-[20px] w-full rounded-[10px] border border-[#FF9029]/35 bg-white/65 px-[18px] py-[14px]">
              <p className="text-[13px] font-bold text-[#FF9029]">AI 질문</p>

              <p className="mt-[8px] text-[14px] leading-[22px] font-semibold text-[#4A2A12] break-keep">
                {questionText}
              </p>
            </section>

            <p className="mt-[22px] text-[20px] font-bold text-[#4A2A12]">
              남은 시간
            </p>

            <p className="mt-[14px] text-[70px] leading-none font-bold text-[#FF9029]">
              {formatDisplayTime(timeLeft)}
            </p>

            <div className="relative mt-[28px] h-[160px] w-full overflow-hidden flex items-center justify-center">
              <div className="absolute left-1/2 top-1/2 flex h-[145px] w-[360px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[7px]">
                {barHeights.map((height, index) => (
                  <span
                    key={index}
                    className="voice-bar rounded-full bg-[#F7DEC1]"
                    style={{
                      width: "12px",
                      height: `${height}px`,
                      animationDuration: `${0.95 + (index % 4) * 0.12}s`,
                      animationDelay: `${index * 0.05}s`,
                      animationPlayState: isRecording ? "running" : "paused",
                      opacity: 0.95,
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleMicClick}
                disabled={isSubmitting}
                className={`relative z-10 flex h-[112px] w-[112px] items-center justify-center rounded-full transition ${
                  isSubmitting
                    ? "cursor-default opacity-70"
                    : "cursor-pointer hover:scale-[1.03]"
                }`}
              >
                <span
                  className={`absolute h-[128px] w-[128px] rounded-full bg-[#FFE2C4] ${
                    isRecording ? "mic-pulse-soft" : "opacity-60"
                  }`}
                />

                <span className="absolute h-[114px] w-[114px] rounded-full border border-[#F6D4B4] bg-[#FFF3E7]/70" />

                <span className="absolute h-[102px] w-[102px] rounded-full border border-[#EAB987] bg-[#FFE8D0]/85 shadow-[0_6px_16px_rgba(255,144,41,0.10)]" />

                <span className="relative z-10 flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#F2BD83] bg-[radial-gradient(circle_at_30%_30%,#FFD197_0%,#FFBC69_42%,#FFA13C_100%)] shadow-[0_10px_20px_rgba(255,144,41,0.16)]">
                  <img
                    src={micWhite}
                    alt="마이크"
                    className="h-[30px] w-[30px] object-contain"
                  />
                </span>
              </button>
            </div>

            <p className="mt-[12px] text-[22px] font-bold text-[#734112]">
              {isSubmitting
                ? "변환 중"
                : isRecording
                ? "다 말했으면 다시 누르기"
                : "탭하여 말하기"}
            </p>

            <p className="mt-[10px] text-[12px] leading-[18px] font-medium text-[#8B6F58] text-center">
              {isSubmitting
                ? "음성을 텍스트로 변환하고 답변을 처리하고 있어요."
                : isRecording
                ? "말을 마쳤다면 마이크를 한 번 더 눌러 종료하세요."
                : "마이크를 누르거나 오디오 파일을 업로드할 수 있어요."}
            </p>

            <label
              className={`
                mt-[16px] h-[34px] px-[18px] rounded-full border border-[#FF9029]/60
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

            <div className="mt-auto w-full rounded-[8px] border border-[#F0C6A4] bg-white/55 px-[16px] py-[14px]">
              <p className="text-[13px] font-bold text-[#FF9029]">TIP</p>
              <p className="mt-[8px] text-[12px] leading-[18px] text-[#8B6F58]">
                너무 빠르지 않게, 핵심 내용을 중심으로 말해보세요.
                자연스러운 목소리와 명확한 발음이 중요합니다.
              </p>
            </div>
          </section>

          <section className="mt-[20px] w-full max-w-[720px] rounded-[10px] border border-[#FF9029]/35 bg-white/65 px-[20px] py-[16px]">
            <p className="text-[15px] font-bold text-[#734112]">나의 답변</p>
            <p className="mt-[10px] whitespace-pre-wrap text-[13px] leading-[22px] text-[#4A2A12]">
              {answer ||
                "마이크로 답변하거나 오디오 파일을 업로드하면 여기에 텍스트로 표시됩니다."}
            </p>
          </section>

          <section className="mt-[24px] mb-[40px] w-full max-w-[1060px] flex justify-between">
            <button
              type="button"
              onClick={onGoHome}
              className="h-[34px] px-[16px] rounded-[6px] border border-[#D6BDA5] bg-white/75 text-[#734112] text-[13px] font-bold hover:bg-[#FFF7EF]"
            >
              ← 메인 화면으로
            </button>

            <button
              type="button"
              onClick={handleFinishInterview}
              className="h-[34px] px-[18px] rounded-[18px] border border-[#FF9029] bg-white/80 text-[#FF9029] text-[13px] font-bold hover:bg-[#FFF0E2]"
            >
              면접 끝내기
            </button>
          </section>
        </div>
      </main>

      <style>
        {`
          @keyframes voiceBar {
            0% {
              transform: scaleY(0.55);
              opacity: 0.45;
            }
            35% {
              transform: scaleY(1);
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

          .voice-bar {
            transform-origin: center;
            animation-name: voiceBar;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }

          @keyframes micPulseSoft {
            0% {
              transform: scale(0.96);
              opacity: 0.45;
            }
            50% {
              transform: scale(1.04);
              opacity: 0.18;
            }
            100% {
              transform: scale(0.96);
              opacity: 0.45;
            }
          }

          .mic-pulse-soft {
            animation: micPulseSoft 1.8s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

const StepItem = ({ title, done }: { title: string; done: boolean }) => {
  return (
    <div className="flex items-center gap-[12px]">
      <div
        className={`w-[36px] h-[36px] rounded-full flex items-center justify-center ${
          done ? "bg-[#FF9029]" : "bg-[#FFC38B]"
        }`}
      >
        {done && <span className="text-white text-[17px] font-bold">✓</span>}
      </div>

      <p className="text-[14px] font-bold text-[#734112]">{title}</p>
    </div>
  );
};

export default OneMinuteIntroPage;