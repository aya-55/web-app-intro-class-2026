/**
 * アニメ視聴記録 App JavaScript - 複数選択＆一括操作対応版
 */

const API_URL = "/animes"; 
let currentTab = 'want';

// ============================================================
// 1. サーバーからデータを読み込む処理
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
    showError("通信エラーが発生しました。");
  }
}

// ============================================================
// 2. 新しく「観たいアニメ」を追加する処理
// ============================================================
async function addTodo() {
  const input = document.getElementById("todo-input");
  const totalEpInput = document.getElementById("todo-total-ep");
  
  if (!input || !totalEpInput) return;

  const title = input.value.trim();
  const totalEp = parseInt(totalEpInput.value, 10) || 12;

  if (title === "") {
    showError("アニメのタイトルを入力してください");
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, total_ep: totalEp }),
    });

    if (!response.ok) {
      showError("アニメの追加に失敗しました");
      return;
    }

    input.value = "";
    totalEpInput.value = "12";
    await loadTodos(); 
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 3. アニメを「観た！」状態に更新する処理
// ============================================================
async function watchAnime(id) {
  try {
    await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "watched" }),
    });
    await loadTodos();
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 4. 話数を1つ進める（+1話）処理
// ============================================================
async function incrementEpisode(id) {
  try {
    await fetch(`${API_URL}/${id}/increment`, { method: "PUT" });
    await loadTodos();
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 5. アニメを削除する処理
// ============================================================
async function deleteTodo(id) {
  try {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    await loadTodos();
  } catch (error) {
    showError("通信エラーが発生しました");
  }
}

// ============================================================
// 🛠️【新機能】複数のアニメを一括で「観た！」にする処理
// ============================================================
async function bulkWatch() {
  // 画面内の選択用チェックボックスで、チェックが入っているものを全て集める
  const checkboxes = document.querySelectorAll(".bulk-select-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("操作するアニメを真ん中のチェックボックスで選択してください");
    return;
  }

  // 1つずつ順番にサーバーへ「観た！」の通信を送る（ループ処理）
  for (const cb of checkboxes) {
    const animeId = cb.value;
    await fetch(`${API_URL}/${animeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "watched" }),
    });
  }
  await loadTodos(); // 全部終わったら画面を更新
}

// ============================================================
// 🛠️【新機能】複数のアニメを一括で「削除」する処理
// ============================================================
async function bulkDelete() {
  const checkboxes = document.querySelectorAll(".bulk-select-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("操作するアニメを真ん中のチェックボックスで選択してください");
    return;
  }

  if (!confirm(`選択した ${checkboxes.length} 件のアニメを削除してもよろしいですか？`)) {
    return;
  }

  // 1つずつ順番にサーバーへ「削除」の通信を送る
  for (const cb of checkboxes) {
    const animeId = cb.value;
    await fetch(`${API_URL}/${animeId}`, { method: "DELETE" });
  }
  await loadTodos();
}

// ============================================================
// 6. タブを切り替える処理
// ============================================================
function switchTab(tabName) {
  currentTab = tabName;
  
  const tabWant = document.getElementById("tab-want");
  const tabWatched = document.getElementById("tab-watched");
  const bulkWatchBtn = document.getElementById("bulk-watch-btn");
  
  if (tabWant && tabWatched) {
    if (tabName === 'want') {
      tabWant.style.borderBottom = "3px solid #007bff";
      tabWant.style.fontWeight = "bold";
      tabWant.style.color = "#333";
      tabWatched.style.borderBottom = "none";
      tabWatched.style.fontWeight = "normal";
      tabWatched.style.color = "#777";
      if (bulkWatchBtn) bulkWatchBtn.style.display = "inline-block"; // これから観るタブなら一括視聴ボタンを出す
    } else {
      tabWant.style.borderBottom = "none";
      tabWant.style.fontWeight = "normal";
      tabWant.style.color = "#777";
      tabWatched.style.borderBottom = "3px solid #007bff";
      tabWatched.style.fontWeight = "bold";
      tabWatched.style.color = "#333";
      if (bulkWatchBtn) bulkWatchBtn.style.display = "none"; // 視聴済みタブなら隠す
    }
  }
  loadTodos();
}

// ============================================================
// 7. 画面にアニメリストを描画する処理（複数選択用チェックボックス対応）
// ============================================================
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = ""; 

  const safeTodos = Array.isArray(todos) ? todos : [];

  // 合計カウンターの計算
  const watchedAnimeCount = safeTodos.filter(todo => todo && todo.status === 'watched').length;
  const totalEpisodeCount = safeTodos.reduce((sum, todo) => sum + ((todo && todo.current_ep) || 0), 0);

  const animeCountEl = document.getElementById("total-anime-count");
  const epCountEl = document.getElementById("total-episode-count");
  if (animeCountEl) animeCountEl.textContent = watchedAnimeCount;
  if (epCountEl) epCountEl.textContent = totalEpisodeCount;

  // 検索処理
  const searchInput = document.getElementById("search-input");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredTodos = safeTodos.filter((todo) => {
    if (!todo) return false;
    const status = todo.status || 'want';
    const matchesTab = (status === currentTab);
    const animeTitle = todo.title ? todo.title.toLowerCase() : "";
    return matchesTab && animeTitle.includes(keyword);
  });

  // リストの生成
  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

    // 左側：選択用チェックボックス ＋ タイトルと話数表示
    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.alignItems = "center";
    leftGroup.style.gap = "10px";

    // 👈【新機能】一括配作用の複数選択チェックボックス
    const selectCb = document.createElement("input");
    selectCb.type = "checkbox";
    selectCb.className = "bulk-select-checkbox";
    selectCb.value = todo.id; // あとで識別できるようにIDを仕込む
    leftGroup.appendChild(selectCb);

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

    const epSpan = document.createElement("span");
    epSpan.style.fontSize = "13px";
    epSpan.style.color = "#666";
    epSpan.textContent = `話数: ${todo.current_ep || 0} / ${todo.total_ep || 12} 話`;
    infoDiv.appendChild(epSpan);

    leftGroup.appendChild(infoDiv);
    li.appendChild(leftGroup);

    // 右側：個別のボタングループ
    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "5px";

    if (currentTab === 'want') {
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
// ============================================================
// 8. イベント設定＆コピー機能付きエラー表示
// ============================================================
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (!errorDiv) {
    alert(message);
    return;
  }
  
  // 👈 エラーメッセージにクリック用の案内文を少し足して表示
  errorDiv.innerHTML = `${message} <span style="font-size:11px; display:block; text-decoration:underline; cursor:pointer; margin-top:4px;">(クリックでエラー内容をコピー)</span>`;
  errorDiv.style.display = "block";
  errorDiv.style.cursor = "pointer";
  errorDiv.style.userSelect = "text"; // マウスでドラッグして文字選択もできるようにする

  // 👈 【新機能】エラー表示をクリックしたら自動でクリップボードにコピー
  errorDiv.onclick = async () => {
    try {
      await navigator.clipboard.writeText(message);
      alert("エラー内容をコピーしました！先生やAIに貼り付けて見せてください。");
    } catch (err) {
      console.error("コピー失敗:", err);
    }
  };

  // 5秒後に自動で消すタイマー
  setTimeout(() => { 
    errorDiv.style.display = "none"; 
    errorDiv.onclick = null;
  }, 5000);
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => { loadTodos(); });
  }

  const todoForm = document.getElementById("todo-form");
  if (todoForm) {
    todoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      addTodo();
    });
  }

  // 初回起動時にボタンの初期表示を整える
  const bulkWatchBtn = document.getElementById("bulk-watch-btn");
  if (bulkWatchBtn) bulkWatchBtn.style.display = "inline-block";

  loadTodos();
});
