import { useEffect, useRef, useState } from "react";
import mainBg from "../assets/main-bg.svg";
import micWhite from "../assets/mic-white.svg";
import type { InterviewRecord } from "../App";
import { postSttAudio } from "../apis/stt";

type OneMinuteIntroPageProps = {
  onFinishInterview: (records: InterviewRecord[]) => void;
  onGoHome: () => void;
};

type StepStatus = "done" | "current" | "pending";

const INITIAL_SECONDS = 60;

const barHeights = [
  122, 122, 96, 70,
  36, 36,
  72, 98, 122, 122, 92, 70,
  36, 36,
  72, 84, 122, 122, 96, 70,
  36, 36,
  72, 98, 122, 122, 96, 70,
  36, 36,
];

const OneMinuteIntroPage = ({
  onFinishInterview,
  onGoHome,
}: OneMinuteIntroPageProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(INITIAL_SECONDS);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const formatDisplayTime = (seconds: number) => {
    return `${String(seconds).padStart(2, "0")}:00`;
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

          setAnswer(text);
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

  

  const handleFinishInterview = () => {
    const records: InterviewRecord[] = [
      {
        stepTitle: "1분 자기소개",
        aiQuestion: "1분 자기소개를 해주세요.",
        userAnswer:
          answer.trim() ||
          "아직 녹음된 답변이 없습니다. 마이크를 눌러 1분 자기소개를 진행해주세요.",
      },
    ];

    onFinishInterview(records);
  };

  return (
    <div className="relative w-screen min-h-screen overflow-hidden bg-[#FFF9F3]">
      <style>{`
        @keyframes voiceBar {
        0% {
            transform: scaleY(0.72);
            opacity: 0.55;
        }
        50% {
            transform: scaleY(1);
            opacity: 1;
        }
        100% {
            transform: scaleY(0.78);
            opacity: 0.62;
        }
        }

        @keyframes micPulse {
          0% {
            transform: scale(0.92);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.22;
          }
          100% {
            transform: scale(0.92);
            opacity: 0.55;
          }
        }


        .voice-bar {
          transform-origin: center;
          animation-name: voiceBar;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .mic-pulse {
          animation: micPulse 1.7s ease-in-out infinite;
        }

        .mic-float {
          animation: micFloat 1.6s ease-in-out infinite;
        }
      `}</style>

      <img
        src={mainBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <main className="relative z-10 min-h-screen px-[46px] py-[24px]">
        <section className="flex flex-col items-center">
          <div className="flex items-center gap-[10px]">
            <span className="w-[14px] h-[14px] rounded-full bg-[#FF9029]" />

            <h1 className="text-[24px] font-bold leading-none text-[#734112]">
              자기소개 <span className="text-[#FF9029]">진행 중</span>
            </h1>
          </div>

          <p className="mt-[18px] text-[13px] font-medium text-[#9B7A60]">
            1분 자기소개 시나리오입니다. 제한 시간은 1분이며, 시간 내에 말하기를 마치면 자동으로 녹음이 종료됩니다.
          </p>
        </section>

        <section className="mt-[28px] rounded-[8px] border border-[#F1B983] bg-[#FFE8D5]/92 px-[44px] py-[15px]">
          <div className="grid grid-cols-3 items-center">
            <StepItem title="준비하기" status="done" />
            <StepItem title="말하기 (1분)" status="current" />
            <StepItem title="피드백 확인" status="pending" />
          </div>
        </section>

        <section className="mt-[40px] flex justify-center">
          <div className="w-[430px] min-h-[590px] rounded-[8px] border border-[#F3C59E] bg-[#FFFCFA]/82 px-[34px] pt-[26px] pb-[24px] shadow-[0_6px_20px_rgba(89,50,14,0.05)]">
            <div className="flex h-full flex-col items-center">
              <div className="h-[28px] rounded-full bg-[#EEF3EA] px-[16px] flex items-center justify-center">
                <span className="text-[11px] font-semibold text-[#B6BFAF]">
                  {isSubmitting
                    ? "변환 진행 중..."
                    : isRecording
                    ? "녹음 진행 중..."
                    : "면접 진행 중..."}
                </span>
              </div>

              <div className="mt-[28px] text-center">
                <p className="text-[16px] font-bold text-[#5B3A1A]">
                  남은 시간
                </p>

                <p className="mt-[16px] text-[78px] leading-none font-bold tracking-[-3px] text-[#FF9029]">
                  {formatDisplayTime(timeLeft)}
                </p>
              </div>

              <div className="relative mt-[28px] h-[180px] w-full overflow-hidden flex items-center justify-center">
                <div className="absolute left-1/2 top-1/2 flex h-[150px] w-[360px] -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[7px]">
                    {barHeights.map((height, index) => (
                    <span
                        key={index}
                        className="voice-bar rounded-full bg-[#F7DEC1]"
                        style={{
                        width: "14px",
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
                    {/* 가장 바깥 은은한 glow */}
                    <span
                    className={`absolute w-[126px] h-[126px] rounded-full bg-[#FFD8B8] ${
                        isRecording ? "mic-pulse" : "opacity-50"
                    }`}
                    />

                    <span
                    className={`absolute w-[108px] h-[108px] rounded-full bg-[#FFC98C]/70 ${
                        isRecording ? "mic-pulse" : "opacity-60"
                    }`}
                    />

                    {/* 바깥 연한 링 */}
                    <span className="absolute h-[114px] w-[114px] rounded-full border border-[#F6D4B4] bg-[#FFF3E7]/70" />

                    {/* 중간 링 */}
                    <span className="absolute h-[102px] w-[102px] rounded-full border border-[#EAB987] bg-[#FFE8D0]/85 shadow-[0_6px_16px_rgba(255,144,41,0.10)]" />

                    {/* 실제 마이크 버튼 */}
                    <span
                        className={`relative z-10 flex w-[86px] h-[86px] items-center justify-center rounded-full border-[2px] shadow-[0_10px_24px_rgba(255,144,41,0.22)] ${
                            isRecording
                            ? "border-[#F0AA63] bg-[radial-gradient(circle_at_30%_30%,#FFC986_0%,#FFB55E_42%,#FF972D_100%)]"
                            : "border-[#F4BC81] bg-[radial-gradient(circle_at_30%_30%,#FFC88C_0%,#FFB96D_38%,#FF9A33_100%)]"
                        }`}
                        >
                        <img
                        src={micWhite}
                        alt="마이크"
                        className="h-[30px] w-[30px] object-contain"
                        />
                    </span>
                    </button>
                </div>

              <div className="mt-[8px] text-center">
                <p className="text-[20px] font-bold leading-none text-[#734112]">
                  {isSubmitting
                    ? "변환 중"
                    : isRecording
                    ? "녹음 중"
                    : "탭하여 말하기"}
                </p>

                <p className="mt-[10px] max-w-[260px] break-keep text-[11px] font-medium leading-[18px] text-[#8B6F58]">
                  {isSubmitting
                    ? "녹음된 음성을 텍스트로 변환하고 있어요."
                    : isRecording
                    ? "말을 마쳤다면 마이크를 한 번 더 눌러 종료하세요."
                    : "자연스럽게 말하면, 실시간으로 분석됩니다."}
                </p>
              </div>

              <div className="mt-[24px] w-full min-h-[72px]">
                {answer.trim() ? (
                  <div className="w-full rounded-[8px] border border-[#EED8C2] bg-white/82 px-[16px] py-[12px]">
                    <p className="text-[11px] font-bold text-[#FF9029]">
                      인식된 답변
                    </p>

                    <p className="mt-[6px] break-keep text-[12px] leading-[18px] text-[#5A3C24]">
                      {answer}
                    </p>
                  </div>
                ) : (
                  <div className="h-[72px]" />
                )}
              </div>

              <div className="mt-auto w-full rounded-[8px] border border-[#F3D0B0] bg-[#FFF3E7] px-[18px] py-[16px]">
                <p className="text-[13px] font-bold text-[#FF9029]">TIP</p>

                <p className="mt-[8px] break-keep text-[12px] font-medium leading-[19px] text-[#9B7A60]">
                  너무 빠르지 않게, 핵심 내용을 중심으로 말해보세요.
                  자연스러운 목소리와 명확한 발음이 중요합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="absolute right-[42px] bottom-[78px] w-[380px] rounded-[16px] border border-[#F0D8C2] bg-white/88 px-[18px] py-[14px] shadow-[0_2px_12px_rgba(89,50,14,0.06)]">
          <p className="break-keep text-[11px] font-medium leading-[18px] text-[#8B6F58]">
            면접을 중간에 종료할 시 피드백의 정확도가 떨어질 수 있습니다.
            그래도 종료하시겠습니까?
          </p>
        </div>

        <button
          type="button"
          onClick={handleFinishInterview}
          className="absolute right-[42px] bottom-[28px] h-[38px] rounded-full border border-[#FF9029] bg-white px-[18px] text-[13px] font-bold text-[#FF9029] transition hover:bg-[#FFF4EA]"
        >
          면접 끝내기
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="absolute left-[42px] bottom-[28px] h-[38px] rounded-full border border-[#D9C7B5] bg-white/85 px-[18px] text-[13px] font-bold text-[#7A5F4A] transition hover:bg-white"
        >
          메인으로
        </button>
      </main>
    </div>
  );
};

const StepItem = ({
  title,
  status,
}: {
  title: string;
  status: StepStatus;
}) => {
  const isDone = status === "done";
  const isCurrent = status === "current";

  return (
    <div className="flex items-center justify-center gap-[12px]">
      <div
        className={`flex w-[36px] h-[36px] items-center justify-center rounded-full ${
          isDone || isCurrent ? "bg-[#FF9029]" : "bg-[#F8BE7B]"
        }`}
      >
        {isDone ? (
          <span className="text-[18px] font-bold leading-none text-white">
            ✓
          </span>
        ) : (
          <span className="block w-[10px] h-[10px] rounded-full bg-transparent" />
        )}
      </div>

      <p
        className={`text-[14px] font-bold ${
          isDone || isCurrent ? "text-[#4A2A12]" : "text-[#6A4A31]"
        }`}
      >
        {title}
      </p>
    </div>
  );
};

export default OneMinuteIntroPage;