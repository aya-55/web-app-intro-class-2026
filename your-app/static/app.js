/**
 * アニメ視聴記録 App JavaScript - 話数カウンター版
 *
 * 【このファイルの役割】
 *  ブラウザの画面（HTML）と、バックエンド（main.py）の橋渡しをする。
 */

// サーバー側のAPIのアドレス
const API_URL = "/animes";

// 現在どちらのタブを開いているかを覚えておく変数（初期値は 'want': これから観る）
let currentTab = 'want';

// ============================================================
// 2. サーバーからデータを読み込む処理
// ============================================================
async function loadTodos() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "アニメ一覧の取得に失敗しました");
      return;
    }

    const todos = await response.json();
    renderTodos(todos);
  } catch (error) {
    showError("通信エラーが発生しました。ポートがパブリックになっているか確認してください。");
  }
}

// ============================================================
// 3. 新しく「観たいアニメ」を追加する処理（総話数対応）
// ============================================================
async function addTodo() {
  const input = document.getElementById("todo-input");
  const totalEpInput = document.getElementById("todo-total-ep"); // 👈 総話数の入力欄を取得
  
  const title = input.value.trim();
  const totalEp = parseInt(totalEpInput.value, 10) || 12; // 数字に変換（空なら12）

  if (title === "") {
    showError("アニメのタイトルを入力してください");
    return;
  }

  if (title.length > 100) {
    showError("タイトルは100文字以内で入力してください");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 👈 タイトルと一緒に総話数（total_ep）もサーバーに送る
      body: JSON.stringify({ title: title, total_ep: totalEp }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "アニメの追加に失敗しました");
      return;
    }

    input.value = ""; // 入力欄を空にする
    totalEpInput.value = "12"; // 総話数を12に戻す
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
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "watched" }),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "視聴状態の更新に失敗しました");
      return;
    }

    await loadTodos();
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 【新機能】話数を1つ進める（+1話）処理
// ============================================================
async function incrementEpisode(id) {
  try {
    const response = await fetch(`${API_URL}/${id}/increment`, {
      method: "PUT"
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.detail || "話数の更新に失敗しました");
      return;
    }

    await loadTodos(); // 画面を更新（最終話に達したら自動でタブが移動します）
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

    await loadTodos();
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
  
  loadTodos();
}

// ============================================================
// 7. 画面にアニメリストを描画する処理（話数カウンター対応）
// ============================================================
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = ""; 

  const filteredTodos = todos.filter((todo) => {
    const status = todo.status || 'want';
    return status === currentTab;
  });

  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

    // 左側：タイトルと話数表示をまとめるエリア
    const infoDiv = document.createElement("div");
    infoDiv.style.display = "flex";
    infoDiv.style.flexDirection = "column";
    infoDiv.style.gap = "4px";

    const titleSpan = document.createElement("span");
    titleSpan.className = "todo-title";
    titleSpan.textContent = todo.title;
    if (currentTab === 'watched') {
      titleSpan.style.textDecoration = "line-through";
      titleSpan.style.color = "#888";
    }
    infoDiv.appendChild(titleSpan);

    // 👈 話数のテキスト表示を追加 (例: 3 / 12 話)
    const epSpan = document.createElement("span");
    epSpan.style.fontSize = "13px";
    epSpan.style.color = "#666";
    epSpan.textContent = `話数: ${todo.current_ep} / ${todo.total_ep} 話`;
    infoDiv.appendChild(epSpan);

    li.appendChild(infoDiv);

    // 右側：ボタングループ
    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "5px";

    // 「これから観る」タブの時だけ、「＋1話」と「観た！」ボタンを表示する
    if (currentTab === 'want') {
      // 👈 【新機能】＋1話進めるボタン
      const plusBtn = document.createElement("button");
      plusBtn.textContent = "+1話";
      plusBtn.style.backgroundColor = "#007bff";
      plusBtn.style.color = "white";
      plusBtn.style.border = "none";
      plusBtn.style.padding = "5px 10px";
      plusBtn.style.borderRadius = "4px";
      plusBtn.style.cursor = "pointer";
      plusBtn.addEventListener("click", () => incrementEpisode(todo.id));
      btnGroup.appendChild(plusBtn);

      const watchBtn = document.createElement("button");
      watchBtn.className = "watch-button";
      watchBtn.textContent = "観た！";
      watchBtn.style.backgroundColor = "#2ed573";
      watchBtn.style.color = "white";
      watchBtn.style.border = "none";
      watchBtn.style.padding = "5px 10px";
      watchBtn.style.borderRadius = "4px";
      watchBtn.style.cursor = "pointer";
      watchBtn.addEventListener("click", () => watchAnime(todo.id));
      btnGroup.appendChild(watchBtn);
    }

    // 削除ボタン
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
  if (!errorDiv) {
    alert(message);
    return;
  }
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// フォームが送信されたときの動き
const todoForm = document.getElementById("todo-form");
if (todoForm) {
  todoForm.addEventListener("submit", function (e) {
    e.preventDefault();
    addTodo();
  });
}

// アプリが起動したときに、最初にデータを読み込む
loadTodos();