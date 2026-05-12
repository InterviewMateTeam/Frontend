import { useRef, useState } from "react";

import mainBg from "../assets/main-bg.svg";
import micWhite from "../assets/mic-white.svg";
import stepCheckWhite from "../assets/check.svg";
import chatOrange from "../assets/chat-orange.svg";
import refreshBrown from "../assets/refresh-brown.svg";

type InterviewStep = 0 | 1 | 2;
type LoadingType = "next" | "feedback" | null;

type SpeechRecognitionType = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionType;
    webkitSpeechRecognition?: new () => SpeechRecognitionType;
  }
}

const steps = [
  {
    title: "자기소개",
    subtitle: "현재 진행",
    progressTitle: "자기소개",
  },
  {
    title: "후속 질문",
    subtitle: "다음 제공",
    progressTitle: "후속 질문",
  },
  {
    title: "기타 인터뷰 질문",
    subtitle: "-",
    progressTitle: "기타 인터뷰 질문",
  },
];

const BasicInterviewPage = () => {
  const [currentStep, setCurrentStep] = useState<InterviewStep>(0);
  const [isListening, setIsListening] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [aiText, setAiText] = useState(
    "안녕하세요. 먼저 1분 자기소개를 해주세요."
  );
  const [loadingType, setLoadingType] = useState<LoadingType>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const finalTextRef = useRef("");
  const latestAnswerRef = useRef("");

  const currentTitle = steps[currentStep].progressTitle;

  const moveToNextStepWithLoading = () => {
    if (currentStep >= 2) return;

    setLoadingType("next");

    setTimeout(() => {
      const nextStep = (currentStep + 1) as InterviewStep;

      setCurrentStep(nextStep);
      setMyAnswer("");
      finalTextRef.current = "";
      latestAnswerRef.current = "";

      if (nextStep === 1) {
        setAiText("좋습니다. 자기소개 내용을 바탕으로 후속 질문에 답변해 주세요.");
      }

      if (nextStep === 2) {
        setAiText("마지막으로 기타 인터뷰 질문에 답변해 주세요.");
      }

      setLoadingType(null);
    }, 1200);
  };

  const handleMicClick = () => {
    if (loadingType) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("이 브라우저에서는 음성 인식이 지원되지 않아요. Chrome에서 테스트해줘.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      finalTextRef.current = "";
      latestAnswerRef.current = "";
      setMyAnswer("");
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = finalTextRef.current;

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += transcript;
        }
      }

      const nextAnswer = `${finalText}${interimText}`;

      finalTextRef.current = finalText;
      latestAnswerRef.current = nextAnswer;
      setMyAnswer(nextAnswer);
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "no-speech") {
        alert("음성이 잘 감지되지 않았어. 마이크를 다시 누르고 조금 더 또렷하게 말해줘.");
        return;
      }

      if (event.error === "not-allowed") {
        alert("마이크 권한이 차단되어 있어. 브라우저 주소창 왼쪽에서 마이크 권한을 허용해줘.");
        return;
      }

      alert("음성 인식 중 오류가 발생했어. 마이크 권한과 브라우저를 확인해줘.");
    };

    recognition.onend = () => {
      setIsListening(false);

      const hasAnswer = latestAnswerRef.current.trim().length > 0;

      if (!hasAnswer) {
        return;
      }

      if (currentStep < 2) {
        moveToNextStepWithLoading();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFinishInterview = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    }

    setLoadingType("feedback");

    setTimeout(() => {
      setLoadingType(null);
      //navigate("/feedback");
    }, 1400);
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
              mt-[22px] px-[22px] h-[34px] rounded-full
              flex items-center justify-center border shadow-sm
              ${
                isListening
                  ? "bg-[#FFF0E2] border-[#FF9029]/50"
                  : "bg-white/75 border-[#E4CDB8]"
              }
            `}
          >
            <span
              className={`
                w-[9px] h-[9px] rounded-full mr-[8px]
                ${isListening ? "bg-[#FF9029] animate-pulse" : "bg-[#C89568]"}
              `}
            />
            <p
              className={`
                text-[13px] font-bold
                ${isListening ? "text-[#FF9029]" : "text-[#734112]"}
              `}
            >
              {isListening
                ? "음성 인식 중 · 말을 마쳤다면 마이크를 한 번 더 눌러 종료하세요"
                : "면접 진행 중 · 마이크를 누르면 음성 인식이 시작됩니다"}
            </p>
          </div>

          <section className="mt-[22px] flex flex-col items-center">
            <button
              type="button"
              onClick={handleMicClick}
              className={`
                relative w-[112px] h-[112px] rounded-full bg-[#FF9029]
                flex items-center justify-center
                shadow-[0_0_0_12px_rgba(255,144,41,0.18),0_0_0_24px_rgba(255,144,41,0.08)]
                transition active:scale-95
                ${isListening ? "scale-105 animate-pulse" : "hover:scale-105"}
              `}
            >
              <img
                src={micWhite}
                alt="마이크"
                className="w-[46px] h-[46px] object-contain"
              />
            </button>

            <p className="mt-[20px] text-[18px] font-bold text-[#734112]">
              {isListening ? "다 말했으면 마이크를 한 번 더 눌러 종료" : "답하여 말하기"}
            </p>

            <p className="mt-[6px] text-[12px] font-semibold text-[#8B6F58]">
              {isListening
                ? "종료 후 자동으로 다음 단계 로딩 화면이 표시됩니다."
                : "Chrome에서 테스트하고, 브라우저 마이크 권한을 허용해야 합니다."}
            </p>
          </section>

          <section className="mt-[34px] mb-[72px] w-full max-w-[1113px] grid grid-cols-2 gap-[42px]">
            <AnswerBox
              icon={chatOrange}
              refreshIcon={refreshBrown}
              title="AI 인터뷰어"
              buttonText="질문 다시 듣기"
              text={aiText}
            />

            <AnswerBox
              icon={chatOrange}
              title="나의 답변"
              buttonText="면접 끝내기"
              text={
                myAnswer ||
                "마이크를 누르고 답변하면 여기에 텍스트로 표시됩니다."
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
      {isFeedback ? (
        <div className="absolute inset-0 bg-[#9B9188]/45 backdrop-blur-[3px]" />
      ) : null}

      <div className="relative z-10 flex flex-col items-center">
        <LoadingBars />

        <p
          className={`
            mt-[26px] text-[42px] font-bold
            ${isFeedback ? "text-[#FFE2C6]" : "text-[#FFE2C6]"}
          `}
        >
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