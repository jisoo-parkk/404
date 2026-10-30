import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { analyzePost } from "./api";
import ResultView from "./ResultView";
import "./App.css";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function App() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [text, setText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // 사진을 바꾸거나 화면을 떠나면 미리보기 임시 주소 해제
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = ""; // 같은 사진을 다시 골라도 동작하도록 초기화
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("jpg, png, webp 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("사진이 너무 커요. 5MB 이하로 올려 주세요.");
      return;
    }

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  }

  function removeImage() {
    setImage(null);
    setPreviewUrl("");
  }

  async function handleAnalyze() {
    if (!image && !text.trim()) {
      toast.error("사진이나 문구를 하나 이상 넣어 주세요.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("사진을 분석하고 있어요…");

    try {
      const data = await analyzePost({ image, text: text.trim() });
      setResult(data);
      toast.success("분석이 끝났어요.", { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  // 다른 게시물 분석하기: 입력과 결과 모두 초기화
  function reset() {
    removeImage();
    setText("");
    setAgreed(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page">
      <Toaster position="top-center" />

      <header className="header">
        <h1>게시물 개인정보 분석 서비스</h1>
        <p>올리기 전에, 사진 속 개인정보를 확인하세요</p>
      </header>

      <section className="card">
        {previewUrl ? (
          <div className="preview">
            <img src={previewUrl} alt="선택한 사진 미리보기" />
            <button type="button" className="btn-text" onClick={removeImage}>
              사진 지우기
            </button>
          </div>
        ) : (
          <label className="dropzone">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
            <span className="dropzone-title">사진을 선택하세요</span>
            <span className="dropzone-sub">jpg · png · webp, 최대 5MB</span>
          </label>
        )}
        <p className="notice">분석에만 사용되며, 분석이 끝나면 서버에 저장되지 않습니다</p>

        <label className="field-label" htmlFor="post-text">
          게시글 문구 <span>(선택)</span>
        </label>
        <textarea
          id="post-text"
          rows={4}
          placeholder="올릴 글과 위치 태그를 적어주세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <label className="consent">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          이 게시물은 내가 직접 올린(올릴) 본인의 게시물입니다
        </label>

        <button
          type="button"
          className="btn-primary"
          onClick={handleAnalyze}
          disabled={!agreed || loading}
        >
          {loading ? "분석 중…" : "분석하기"}
        </button>
      </section>

      {result && <ResultView result={result} onReset={reset} />}
    </div>
  );
}
