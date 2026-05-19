import { useState } from "react";
import { createPortal } from "react-dom";
import mainBg from "../assets/main-bg.svg";
import type { InterviewRecord } from "../App";

type FeedbackPageProps = {
  records: InterviewRecord[];
  onGoHome: () => void;
  onRetry: () => void;
};

const totalScore = 75;

const scoreItems = [
  {
    title: "전달력",
    score: 90,
    comment: "목소리 톤이 안정적이고 전달이 명확했어요.",
  },
  {
    title: "내용 구성",
    score: 88,
    comment: "핵심 내용을 체계적으로 전달했어요.",
  },
  {
    title: "자신감",
    score: 90,
    comment: "답변에서 자신감이 잘 느껴졌어요.",
  },
  {
    title: "시간 관리",
    score: 92,
    comment: "시간을 효과적으로 사용했어요.",
  },
  {
    title: "논리성",
    score: 70,
    comment: "경험 설명을 더 구체화하면 좋아요.",
  },
];

const FeedbackPage = ({ records, onGoHome, onRetry }: FeedbackPageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const safeRecords =
    records.length > 0
      ? records
      : [
          {
            stepTitle: "자기소개",
            aiQuestion: "안녕하세요. 먼저 1분 자기소개를 해주세요.",
            userAnswer:
              "아직 저장된 면접 답변이 없습니다. 음성 인식으로 답변한 내용이 있으면 이곳에 표시됩니다.",
          },
        ];

  return (
    <div className="relative w-screen min-h-screen bg-[#FFF9F3] overflow-x-hidden">
      <img
        src={mainBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <main className="relative z-10 w-full min-h-screen flex justify-center px-[40px] py-[28px]">
        <div className="w-full max-w-[1120px] flex flex-col items-center">
          <FeedbackHeader />

          <StepBar />

          <SummarySection />

          <ScoreSection />

          <StrengthSection />

          <section className="relative z-[50] mt-[20px] mb-[34px] w-full flex justify-between items-center">
            <button
              type="button"
              onClick={onGoHome}
              className="h-[36px] px-[18px] rounded-[6px] border border-[#D6BDA5] bg-white/75 text-[#734112] text-[14px] font-bold hover:bg-[#FFF7EF]"
            >
              ← 메인 화면으로
            </button>

            <div className="flex gap-[12px]">
              <button
                type="button"
                onClick={() => {
                  console.log("면접 텍스트 전문 보기 클릭됨");
                  setIsModalOpen(true);
                }}
                className="h-[36px] px-[18px] rounded-[6px] border border-[#FF9029] bg-white/75 text-[#FF9029] text-[14px] font-bold hover:bg-[#FFF0E2]"
              >
                면접 텍스트 전문 보기
              </button>

              <button
                type="button"
                onClick={onRetry}
                className="h-[36px] px-[20px] rounded-[6px] border-none bg-[#FF9029] text-white text-[14px] font-bold hover:bg-[#F07F18]"
              >
                다시 면접보기 →
              </button>
            </div>
          </section>
        </div>
      </main>

      {isModalOpen && (
        <TranscriptModal
          records={safeRecords}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

const FeedbackHeader = () => {
  return (
    <section className="text-center">
      <div className="flex items-center justify-center gap-[12px]">
        <span className="w-[22px] h-[22px] rounded-full bg-[#FF9029]" />

        <h1 className="text-[38px] leading-none font-bold text-[#734112]">
          인터뷰 <span className="text-[#FF9029]">피드백</span>
        </h1>
      </div>

      <p className="mt-[10px] text-[14px] font-medium text-[#8B6F58]">
        면접이 완료되었습니다. 피드백을 확인해 보세요.
      </p>
    </section>
  );
};

const StepBar = () => {
  return (
    <section className="mt-[26px] w-full h-[68px] rounded-[10px] border border-[#FF9029]/45 bg-[#FFE9D5]/80 px-[64px] flex items-center justify-between">
      <StepItem title="준비하기" />
      <StepDivider />
      <StepItem title="인터뷰 진행" />
      <StepDivider />
      <StepItem title="피드백 확인" />
    </section>
  );
};

const StepItem = ({ title }: { title: string }) => {
  return (
    <div className="flex items-center gap-[12px]">
      <div className="w-[38px] h-[38px] rounded-full bg-[#FF9029] flex items-center justify-center shrink-0">
        <span className="text-white text-[18px] font-bold">✓</span>
      </div>

      <p className="text-[16px] font-bold text-[#4A2A12] whitespace-nowrap">
        {title}
      </p>
    </div>
  );
};

const StepDivider = () => {
  return <div className="w-px h-[38px] bg-[#DDBE9F]" />;
};

const SummarySection = () => {
  return (
    <section className="mt-[16px] w-full rounded-[14px] border border-[#FF9029]/45 bg-white/75 shadow-[0_8px_24px_rgba(115,65,18,0.08)] px-[40px] py-[28px] grid grid-cols-[180px_1fr_280px] gap-[34px] items-center">
      <TotalScore score={totalScore} />

      <MainFeedback />

      <SummaryBox />
    </section>
  );
};

const TotalScore = ({ score }: { score: number }) => {
  const radius = 49;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-start">
      <p className="text-[26px] leading-none font-bold text-[#FF9029]">
        종합 점수
      </p>

      <div className="mt-[16px] relative w-[128px] h-[128px] flex items-center justify-center overflow-visible">
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          className="absolute inset-0 rotate-[-90deg]"
        >
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#FFE3C6"
            strokeWidth={stroke}
          />

          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#FF9029"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div className="relative z-10 flex items-end justify-center gap-[3px]">
          <span className="text-[32px] leading-none font-bold text-[#FF9029]">
            {score}
          </span>

          <span className="mb-[5px] text-[12px] leading-none font-bold text-[#FF9029]">
            /100
          </span>
        </div>
      </div>
    </div>
  );
};

const MainFeedback = () => {
  return (
    <div className="text-center">
      <p className="text-[24px] leading-[33px] font-bold text-[#4A2A12] break-keep">
        전달력이 매우 좋은 자기소개였습니다!
      </p>

      <p className="mt-[16px] text-[15px] leading-[25px] font-medium text-[#8B6F58] break-keep">
        핵심 강점과 경험을 구체적으로 설명했어요.
        <br />
        마무리에서 입사 후 포부를 조금 더 강조하면 좋을 것 같아요.
      </p>
    </div>
  );
};

const SummaryBox = () => {
  return (
    <div className="rounded-[14px] border border-[#FF9029]/45 bg-[#FFF7EF] px-[20px] py-[16px]">
      <p className="text-[17px] font-bold text-[#734112]">평가 요약</p>

      <div className="mt-[12px] flex flex-col gap-[8px]">
        <SummaryRow label="전달력" value="우수" />
        <SummaryRow label="내용 구성" value="우수" />
        <SummaryRow label="자신감" value="우수" />
        <SummaryRow label="시간 관리" value="우수" />
        <SummaryRow label="논리성" value="보통" warning />
      </div>
    </div>
  );
};

const SummaryRow = ({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) => {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[#734112] font-medium">◎ {label}</span>

      <span
        className={`font-semibold ${
          warning ? "text-[#D99A4D]" : "text-[#5CA55C]"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

const ScoreSection = () => {
  return (
    <section className="mt-[24px] w-full">
      <p className="text-[17px] font-bold text-[#4A2A12]">세부 평가</p>

      <div className="mt-[12px] grid grid-cols-5 gap-[12px]">
        {scoreItems.map((item) => (
          <ScoreCard
            key={item.title}
            title={item.title}
            score={item.score}
            comment={item.comment}
          />
        ))}
      </div>
    </section>
  );
};

const ScoreCard = ({
  title,
  score,
  comment,
}: {
  title: string;
  score: number;
  comment: string;
}) => {
  return (
    <div className="min-h-[154px] rounded-[12px] border border-[#FF9029]/45 bg-white/78 px-[18px] py-[16px] flex flex-col justify-between">
      <div>
        <p className="text-[14px] font-bold text-[#FF9029]">{title}</p>

        <div className="mt-[16px] h-[8px] rounded-full bg-[#FFE0C0] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#FF9029]"
            style={{ width: `${score}%` }}
          />
        </div>

        <p className="mt-[10px] text-center text-[15px] font-bold text-[#734112]">
          {score} / 100
        </p>
      </div>

      <p className="mt-[10px] text-center text-[11px] leading-[17px] text-[#8B6F58] break-keep">
        {comment}
      </p>
    </div>
  );
};

const StrengthSection = () => {
  return (
    <section className="mt-[14px] w-full grid grid-cols-2 gap-[12px]">
      <FeedbackListBox
        type="good"
        title="강점"
        items={[
          "지원 직무와 관련된 경험을 구체적으로 설명했어요.",
          "핵심 역량을 강조하며 전달했어요.",
          "말의 속도와 톤이 안정적이었어요.",
        ]}
      />

      <FeedbackListBox
        type="bad"
        title="개선할 점"
        items={[
          "경험의 성과를 수치로 설명하면 더 설득력이 높아져요.",
          "입사 후 포부를 조금 더 구체적으로 제시해보세요.",
          "몇몇 문장에서 불필요한 반복 표현이 있었어요.",
        ]}
      />
    </section>
  );
};

const FeedbackListBox = ({
  type,
  title,
  items,
}: {
  type: "good" | "bad";
  title: string;
  items: string[];
}) => {
  const borderColor = type === "good" ? "border-[#7DBE7A]" : "border-[#FF9A9A]";

  return (
    <div
      className={`min-h-[150px] rounded-[12px] border ${borderColor} bg-white/80 px-[28px] py-[22px]`}
    >
      <p className="text-[17px] font-bold text-[#734112]">{title}</p>

      <ul className="mt-[16px] text-[14px] leading-[25px] text-[#6B5A4A] list-disc pl-[18px] break-keep">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const TranscriptModal = ({
  records,
  onClose,
}: {
  records: InterviewRecord[];
  onClose: () => void;
}) => {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(47, 41, 37, 0.45)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "680px",
          maxHeight: "76vh",
          overflow: "hidden",
          borderRadius: "16px",
          border: "2px solid #FF9029",
          background: "#FFF9F3",
          boxShadow: "0 16px 48px rgba(75, 42, 18, 0.25)",
          padding: "26px 30px",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            right: "18px",
            top: "14px",
            border: "none",
            background: "transparent",
            color: "#9B7A60",
            fontSize: "28px",
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#FF9029",
            margin: 0,
          }}
        >
          면접 텍스트 전문
        </h2>

        <p
          style={{
            marginTop: "8px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#8B6F58",
          }}
        >
          AI 질문과 사용자의 답변 내용을 단계별로 확인할 수 있습니다.
        </p>

        <div
          style={{
            marginTop: "20px",
            maxHeight: "54vh",
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          {records.map((record, index) => (
            <div
              key={`${record.stepTitle}-${index}`}
              style={{
                marginBottom: "18px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid #F0C6A4",
                padding: "16px 18px",
              }}
            >
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#734112",
                  margin: 0,
                }}
              >
                {index + 1}. {record.stepTitle}
              </p>

              <div style={{ marginTop: "14px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#FF9029",
                    margin: 0,
                  }}
                >
                  AI 인터뷰어
                </p>

                <p
                  style={{
                    marginTop: "5px",
                    fontSize: "13px",
                    lineHeight: "22px",
                    color: "#4A2A12",
                  }}
                >
                  {record.aiQuestion}
                </p>
              </div>

              <div style={{ marginTop: "16px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#FF9029",
                    margin: 0,
                  }}
                >
                  나의 답변
                </p>

                <p
                  style={{
                    marginTop: "5px",
                    whiteSpace: "pre-wrap",
                    fontSize: "13px",
                    lineHeight: "22px",
                    color: "#4A2A12",
                  }}
                >
                  {record.userAnswer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: "36px",
              padding: "0 30px",
              borderRadius: "6px",
              border: "none",
              background: "#FF9029",
              color: "white",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FeedbackPage;