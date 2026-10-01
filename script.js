// YouTube Player


function loadVideo(videoInput = null) {
    const input = videoInput || document.getElementById("url").value.trim();

    let videoId = "";
    let isShorts = false;

    try {
        // URLとして解析
        const url = new URL(
            input.startsWith("http") ? input : `https://${input}`
        );

        const hostname = url.hostname.replace(/^www\./, "");

        if (hostname === "youtube.com") {
            const match = url.pathname.match(
                /^\/(embed|shorts|live)\/([^/?]+)/
            );

            if (match) {
                videoId = match[2];
                isShorts = match[1] === "shorts";
            } else {
                videoId = url.searchParams.get("v") || "";
            }

        } else if (hostname === "youtu.be") {
            videoId = url.pathname.split("/").filter(Boolean)[0] || "";

        } else if (hostname === "youtube-nocookie.com") {
            const match = url.pathname.match(/^\/embed\/([^/?]+)/);
            if (match) videoId = match[1];
        }

    } catch {
        // URLではなく動画IDとして扱う
        videoId = input;
    }

    // 動画IDのチェック
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        alert("Invalid YouTube video ID or URL.");
        return;
    }

    // 動画を表示
    const player = document.getElementById("player");
    player.innerHTML = "";
    player.className = isShorts ? "shorts-player" : "normal-player";

    const iframe = document.createElement("iframe");

    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    iframe.title = "YouTube video player";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

    player.appendChild(iframe);

    // 履歴に保存
    addHistory(videoId, isShorts);
}

// History

function getHistory() {
return JSON.parse(localStorage.getItem("youtubeHistory") || "[]");
}

function addHistory(videoId) {
let history = getHistory();


history = history.filter(item => item.id !== videoId);

history.unshift({
    id: videoId,
    title: null,
    author: null,
    date: new Date().toLocaleString("ja-JP")
});

history = history.slice(0, 50);

localStorage.setItem("youtubeHistory", JSON.stringify(history));

renderHistory();

// Fetch title
fetchVideoTitle(videoId);


}

// Display history

function renderHistory() {
const history = getHistory();
const container = document.getElementById("history");


container.innerHTML = "";

if (history.length === 0) {
    container.textContent = "履歴はありません。";
    return;
}

history.forEach(item => {
    const element = document.createElement("div");
    element.className = "history-item";

    const image = document.createElement("img");
    image.src = `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`;
    image.alt = "Video thumbnail";

    const info = document.createElement("div");
    info.className = "history-info";

    const title = document.createElement("strong");
    title.textContent = item.title || "タイトルを取得中...";

    const author = document.createElement("p");
    author.textContent = item.author || "";

    const date = document.createElement("p");
    date.textContent = item.date;

    info.appendChild(title);
    info.appendChild(author);
    info.appendChild(date);

    const playButton = document.createElement("button");
    playButton.textContent = "再生";
    playButton.addEventListener("click", () => {
        loadVideo(item.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";
    deleteButton.className = "delete-button";

    deleteButton.addEventListener("click", () => {
        removeHistory(item.id);
    });

    element.appendChild(image);
    element.appendChild(info);
    element.appendChild(playButton);
    element.appendChild(deleteButton);

    container.appendChild(element);
});


}

// Fetch YouTube title using oEmbed

async function fetchVideoTitle(videoId) {
try {
const response = await fetch(
`https://www.youtube.com/oembed?url=${encodeURIComponent(
                `https://www.youtube.com/watch?v=${videoId}`
)}&format=json`
);


    if (!response.ok) return;

    const data = await response.json();

    let history = getHistory();

    history = history.map(item => {
        if (item.id === videoId) {
            return {
                ...item,
                title: data.title,
                author: data.author_name
            };
        }

        return item;
    });

    localStorage.setItem("youtubeHistory", JSON.stringify(history));

    renderHistory();

} catch (error) {
    console.error("Failed to fetch video title:", error);
}


}

// Delete one history

function removeHistory(videoId) {
let history = getHistory();


history = history.filter(item => item.id !== videoId);

localStorage.setItem("youtubeHistory", JSON.stringify(history));

renderHistory();


}

// Clear all history

function clearHistory() {
if (!confirm("すべての再生履歴を削除しますか？")) {
return;
}


localStorage.removeItem("youtubeHistory");

renderHistory();


}

// Enter key

document.getElementById("url").addEventListener("keydown", function(event) {
if (event.key === "Enter") {
loadVideo();
}
});

// Initialize

renderHistory();
