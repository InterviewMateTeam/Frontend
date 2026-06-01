import { useState } from "react";
import mainBg from "../assets/main-bg.svg";
import playButton from "../assets/play-button.svg";
import micBrown from "../assets/mic-brown.svg";
import micWhite from "../assets/mic-white.svg";
import personBrown from "../assets/person-brown.svg";
import personWhite from "../assets/person-white.svg";
import calendarBrown from "../assets/calendar-brown.svg";
import calendarWhite from "../assets/calendar-white.svg";
import checkWhite from "../assets/check.svg";

type ScenarioType = "oneMinuteIntro" | "common" | "deep";

type HomePageProps = {
  onStartCommonInterview: (userPrompt: string) => void;
  onStartOneMinuteIntro: (userPrompt: string) => void;
};

const HomePage = ({
  onStartCommonInterview,
  onStartOneMinuteIntro,
}: HomePageProps) => {
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioType | null>(null);

  const [customInfo, setCustomInfo] = useState("");
  const [isInfoConfirmed, setIsInfoConfirmed] = useState(false);

  const isInputActive = customInfo.trim().length > 0;
  const canStartInterview = selectedScenario !== null && isInfoConfirmed;

  const handleChangeCustomInfo = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setCustomInfo(event.target.value);
    setIsInfoConfirmed(false);
  };

  const handleConfirmInfo = () => {
    if (!isInputActive) return;
    setIsInfoConfirmed(true);
  };

  const handleStartInterview = () => {
    if (!canStartInterview) return;

    const userPrompt = customInfo.trim();

    if (selectedScenario === "oneMinuteIntro") {
      onStartOneMinuteIntro(userPrompt);
      return;
    }

    if (selectedScenario === "common") {
      onStartCommonInterview(userPrompt);
      return;
    }

    alert("아직 준비 중인 면접 유형입니다.");
  };

  return (
    <div className="w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      {/* Header */}
      <header className="w-full h-[57px] bg-[#FFF9F3] border-b border-[#EAD8C8] flex items-center justify-center">
        <nav className="flex items-center gap-[170px] text-[#3F2A1A] text-[17px] font-bold">
          <button
            type="button"
            className="bg-transparent border-none outline-none cursor-pointer"
          >
            Main
          </button>

          <button
            type="button"
            className="bg-transparent border-none outline-none cursor-pointer"
          >
            Policy
          </button>
        </nav>
      </header>

      {/* Main */}
      <main className="relative w-full min-h-[calc(100vh-57px)] flex flex-col items-center overflow-hidden">
        {/* Background */}
        <img
          src={mainBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Title */}
        <section className="relative z-10 mt-[55px] text-center">
          <h1 className="text-[48px] leading-none font-semibold tracking-[-1.5px] text-[#1F1712]">
            Interview<span className="text-[#F58220]">Mate</span>
          </h1>

          <p className="mt-[22px] text-[14px] font-medium text-[#59320E] tracking-[0.5px]">
            원하는 시나리오를 선택해 보세요.
          </p>
        </section>

        {/* Cards */}
        <section className="relative z-10 mt-[28px] flex justify-center gap-[70px] w-full px-[70px] flex-wrap">
          <InterviewCard
            isSelected={selectedScenario === "oneMinuteIntro"}
            onClick={() => setSelectedScenario("oneMinuteIntro")}
            defaultIcon={micBrown}
            activeIcon={micWhite}
            title="기초 - 1분 자기소개 연습"
            description="첫인상과 핵심 강점 전달 중심으로 진행하세요."
          />

          <InterviewCard
            isSelected={selectedScenario === "common"}
            onClick={() => setSelectedScenario("common")}
            defaultIcon={personBrown}
            activeIcon={personWhite}
            title="일반 - 공통 질문 면접"
            description="지원 동기, 장단점, 협업 경험 중심으로 진행하세요."
          />

          <InterviewCard
            isSelected={selectedScenario === "deep"}
            onClick={() => setSelectedScenario("deep")}
            defaultIcon={calendarBrown}
            activeIcon={calendarWhite}
            title="심화 - 꼬리 질문 면접"
            description="답변 수행을 더 구체적으로 설명하는 연습을 진행하세요."
          />
        </section>

        {/* Start Button */}
        <section className="relative z-10 mt-[72px] flex flex-col items-center">
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={!canStartInterview}
            className={`
              w-[92px] h-[92px] rounded-full bg-transparent border-none p-0
              transition-transform duration-200
              ${
                canStartInterview
                  ? "cursor-pointer hover:scale-105"
                  : "cursor-default opacity-55"
              }
            `}
          >
            <img
              src={playButton}
              alt="인터뷰 시작"
              className="w-full h-full object-contain"
            />
          </button>

          <p className="mt-[12px] text-[18px] font-bold text-[#4A2A12]">
            인터뷰 시작
          </p>

          <p className="mt-[5px] text-[11px] font-medium text-[#7A5F4A]">
            시작 시나리오 선택 후 연습을 시작해보세요.
          </p>
        </section>

        {/* Bottom Input Box */}
        <section className="relative z-10 mt-[42px] mb-[40px] w-[72%] max-w-[1112px] min-h-[287px] rounded-[10px] border border-[#CDB7A3] bg-white/45 px-[24px] pt-[20px] pb-[18px] shadow-[0_4px_18px_rgba(89,50,14,0.06)]">
          <h2 className="text-[16px] leading-[22px] font-bold text-[#3F2A1A]">
            더 개인화된 면접 진행을 원한다면, 관련 정보를 자유롭게
            입력해보세요.
          </h2>

          <p className="mt-[12px] text-[10px] leading-[16px] font-medium text-[#7A5F4A]">
            ex&#41; 지원회사 : 네이버 / 직무 : PM / 본인 관심 : 데이터 기반
            문제 해결 관련 학습 경험 등
          </p>

          <div className="mt-[14px] w-full h-px bg-[#C7B09C]" />

          <div className="relative mt-[22px]">
            <textarea
              value={customInfo}
              onChange={handleChangeCustomInfo}
              className={`
                w-full h-[96px] resize-none rounded-[8px]
                border px-[14px] py-[12px] pr-[58px]
                text-[14px] leading-[20px] text-[#3F2A1A]
                outline-none transition placeholder:text-[#B59C88]
                ${
                  isInfoConfirmed
                    ? "border-[#E68225] bg-white/75"
                    : "border-[#CDB7A3] bg-white/65 focus:border-[#B98255] focus:bg-white/80"
                }
              `}
              placeholder=""
            />

            <button
              type="button"
              onClick={handleConfirmInfo}
              disabled={!isInputActive}
              className={`
                absolute right-[10px] bottom-[10px]
                w-[39px] h-[39px] rounded-[7px] border-none
                flex items-center justify-center transition active:scale-95
                ${
                  isInfoConfirmed
                    ? "cursor-pointer bg-gradient-to-br from-[#FF9029] to-[#E68225] shadow-[0_2px_8px_rgba(230,130,37,0.28)]"
                    : isInputActive
                    ? "cursor-pointer bg-gradient-to-br from-[#FF9029] to-[#E68225] shadow-[0_2px_8px_rgba(230,130,37,0.28)] hover:brightness-95"
                    : "cursor-default bg-[#FFC38B] opacity-70"
                }
              `}
            >
              <img
                src={checkWhite}
                alt="입력 완료"
                className="w-[24px] h-[24px] object-contain"
              />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

interface InterviewCardProps {
  isSelected: boolean;
  onClick: () => void;
  defaultIcon: string;
  activeIcon: string;
  title: string;
  description: string;
}

const InterviewCard = ({
  isSelected,
  onClick,
  defaultIcon,
  activeIcon,
  title,
  description,
}: InterviewCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const isActive = isSelected || isHovered;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className={`
        w-[340px] h-[192px] rounded-[10px] px-[32px] py-[28px]
        text-left cursor-pointer outline-none border
        transition duration-200
        ${
          isActive
            ? "border-[#FF9029] bg-[#FFE4C8] shadow-[0_8px_22px_rgba(89,50,14,0.12)] -translate-y-1"
            : "border-[#E3B58F] bg-[#FFE9D5]/75 shadow-[0_4px_16px_rgba(89,50,14,0.05)]"
        }
      `}
    >
      <div
        className={`
          w-[42px] h-[42px] rounded-[8px]
          flex items-center justify-center
          shadow-[0_2px_6px_rgba(199,111,32,0.16)]
          transition duration-200
          ${isActive ? "bg-[#FF9029]" : "bg-[#FFC38B]"}
        `}
      >
        <img
          src={isActive ? activeIcon : defaultIcon}
          alt=""
          className="w-[28px] h-[28px] object-contain"
        />
      </div>

      <h3 className="mt-[18px] text-[16px] leading-[22px] font-bold text-[#3F2A1A]">
        {title}
      </h3>

      <p className="mt-[10px] text-[11px] leading-[17px] font-medium text-[#735842]">
        {description}
      </p>
    </button>
  );
};

export default HomePage;