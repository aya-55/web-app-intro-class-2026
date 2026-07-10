/**
 * TODO App JavaScript - 完成版
 * 第8回: セキュリティの基礎 & 総仕上げ
 *
 * 【このファイルの役割】
 *  ブラウザの画面（HTML）と、バックエンド（main.py）の橋渡しをする。
 *
 * 【全体の流れ】
 *  1. ページが開かれる → loadTodos() でサーバーからTODO一覧を取得
 *  2. renderTodos() が、取得したデータを画面のリストとして描画する
 *  3. ユーザーが「追加・チェック・削除」を操作する
 *     → 対応する関数がサーバーに変更を送る（fetch）
 *     → 最後にもう一度 loadTodos() して、最新の状態を画面に反映する
 *
 * ※ fetch はサーバーと通信する命令。通信は時間がかかるので、
 *   async / await を使って「結果が返ってくるまで待つ」書き方をしている。
 */

// サーバー側のAPIのアドレス（main.py の @app.get("/todos") などに対応）
const API_URL = "https://cuddly-couscous-7v4xv9x6qqggfr5w6-8000.app.github.dev/todos";

// 現在どちらのタブを開いているかを覚えておく変数（初期値は 'want': これから観る）
let currentTab = 'want';

// ============================================================
// 2. サーバーからデータを読み込む処理
// ============================================================
async function loadTodos() {
  try {
    // サーバーに「アニメ一覧をください」とお願いする
    const response = await fetch(API_URL);

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "アニメ一覧の取得に失敗しました");
      return;
    }

    // 返ってきたデータをJavaScriptの配列に変換して画面に描画する
    const todos = await response.json();
    renderTodos(todos);
  } catch (error) {
    showError("通信エラーが発生しました。ポートがパブリックになっているか確認してください。");
  }
}

// ============================================================
// 3. 新しく「観たいアニメ」を追加する処理
// ============================================================
async function addTodo() {
  const input = document.getElementById("todo-input");
  const title = input.value.trim();

  // 空っぽのときは送らない
  if (title === "") {
    showError("アニメのタイトルを入力してください");
    return;
  }

  // 100文字以上のときは送らない
  if (title.length > 100) {
    showError("タイトルは100文字以内で入力してください");
    return;
  }

  try {
    // サーバーに新しいアニメを登録する
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "アニメの追加に失敗しました");
      return;
    }

    input.value = ""; // 入力欄を空にする
    await loadTodos(); // リストを再読み込み
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 4. アニメを「観た！」状態に更新する処理
// ============================================================
async function watchAnime(id) {
  try {
    // サーバーの指定したアニメIDに対して、状態を更新する
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // main.pyが新しく受け取れるようになった status: "watched" を送る
      body: JSON.stringify({ status: "watched" }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "視聴状態の更新に失敗しました");
      return;
    }

    await loadTodos(); // 画面を更新して移動を反映させる
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 5. アニメを削除する処理
// ============================================================
async function deleteTodo(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "削除に失敗しました");
      return;
    }

    await loadTodos(); // 一覧を再読み込み
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 6. タブを切り替える処理
// ============================================================
function switchTab(tabName) {
  currentTab = tabName;
  
  const tabWant = document.getElementById("tab-want");
  const tabWatched = document.getElementById("tab-watched");
  
  // 見た目の色を切り替える（選ばれているほうに青い下線をつける）
  if (tabName === 'want') {
    tabWant.style.borderBottom = "3px solid #007bff";
    tabWant.style.fontWeight = "bold";
    tabWant.style.color = "#333";
    tabWatched.style.borderBottom = "none";
    tabWatched.style.fontWeight = "normal";
    tabWatched.style.color = "#777";
  } else {
    tabWant.style.borderBottom = "none";
    tabWant.style.fontWeight = "normal";
    tabWant.style.color = "#777";
    tabWatched.style.borderBottom = "3px solid #007bff";
    tabWatched.style.fontWeight = "bold";
    tabWatched.style.color = "#333";
  }
  
  // タブが切り替わったらリストを描画し直す
  loadTodos();
}

// ============================================================
// 7. 画面にアニメリストを描画する処理
// ============================================================
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  list.innerHTML = ""; // 古い表示を一度すべて消す

  // いま選んでいるタブ（want か watched）と同じ状態のアニメだけを表示する
  const filteredTodos = todos.filter((todo) => {
    const status = todo.status || 'want'; // statusが無ければデフォルトで'want'
    return status === currentTab;
  });

  // 絞り込んだアニメを1件ずつ画面に並べる
  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

    // アニメのタイトル
    const titleSpan = document.createElement("span");
    titleSpan.className = "todo-title";
    titleSpan.textContent = todo.title;
    li.appendChild(titleSpan);

    // 右側のボタンたちをまとめるグループ
    const btnGroup = document.createElement("div");

    // 「これから観る」タブの時だけ、「観た！」ボタンを表示する
    if (currentTab === 'want') {
      const watchBtn = document.createElement("button");
      watchBtn.className = "watch-button";
      watchBtn.textContent = "観た！";
      watchBtn.style.backgroundColor = "#2ed573";
      watchBtn.style.color = "white";
      watchBtn.style.border = "none";
      watchBtn.style.padding = "5px 10px";
      watchBtn.style.marginRight = "5px";
      watchBtn.style.borderRadius = "4px";
      watchBtn.style.cursor = "pointer";
      
      // ボタンが押されたら視聴完了にする
      watchBtn.addEventListener("click", () => watchAnime(todo.id));
      btnGroup.appendChild(watchBtn);
    }

    // 削除ボタン（どっちのタブでも表示）
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.textContent = "削除";
    deleteBtn.style.backgroundColor = "#ff4757";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "5px 10px";
    deleteBtn.style.borderRadius = "4px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));
    btnGroup.appendChild(deleteBtn);

    li.appendChild(btnGroup);
    list.appendChild(li);
  });
}

// ============================================================
// 8. メッセージ表示 & イベント設定
// ============================================================
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// フォームが送信されたときの動き
document.getElementById("todo-form").addEventListener("submit", function (e) {
  e.preventDefault();
  addTodo();
});

// アプリが起動したときに、最初にデータを読み込む
loadTodos();

