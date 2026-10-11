
"use strict";

// ========================================
// Video Player: YouTube + TikTok
// Search: Cloudflare Worker
// ========================================

// Replace this with your actual Cloudflare Worker URL.
const WORKER_URL = "https://y-iapi.tann0104.workers.dev";

const HISTORY_KEY = "youtubeHistory";
const MAX_HISTORY = 50;

let youtubeSearchInProgress = false;


// ========================================
// DOM Helpers
// ========================================

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, message) {
    const element = getElement(id);
    if (element) element.textContent = message;
}


// ========================================
// YouTube URL Parser
// ========================================

function parseYouTubeVideo(input) {
    const value = String(input || "").trim();

    // Direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
        return { id: value, isShorts: false };
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const host = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        let id = "";
        let isShorts = false;

        if (
            [
                "youtube.com",
                "m.youtube.com",
                "music.youtube.com"
            ].includes(host)
        ) {
            const match = url.pathname.match(
                /^\/(embed|shorts|live)\/([^/?#]+)/
            );

            if (match) {
                id = match[2];
                isShorts = match[1] === "shorts";
            } else {
                id = url.searchParams.get("v") || "";
            }
        } else if (host === "youtu.be") {
            id = url.pathname.split("/").filter(Boolean)[0] || "";
        } else if (host === "youtube-nocookie.com") {
            const match = url.pathname.match(
                /^\/embed\/([^/?#]+)/
            );

            if (match) id = match[1];
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
            return null;
        }

        return { id, isShorts };
    } catch (error) {
        console.error("YouTube URL parsing failed:", error);
        return null;
    }
}


// ========================================
// Load Video
// ========================================

function loadVideo(videoInput = null) {
    const input = String(
        videoInput ?? getElement("url")?.value ?? ""
    ).trim();

    if (!input) {
        alert("URL or video IDを入力してください。");
        return;
    }

    if (isTikTok(input)) {
        loadTikTok(input);
    } else {
        loadYouTube(input);
    }
}


// ========================================
// Load YouTube
// ========================================

function loadYouTube(input) {
    const video = parseYouTubeVideo(input);

    if (!video) {
        alert("Invalid YouTube video ID or URL.");
        return;
    }

    const player = getElement("player");

    if (!player) {
        console.error('Element "#player" was not found.');
        return;
    }

    player.replaceChildren();
    player.className = video.isShorts
        ? "shorts-player"
        : "normal-player";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.youtube-nocookie.com/embed/${video.id}`;

    iframe.title = "YouTube video player";
    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    player.appendChild(iframe);

    addHistory(video.id, video.isShorts, "youtube");
}


// ========================================
// TikTok Detection
// ========================================

function isTikTok(input) {
    const value = String(input || "").trim();

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const host = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        return (
            host === "tiktok.com" ||
            host.endsWith(".tiktok.com")
        );
    } catch {
        return false;
    }
}


// ========================================
// TikTok URL Parser
// ========================================

function parseTikTokVideoId(input) {
    const value = String(input || "").trim();

    if (/^\d+$/.test(value)) {
        return value;
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const host = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        if (
            host !== "tiktok.com" &&
            !host.endsWith(".tiktok.com")
        ) {
            return null;
        }

        const playerMatch = url.pathname.match(
            /^\/player\/v1\/(\d+)/
        );

        if (playerMatch) return playerMatch[1];

        const videoMatch = url.pathname.match(
            /\/video\/(\d+)/
        );

        if (videoMatch) return videoMatch[1];

        // Short links require redirect resolution.
        return null;
    } catch (error) {
        console.error("TikTok URL parsing failed:", error);
        return null;
    }
}


// ========================================
// Load TikTok
// ========================================

function loadTikTok(input) {
    const videoId = parseTikTokVideoId(input);

    if (!videoId) {
        alert(
            "Invalid TikTok URL. Use a full video URL containing /video/VIDEO_ID."
        );
        return;
    }

    const player = getElement("player");

    if (!player) {
        console.error('Element "#player" was not found.');
        return;
    }

    player.replaceChildren();
    player.className = "tiktok-player";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.tiktok.com/player/v1/${videoId}`;

    iframe.title = "TikTok video player";
    iframe.allow = "fullscreen";
    iframe.allowFullscreen = true;

    player.appendChild(iframe);

    addHistory(videoId, false, "tiktok");
}


// ========================================
// History: Read
// ========================================

function getHistory() {
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        const history = JSON.parse(saved || "[]");

        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error("Failed to read history:", error);
        return [];
    }
}


// ========================================
// History: Save
// ========================================

function saveHistory(history) {
    try {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );
    } catch (error) {
        console.error("Failed to save history:", error);
    }
}


// ========================================
// History: Add
// ========================================

function addHistory(
    videoId,
    isShorts = false,
    platform = "youtube"
) {
    let history = getHistory();

    // Remove the same video from its previous position.
    history = history.filter(item => {
        return !(
            item.id === videoId &&
            (item.platform || "youtube") === platform
        );
    });

    history.unshift({
        id: videoId,
        platform,
        title: null,
        author: null,
        isShorts,
        date: new Date().toLocaleString("ja-JP")
    });

    history = history.slice(0, MAX_HISTORY);

    saveHistory(history);
    renderHistory();

    if (platform === "youtube") {
        fetchYouTubeTitle(videoId);
    } else if (platform === "tiktok") {
        fetchTikTokTitle(videoId);
    }
}


// ========================================
// History: Render
// ========================================

function renderHistory() {
    const history = getHistory();
    const container = getElement("history");

    if (!container) return;

    container.replaceChildren();

    if (history.length === 0) {
        container.textContent = "履歴はありません。";
        return;
    }

    history.forEach(item => {
        const platform = item.platform || "youtube";

        const element = document.createElement("div");
        element.className = "history-item";

        // Thumbnail
        const image = document.createElement("img");

        if (platform === "youtube") {
            image.src =
                `https://img.youtube.com/vi/${encodeURIComponent(item.id)}/mqdefault.jpg`;
        } else {
            image.src = "https://www.tiktok.com/favicon.ico";
        }

        image.alt = `${platform} video thumbnail`;
        image.loading = "lazy";

        image.onerror = () => {
            image.style.display = "none";
        };

        // Information
        const info = document.createElement("div");
        info.className = "history-info";

        const title = document.createElement("strong");
        title.textContent = item.title || "タイトルを取得中...";

        const author = document.createElement("p");
        author.textContent = item.author || "";

        const date = document.createElement("p");
        date.textContent = item.date || "";

        const platformLabel = document.createElement("small");
        platformLabel.textContent =
            platform === "tiktok" ? "TikTok" : "YouTube";

        info.append(title, author, date, platformLabel);

        // Play button
        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "再生";

        playButton.addEventListener("click", () => {
            if (platform === "tiktok") {
                loadTikTok(item.id);
            } else if (item.isShorts) {
                loadYouTube(
                    `https://www.youtube.com/shorts/${item.id}`
                );
            } else {
                loadYouTube(item.id);
            }
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "削除";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", () => {
            removeHistory(item.id, platform);
        });

        element.append(
            image,
            info,
            playButton,
            deleteButton
        );

        container.appendChild(element);
    });
}


// ========================================
// Fetch YouTube Title
// ========================================

async function fetchYouTubeTitle(videoId) {
    try {
        const params = new URLSearchParams({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            format: "json"
        });

        const response = await fetch(
            `https://www.youtube.com/oembed?${params}`
        );

        if (!response.ok) return;

        const data = await response.json();

        const history = getHistory().map(item => {
            if (
                item.id === videoId &&
                (item.platform || "youtube") === "youtube"
            ) {
                return {
                    ...item,
                    title: data.title || "YouTube",
                    author: data.author_name || ""
                };
            }

            return item;
        });

        saveHistory(history);
        renderHistory();
    } catch (error) {
        console.warn("Could not fetch YouTube title:", error);
    }
}


// ========================================
// Fetch TikTok Title
// ========================================

async function fetchTikTokTitle(videoId) {
    try {
        const params = new URLSearchParams({
            url: `https://www.tiktok.com/video/${videoId}`
        });

        const response = await fetch(
            `https://www.tiktok.com/oembed?${params}`
        );

        if (!response.ok) return;

        const data = await response.json();

        const history = getHistory().map(item => {
            if (
                item.id === videoId &&
                item.platform === "tiktok"
            ) {
                return {
                    ...item,
                    title: data.title || "TikTok",
                    author: data.author_name || ""
                };
            }

            return item;
        });

        saveHistory(history);
        renderHistory();
    } catch (error) {
        // TikTok may block browser-side oEmbed requests.
        console.warn("Could not fetch TikTok title:", error);
    }
}


// ========================================
// History: Delete One
// ========================================

function removeHistory(videoId, platform = "youtube") {
    const history = getHistory().filter(item => {
        return !(
            item.id === videoId &&
            (item.platform || "youtube") === platform
        );
    });

    saveHistory(history);
    renderHistory();
}


// ========================================
// History: Clear All
// ========================================

function clearHistory() {
    if (!confirm("すべての再生履歴を削除しますか？")) {
        return;
    }

    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}


// ========================================
// YouTube Search: Request Worker
// ========================================

async function searchYouTubeVideos(query) {
    const workerUrl = new URL(WORKER_URL);
    workerUrl.searchParams.set("q", query);

    const response = await fetch(workerUrl.toString());

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "Workerから正しいJSONレスポンスが返されませんでした。"
        );
    }

    if (!response.ok) {
        throw new Error(
            data.error ||
            data.message ||
            `Worker error: ${response.status}`
        );
    }

    if (!Array.isArray(data.items)) {
        throw new Error(
            "検索結果の形式が正しくありません。Workerのレスポンスを確認してください。"
        );
    }

    return data.items
        .map(video => {
            // Accept either a string ID or YouTube API's ID object.
            const id =
                typeof video.id === "string"
                    ? video.id
                    : video.id?.videoId;

            return {
                id: id || "",
                title: video.title || video.snippet?.title || "Untitled",
                channel: video.channel || video.channelTitle ||
                    video.snippet?.channelTitle || "",
                thumbnail: video.thumbnail ||
                    video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url || ""
            };
        })
        .filter(video => /^[a-zA-Z0-9_-]{11}$/.test(video.id));
}


// ========================================
// YouTube Search: Render Results
// ========================================

function renderYouTubeSearchResults(videos) {
    const container = getElement("youtube-search-results");

    if (!container) return;

    container.replaceChildren();

    if (videos.length === 0) {
        const empty = document.createElement("p");
        empty.className = "youtube-search-empty";
        empty.textContent = "動画が見つかりませんでした。";
        container.appendChild(empty);
        return;
    }

    videos.forEach(video => {
        const card = document.createElement("article");
        card.className = "youtube-result-item";

        if (video.thumbnail) {
            const image = document.createElement("img");
            image.className = "youtube-result-thumbnail";
            image.src = video.thumbnail;
            image.alt = video.title;
            image.loading = "lazy";
            card.appendChild(image);
        }

        const info = document.createElement("div");
        info.className = "youtube-result-info";

        const title = document.createElement("strong");
        title.className = "youtube-result-title";
        title.textContent = video.title;

        const channel = document.createElement("p");
        channel.className = "youtube-result-channel";
        channel.textContent = video.channel;

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "youtube-result-play";
        playButton.textContent = "▶ 再生";

        playButton.addEventListener("click", () => {
            loadYouTube(video.id);

            getElement("player")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        });

        info.append(title, channel, playButton);
        card.appendChild(info);
        container.appendChild(card);
    });
}


// ========================================
// YouTube Search: Form Handler
// ========================================

async function handleYouTubeSearch(event) {
    event?.preventDefault();

    if (youtubeSearchInProgress) return;

    const input = getElement("youtube-search-input");
    const status = getElement("youtube-search-status");
    const button = getElement("youtube-search-button");
    const results = getElement("youtube-search-results");

    if (!input || !status || !results) {
        console.error("YouTube search HTML elements are missing.");
        return;
    }

    const query = input.value.trim();

    if (!query) {
        status.textContent = "検索キーワードを入力してください。";
        return;
    }

    if (!WORKER_URL.startsWith("https://")) {
        status.textContent = "Worker URLの設定を確認してください。";
        return;
    }

    youtubeSearchInProgress = true;

    if (button) {
        button.disabled = true;
        button.textContent = "検索中...";
    }

    status.textContent = "YouTubeを検索しています...";
    results.replaceChildren();

    try {
        const videos = await searchYouTubeVideos(query);

        renderYouTubeSearchResults(videos);

        status.textContent =
            `${videos.length} 件の動画が見つかりました。`;
    } catch (error) {
        console.error("YouTube search failed:", error);

        status.textContent =
            `検索に失敗しました: ${error.message}`;
    } finally {
        youtubeSearchInProgress = false;

        if (button) {
            button.disabled = false;
            button.textContent = "検索";
        }
    }
}


// ========================================
// Initialize
// ========================================

function initializeVideoPlayer() {
    // Search form
    const searchForm = getElement("youtube-search-form");

    if (searchForm) {
        searchForm.addEventListener(
            "submit",
            handleYouTubeSearch
        );
    }

    // URL input: Enter key
    const urlInput = getElement("url");

    if (urlInput) {
        urlInput.addEventListener("keydown", event => {
            if (
                event.key === "Enter" &&
                !event.isComposing
            ) {
                event.preventDefault();
                loadVideo();
            }
        });
    }

    // Optional clear-history button
    const clearButton = getElement("clear-history-button");

    if (clearButton) {
        clearButton.addEventListener("click", clearHistory);
    }

    renderHistory();

    console.log("Video Player initialized successfully.");
}

// The script uses defer, but this also supports other loading methods.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeVideoPlayer,
        { once: true }
    );
} else {
    initializeVideoPlayer();
}


function renderYouTubeResults(items) {
    const container = document.getElementById(
        "youtube-search-results"
    );

    if (!container) return;

    container.replaceChildren();

    if (!items || items.length === 0) {
        container.textContent = "No videos found.";
        return;
    }

    items.forEach((video) => {
        const card = document.createElement("article");
        card.className = "youtube-video-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
            "aria-label",
            `Play ${video.title || "YouTube video"}`
        );

        const thumbnail = document.createElement("img");
        thumbnail.src =
            video.thumbnail ||
            `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;
        thumbnail.alt = video.title || "Video thumbnail";
        thumbnail.loading = "lazy";

        const info = document.createElement("div");
        info.className = "youtube-video-info";

        const title = document.createElement("p");
        title.className = "youtube-video-title";
        title.textContent = video.title || "Untitled";

        const channel = document.createElement("p");
        channel.className = "youtube-video-channel";
        channel.textContent = video.channel || "";

        info.append(title, channel);
        card.append(thumbnail, info);

        const playVideo = () => {
            const input = document.getElementById("url");
            if (input) input.value =
                `https://www.youtube.com/watch?v=${video.id}`;

            // Use the existing player and history logic.
            if (typeof loadVideo === "function") {
                loadVideo(`https://www.youtube.com/watch?v=${video.id}`);
            }
        };

        card.addEventListener("click", playVideo);
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                playVideo();
            }
        });

        container.appendChild(card);
    });
}

