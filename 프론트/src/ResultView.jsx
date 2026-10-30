// 결과 JSON의 영어 값을 화면용 한글로 바꾸는 표
const LEVEL = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

const CATEGORY = {
  face: "얼굴",
  name: "이름",
  school_work: "학교·직장",
  location: "위치",
  contact: "연락처",
  qr_code: "QR코드",
  other: "기타",
};

const ACTION = {
  delete: "삭제",
  mask: "모자이크",
  private: "비공개",
  edit: "수정",
};

const CHECKLIST = [
  "이름표·송장·티켓 등 글자 정보를 가렸나요?",
  "간판·창밖 풍경 등 위치 단서를 확인했나요?",
  "사진 위치정보(GPS)를 껐나요?",
  "눈동자·선글라스·창문 반사를 확인했나요?",
  "실시간 대신 귀가 후에 올리나요?",
  "다른 사람·아이 얼굴은 동의를 받았나요?",
  "게시물 공개 범위를 확인했나요?",
];
function norm(value){
  return String(value ?? "").toLowerCase();
}

function LevelBadge({ level }) {
  const key =norm(level);
  return <span className={`badge level-${key}`}>{LEVEL[key] ?? level}</span>;
}

export default function ResultView({ result, onReset }) {
  const {
    overall = {},
    detections = [],
    combined_risks = [],
    recommended_actions = [],
    limitations,
  } = result;

  // d1, d2 같은 id를 "학교·직장" 같은 이름으로 바꿈
  function labelOf(id) {
    const d = detections.find((item) => item.id === id);
    return d ? CATEGORY[norm(d.category)] ?? d.category : id;
  }

  const actions = [...recommended_actions].sort((a, b) => a.priority - b.priority);
  const overallLevel = norm(overall.risk_level);

  return (
    <section className="result">
      <div className={`summary level-${overallLevel}`}>
        <p className="summary-title">전체 위험도 · {LEVEL[overallLevel] ?? "-"}</p>
        <p>{overall.summary}</p>
      </div>

      <h2>노출된 정보 {detections.length}개</h2>
      {detections.length === 0 && (
        <p className="empty">발견된 노출 정보가 없어요. 아래 체크리스트도 함께 확인해 주세요.</p>
      )}
      {detections.map((d) => (
        <article key={d.id} className="card item">
          <div className="item-head">
            <strong>{CATEGORY[norm(d.category)] ?? d.category}</strong>
            <LevelBadge level={d.risk_level} />
            {typeof d.confidence === "number" && (
              <span className="badge plain">{d.confidence >= 0.8 ? "확실" : "추정"}</span>
            )}
          </div>
          <p>{d.found}</p>
          <p className="sub">근거: {d.evidence}</p>
        </article>
      ))}

      {combined_risks.length > 0 && (
        <>
          <h2>함께 보면 위험해요</h2>
          {combined_risks.map((c, i) => (
            <article key={i} className="card item combined">
              <div className="item-head">
                {c.involves.map((id) => (
                  <span key={id} className="chip">{labelOf(id)}</span>
                ))}
                <LevelBadge level={c.risk_level} />
              </div>
              <p>{c.inference}</p>
              <p className="sub">예상 피해: {c.secondary_harm}</p>
            </article>
          ))}
        </>
      )}

      {actions.length > 0 && (
        <>
          <h2>이렇게 고쳐보세요</h2>
          <ol className="actions">
            {actions.map((a, i) => (
              <li key={i} className="card">
                <span className="num">{i + 1}</span>
                <div>
                  <strong>{ACTION[norm(a.action)] ?? a.action}</strong>
                  <p>{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {limitations && <p className="limit">{limitations} AI가 모든 위험을 찾지는 못하니 아래 체크리스트도 확인해 주세요.</p>}

      <div className="card">
        <h2>게시 전 체크리스트</h2>
        {CHECKLIST.map((item) => (
          <label key={item} className="check">
            <input type="checkbox" />
            {item}
          </label>
        ))}
      </div>

      <button type="button" className="btn-secondary" onClick={onReset}>
        다른 게시물 분석하기
      </button>
    </section>
  );
}
