import sample from "./sample.json";

// 백엔드 주소 (.env 파일의 VITE_API_URL)
// 비어 있으면 백엔드 없이 sample.json 결과를 보여줌 (화면 개발용)
const API_URL = import.meta.env.VITE_API_URL;

const ERROR_MESSAGES = {
  400: "입력을 확인해 주세요. 사진이나 문구를 넣고 동의에 체크해 주세요.",
  413: "사진이 너무 커요. 5MB 이하로 올려 주세요.",
  422: "분석 결과를 정리하지 못했어요. 다시 시도해 주세요.",
  500: "일시적인 오류예요. 잠시 후 다시 시도해 주세요.",
};

export async function analyzePost({ image, text }) {
  // 샘플 모드: 1.5초 기다린 뒤 샘플 결과 반환
  if (!API_URL) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return sample;
  }

  const formData = new FormData();
  if (image) formData.append("images", image);
  if (text) formData.append("text", text);
  formData.append("consent", "true");

  let res;
  try {
    res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해 주세요.");
  }

  if (!res.ok) {
    throw new Error(ERROR_MESSAGES[res.status] ?? ERROR_MESSAGES[500]);
  }

  return res.json();
}
