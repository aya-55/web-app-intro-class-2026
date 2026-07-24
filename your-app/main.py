import sqlite3  # Python標準のデータベース（SQLite）を使うためのライブラリ
import uvicorn  # FastAPIアプリを動かすためのWebサーバー

from fastapi import FastAPI, HTTPException  # Webアプリ本体とエラー応答用
from fastapi.middleware.cors import CORSMiddleware  # ブラウザからのアクセスを許可する設定
from fastapi.staticfiles import StaticFiles  # HTML/CSS/JSなどのファイルを配信する機能
from pydantic import BaseModel, Field  # 受け取るデータの形をチェックする道具

# このappが、Webアプリ全体の本体になる
app = FastAPI(title="Anime Log App")

# CORS設定: 別のアドレスで動くフロント（ブラウザの画面）からの通信を許可する
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- データベース設定 ---
DATABASE = "animes.db"


def init_db():
    """データベースとテーブルを初期化する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 👈 current_ep (現在の話数) と total_ep (総話数) のカラムを追加！
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS animes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            watched INTEGER DEFAULT 0,
            current_ep INTEGER DEFAULT 0,
            total_ep INTEGER DEFAULT 12
        )
    """)
    conn.commit()
    conn.close()


# --- Pydanticモデル ---
class AnimeCreate(BaseModel):
    # 新しいアニメを作るときに受け取るデータ
    title: str = Field(min_length=1, max_length=100)
    total_ep: int = Field(default=12, ge=1)  # 👈 総話数を受け取る（最低1話以上）


class AnimeUpdate(BaseModel):
    # アニメの状態を更新するときにフロントから受け取るデータ
    status: str


# --- APIエンドポイント ---

@app.get("/animes")
def get_animes():
    """アニメ一覧を取得する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 👈 話数データ(current_ep, total_ep)も一緒に取得する
    cursor.execute("SELECT id, title, watched, current_ep, total_ep FROM animes ORDER BY id")
    animes = cursor.fetchall()

    conn.close()
    
    return [
        {
            "id": anime[0], 
            "title": anime[1], 
            "status": "watched" if anime[2] else "want",
            "current_ep": anime[3],  # 👈 フロントに現在の話数を返す
            "total_ep": anime[4]     # 👈 フロントに総話数を返す
        }
        for anime in animes
    ]


@app.post("/animes", status_code=201)
def create_anime(anime: AnimeCreate):
    """新しいアニメを「観たい」として作成する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 👈 初期話数は0話、総話数は入力された値(デフォルト12)で登録
    cursor.execute(
        "INSERT INTO animes (title, watched, current_ep, total_ep) VALUES (?, 0, 0, ?)",
        (anime.title, anime.total_ep),
    )
    conn.commit()
    anime_id = cursor.lastrowid

    conn.close()
    return {"id": anime_id, "title": anime.title, "status": "want", "current_ep": 0, "total_ep": anime.total_ep}


@app.put("/animes/{anime_id}")
def update_anime(anime_id: int, anime: AnimeUpdate):
    """アニメの視聴状態(want / watched)を更新する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("SELECT title, current_ep, total_ep FROM animes WHERE id = ?", (anime_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Anime not found")

    watched_val = 1 if anime.status == "watched" else 0
    
    # 👈 もし「視聴済み」に切り替えた場合は、現在の話数を自動で「総話数と同じ」にする
    current_ep_val = existing[2] if watched_val == 1 else existing[1]

    cursor.execute(
        "UPDATE animes SET watched = ?, current_ep = ? WHERE id = ?",
        (watched_val, current_ep_val, anime_id),
    )
    conn.commit()
    conn.close()

    return {"id": anime_id, "title": existing[0], "status": anime.status, "current_ep": current_ep_val, "total_ep": existing[2]}


# 👈 【新機能】話数を1つ進める（カウントアップ）ためのAPI
@app.put("/animes/{anime_id}/increment")
def increment_episode(anime_id: int):
    """アニメの話数を+1する。総話数に達したら自動で視聴済みにする"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("SELECT current_ep, total_ep FROM animes WHERE id = ?", (anime_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Anime not found")

    current_ep, total_ep = existing[0], existing[1]
    
    # すでに最終話なら何もしない
    if current_ep >= total_ep:
        conn.close()
        return {"message": "Already finished"}

    new_ep = current_ep + 1
    # もしカウントアップして最終話に達したら、自動で「視聴済み(1)」にする
    watched_val = 1 if new_ep == total_ep else 0

    cursor.execute(
        "UPDATE animes SET current_ep = ?, watched = ? WHERE id = ?",
        (new_ep, watched_val, anime_id),
    )
    conn.commit()
    conn.close()

    return {"id": anime_id, "current_ep": new_ep, "status": "watched" if watched_val else "want"}


@app.delete("/animes/{anime_id}")
def delete_anime(anime_id: int):
    """アニメを削除する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM animes WHERE id = ?", (anime_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Anime not found")

    cursor.execute("DELETE FROM animes WHERE id = ?", (anime_id,))
    conn.commit()

    conn.close()
    return {"message": "Anime deleted", "id": anime_id}


# --- 静的ファイル配信 ---
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# --- アプリ起動時にDBを初期化 ---
init_db()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)