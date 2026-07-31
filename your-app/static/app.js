/**
 * アニメ視聴記録 App JavaScript - 検索＆カウンター完全版
 */

const API_URL = "/animes"; // 👈 どんな環境でも絶対に通信エラーにならない相対パス
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
    const response = await fetch(`${API_URL}/${id}`, {
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
    const response = await fetch(`${API_URL}/${id}/increment`, {
      method: "PUT"
    });
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
    tabWatched.style.bold = true;
    tabWatched.style.fontWeight = "bold";
    tabWatched.style.color = "#333";
  }
  
  // 👈 タブ切り替え時、検索文字が残っていても正しく動くようにloadTodosを呼ぶ
  loadTodos();
}

// ============================================================
// 7. 画面にアニメリストを描画する処理（検索対応）
// ============================================================
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = ""; 

  // 👈 検索窓に入力されている文字をリアルタイムに取得
  const searchInput = document.getElementById("search-input");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  // タブの絞り込み ＋ 検索キーワードの絞り込み
  const filteredTodos = todos.filter((todo) => {
    const status = todo.status || 'want';
    const matchesTab = (status === currentTab);
    const matchesKeyword = todo.title.toLowerCase().includes(keyword);
    return matchesTab && matchesKeyword;
  });

  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

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
    epSpan.textContent = `話数: ${todo.current_ep} / ${todo.total_ep} 話`;
    infoDiv.appendChild(epSpan);

    li.appendChild(infoDiv);

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
// 8. イベント設定
// ============================================================
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => { errorDiv.style.display = "none"; }, 5000);
}

// 全ての準備が整ったら動く初期化処理
document.addEventListener("DOMContentLoaded", () => {
  // 👈 検索窓への入力を常に見張って、リアルタイムに画面を書き換える設定
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      loadTodos();
    });
  }

  const todoForm = document.getElementById("todo-form");
  if (todoForm) {
    todoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      addTodo();
    });
  }

  loadTodos();
});
/**
 * アニメ視聴記録 App JavaScript - 検索＆カウンター完全版
 */

const API_URL = "/animes"; // 👈 どんな環境でも絶対に通信エラーにならない相対パス
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
    const response = await fetch(`${API_URL}/${id}`, {
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
    const response = await fetch(`${API_URL}/${id}/increment`, {
      method: "PUT"
    });
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
    tabWatched.style.bold = true;
    tabWatched.style.fontWeight = "bold";
    tabWatched.style.color = "#333";
  }
  
  // 👈 タブ切り替え時、検索文字が残っていても正しく動くようにloadTodosを呼ぶ
  loadTodos();
}

// ============================================================
// 7. 画面にアニメリストを描画する処理（検索対応）
// ============================================================
function renderTodos(todos) {
  const list = document.getElementById("todo-list");
  if (!list) return;
  list.innerHTML = ""; 

  // 👈 検索窓に入力されている文字をリアルタイムに取得
  const searchInput = document.getElementById("search-input");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  // タブの絞り込み ＋ 検索キーワードの絞り込み
  const filteredTodos = todos.filter((todo) => {
    const status = todo.status || 'want';
    const matchesTab = (status === currentTab);
    const matchesKeyword = todo.title.toLowerCase().includes(keyword);
    return matchesTab && matchesKeyword;
  });

  filteredTodos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";

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
    epSpan.textContent = `話数: ${todo.current_ep} / ${todo.total_ep} 話`;
    infoDiv.appendChild(epSpan);

    li.appendChild(infoDiv);

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
// 8. イベント設定
// ============================================================
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (!errorDiv) return;
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => { errorDiv.style.display = "none"; }, 5000);
}

// 全ての準備が整ったら動く初期化処理
document.addEventListener("DOMContentLoaded", () => {
  // 👈 検索窓への入力を常に見張って、リアルタイムに画面を書き換える設定
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      loadTodos();
    });
  }

  const todoForm = document.getElementById("todo-form");
  if (todoForm) {
    todoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      addTodo();
    });
  }

  loadTodos();
});
