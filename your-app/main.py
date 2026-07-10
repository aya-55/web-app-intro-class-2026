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
DATABASE = "todo.db"


def init_db():
    """データベースとテーブルを初期化する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    # 互換性を保つため、テーブル名(todos)や列名(done)は元のTodoアプリのまま使います
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()


# --- Pydanticモデル ---
class TodoCreate(BaseModel):
    # 新しいアニメを作るときに受け取るデータ
    title: str = Field(min_length=1, max_length=100)


class TodoUpdate(BaseModel):
    # アニメの状態を更新するときにフロント(app.js)から受け取るデータ
    status: str  # 👈 done: bool から status: str に変更


# --- APIエンドポイント ---

@app.get("/todos")
def get_todos():
    """アニメ一覧を取得する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, done FROM todos ORDER BY id")
    todos = cursor.fetchall()

    conn.close()
    
    # データベースの 1(完了) を "watched"、0(未完了) を "want" に翻訳してフロントに返します
    return [
        {
            "id": todo[0], 
            "title": todo[1], 
            "status": "watched" if todo[2] else "want"
        }
        for todo in todos
    ]


@app.post("/todos", status_code=201)
def create_todo(todo: TodoCreate):
    """新しいアニメを「観たい」として作成する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 新しいアニメは 0=未完了(want) で登録
    cursor.execute(
        "INSERT INTO todos (title, done) VALUES (?, 0)",
        (todo.title,),
    )
    conn.commit()
    todo_id = cursor.lastrowid

    conn.close()
    return {"id": todo_id, "title": todo.title, "status": "want"}


@app.put("/todos/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdate):
    """アニメの視聴状態(want / watched)を更新する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # 対象のアニメが存在するか確認
    cursor.execute("SELECT title FROM todos WHERE id = ?", (todo_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Anime not found")

    # フロントから "watched" が来たら 1(完了)、それ以外なら 0(未完了) に変換
    done_val = 1 if todo.status == "watched" else 0

    # データベースを更新
    cursor.execute(
        "UPDATE todos SET done = ? WHERE id = ?",
        (done_val, todo_id),
    )
    conn.commit()
    conn.close()

    return {"id": todo_id, "title": existing[0], "status": todo.status}


@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    """アニメを削除する"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM todos WHERE id = ?", (todo_id,))
    existing = cursor.fetchone()
    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Anime not found")

    cursor.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    conn.commit()

    conn.close()
    return {"message": "Anime deleted", "id": todo_id}


# --- 静的ファイル配信 ---
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# --- アプリ起動時にDBを初期化 ---
init_db()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

