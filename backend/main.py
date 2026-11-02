# =============================================================
#  main.py  —  백엔드 서버 (FastAPI)
#  실행:  uvicorn main:app --reload
#  테스트: 브라우저에서 http://127.0.0.1:8000/docs
# =============================================================
import asyncio
import base64
import json
import os
from pathlib import Path
from typing import List, Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from prompt import SYSTEM_PROMPT, build_user_prompt

# 1) 설정
load_dotenv()

# ★ True  = AI 없이 mock_result.json 의 고정 결과를 돌려줌 (지금 단계)
# ★ False = 진짜 Claude API 로 분석 (나중에 API 키 넣고 바꾸기)
USE_MOCK = False
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")
BASE_DIR = Path(__file__).resolve().parent

# 2) 서버 만들기
app = FastAPI(title="SNS 개인정보 위험 분석 API")

# 3) 프론트가 다른 주소(예: localhost:5173)에서 불러도 허락해 주기
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_IMAGES = 5
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@app.get("/api/health")
def health():
    """서버가 살아있는지 확인용"""
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(
    account: str = Form(""),
    text: str = Form(""),
    images: Optional[List[UploadFile]] = File(None),
):
    """사진 + 글을 받아서 클로드에게 분석을 맡기고 JSON으로 돌려줌"""
    images = [img for img in (images or []) if img.filename]

    if not text.strip() and not images:
        raise HTTPException(400, "사진이나 글 중 하나는 꼭 넣어주세요.")
    if len(images) > MAX_IMAGES:
        raise HTTPException(400, f"사진은 최대 {MAX_IMAGES}장까지 가능해요.")

    # ★ 고정 결과 모드: 입력만 확인하고 mock_result.json 을 그대로 돌려줌
    if USE_MOCK:
        await asyncio.sleep(1.5)  # 분석하는 척 잠깐 기다리기 (시연용)
        with open(BASE_DIR / "mock_result.json", encoding="utf-8") as f:
            return json.load(f)

    if not os.getenv("ANTHROPIC_API_KEY"):
        raise HTTPException(500, ".env 파일에 ANTHROPIC_API_KEY 가 없어요. 키를 넣거나 USE_MOCK = True 로 바꿔주세요.")

    # 4) 사진을 클로드가 읽을 수 있는 형태(base64)로 바꾸기
    content = []
    for img in images:
        if img.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"{img.filename}: jpg, png, gif, webp만 가능해요.")
        data = await img.read()
        if len(data) > MAX_SIZE:
            raise HTTPException(400, f"{img.filename}: 5MB 이하만 가능해요.")
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": img.content_type,
                "data": base64.standard_b64encode(data).decode("utf-8"),
            },
        })

    content.append({"type": "text", "text": build_user_prompt(account, text, len(images))})

    # 5) 클로드 API 호출
    try:
        client = anthropic.Anthropic()  # .env 의 ANTHROPIC_API_KEY 를 자동으로 읽음
        response = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.AnthropicError as e:
        raise HTTPException(502, f"Claude API 오류: {e}")

    raw = "".join(block.text for block in response.content if block.type == "text")
    return parse_json(raw)


@app.get("/test")
def test_page():
    """프론트 없이 백엔드만 테스트하는 간단한 페이지"""
    return FileResponse(BASE_DIR / "test.html")


def parse_json(raw: str) -> dict:
    """클로드 답변에서 JSON 부분만 꺼내기"""
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    try:
        return json.loads(cleaned[start:end + 1])
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(502, f"AI 답변을 JSON으로 읽지 못했어요: {raw[:300]}")


# 6) 프론트 완성본(dist)이 있으면 같은 서버에서 화면도 보여주기
#    → http://127.0.0.1:8000 에 들어가면 프론트 화면이 뜸
FRONT_DIST = BASE_DIR.parent / "프론트" / "dist"
if FRONT_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONT_DIST, html=True), name="front")
