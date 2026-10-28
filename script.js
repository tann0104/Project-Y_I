"use strict";

// ========================================
// Tan Video Player: YouTube + TikTok
// YouTube Search: Cloudflare Worker
// ========================================

const WORKER_URL = "https://y-iapi.tann0104.workers.dev";

const HISTORY_KEY = "youtubeHistory";
const MAX_HISTORY = 50;
const YOUTUBE_BATCH_SIZE = 8;
const MAX_YOUTUBE_RESULTS = 50;

let youtubeSearchInProgress = false;
let allYouTubeResults = [];
let displayedYouTubeCount = 0;


// ========================================
// Simple Password Gate
// ========================================

// Change this password to your own password.
const PLAYER_PASSWORD = "TanPlayer2026";
const AUTH_SESSION_KEY = "tanVideoPlayerAuthenticated";

function setAuthenticatedView(isAuthenticated) {
    const loginScreen = getElement("login-screen");
    const siteContent = getElement("site-content");

    if (loginScreen) loginScreen.hidden = isAuthenticated;
    if (siteContent) siteContent.hidden = !isAuthenticated;

    if (isAuthenticated) {
        const error = getElement("login-error");
        if (error) error.textContent = "";
    }
}

function initializeLogin() {
    const loginForm = getElement("login-form");
    const passwordInput = getElement("login-password");
    const loginError = getElement("login-error");
    const logoutButton = getElement("logout-button");

    let isAuthenticated = false;

    try {
        isAuthenticated =
            sessionStorage.getItem(AUTH_SESSION_KEY) === "true";
    } catch (error) {
        console.warn("Could not read session storage:", error);
    }

    setAuthenticatedView(isAuthenticated);

    if (loginForm) {
        loginForm.addEventListener("submit", event => {
            event.preventDefault();

            const enteredPassword = passwordInput?.value ?? "";

            if (enteredPassword === PLAYER_PASSWORD) {
                try {
                    sessionStorage.setItem(AUTH_SESSION_KEY, "true");
                } catch (error) {
                    console.warn("Could not save login state:", error);
                }

                if (passwordInput) passwordInput.value = "";

                setAuthenticatedView(true);
            } else {
                if (loginError) {
                    loginError.textContent = "パスワードが違います。";
                }

                if (passwordInput) {
                    passwordInput.value = "";
                    passwordInput.focus();
                }
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            try {
                sessionStorage.removeItem(AUTH_SESSION_KEY);
            } catch (error) {
                console.warn("Could not clear login state:", error);
            }

            // Stop the current video before returning to the lock screen.
            resetPlayerPlaceholder();
            setAuthenticatedView(false);

            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }
        });
    }
}

function resetPlayerPlaceholder() {
    const player = getElement("player");
    if (!player) return;

    player.replaceChildren();
    player.className = "normal-player";

    const placeholder = document.createElement("div");
    placeholder.className = "player-placeholder";

    const icon = document.createElement("span");
    icon.textContent = "▶";

    const message = document.createElement("p");
    message.textContent = "動画URLを入力して再生してください";

    placeholder.append(icon, message);
    player.appendChild(placeholder);
}


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

    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
        return { id: value, isShorts: false };
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(value) ? value : `https://${value}`
        );

        const host = url.hostname.replace(/^www\./i, "").toLowerCase();

        let id = "";
        let isShorts = false;

        if ([
            "youtube.com",
            "m.youtube.com",
            "music.youtube.com"
        ].includes(host)) {
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
            const match = url.pathname.match(/^\/embed\/([^/?#]+)/);
            if (match) id = match[1];
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return null;

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

    const urlInput = getElement("url");

    if (urlInput) {
        urlInput.value = video.isShorts
            ? `https://www.youtube.com/shorts/${video.id}`
            : `https://www.youtube.com/watch?v=${video.id}`;
    }

    player.replaceChildren();
    player.className = video.isShorts ? "shorts-player" : "normal-player";

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}`;
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
    try {
        const value = String(input).trim();

        const url = new URL(
            /^https?:\/\//i.test(value) ? value : `https://${value}`
        );

        const host = url.hostname.replace(/^www\./i, "").toLowerCase();

        return host === "tiktok.com" || host.endsWith(".tiktok.com");
    } catch {
        return false;
    }
}


// ========================================
// TikTok URL Parser
// ========================================

function parseTikTokVideoId(input) {
    const value = String(input || "").trim();

    if (/^\d+$/.test(value)) return value;

    try {
        const url = new URL(
            /^https?:\/\//i.test(value) ? value : `https://${value}`
        );

        const host = url.hostname.replace(/^www\./i, "").toLowerCase();

        if (host !== "tiktok.com" && !host.endsWith(".tiktok.com")) {
            return null;
        }

        const playerMatch = url.pathname.match(/^\/player\/v1\/(\d+)/);
        if (playerMatch) return playerMatch[1];

        const videoMatch = url.pathname.match(/\/video\/(\d+)/);
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

    const urlInput = getElement("url");

    if (urlInput) {
        urlInput.value = `https://www.tiktok.com/video/${videoId}`;
    }

    player.replaceChildren();
    player.className = "tiktok-player";

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.tiktok.com/player/v1/${videoId}`;
    iframe.title = "TikTok video player";
    iframe.allow = "fullscreen";
    iframe.allowFullscreen = true;

    player.appendChild(iframe);

    addHistory(videoId, false, "tiktok");
}


// ========================================
// History: Read and Save
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

function saveHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save history:", error);
    }
}


// ========================================
// History: Add
// ========================================

function addHistory(videoId, isShorts = false, platform = "youtube") {
    let history = getHistory();

    history = history.filter(item => !(
        item.id === videoId &&
        (item.platform || "youtube") === platform
    ));

    history.unshift({
        id: videoId,
        platform,
        title: null,
        author: null,
        isShorts,
        date: new Date().toLocaleString("ja-JP")
    });

    saveHistory(history.slice(0, MAX_HISTORY));
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

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "再生";

        playButton.addEventListener("click", () => {
            if (platform === "tiktok") {
                loadTikTok(item.id);
            } else if (item.isShorts) {
                loadYouTube(`https://www.youtube.com/shorts/${item.id}`);
            } else {
                loadYouTube(item.id);
            }
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "削除";
        deleteButton.className = "delete-button";

        deleteButton.addEventListener("click", () => {
            removeHistory(item.id, platform);
        });

        element.append(image, info, playButton, deleteButton);
        container.appendChild(element);
    });
}


// ========================================
// History: Fetch Titles
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
            if (item.id === videoId && item.platform === "tiktok") {
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
        console.warn("Could not fetch TikTok title:", error);
    }
}


// ========================================
// History: Delete
// ========================================

function removeHistory(videoId, platform = "youtube") {
    const history = getHistory().filter(item => !(
        item.id === videoId &&
        (item.platform || "youtube") === platform
    ));

    saveHistory(history);
    renderHistory();
}

function clearHistory() {
    if (!confirm("すべての再生履歴を削除しますか？")) return;

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
            data.error || data.message || `Worker error: ${response.status}`
        );
    }

    if (!Array.isArray(data.items)) {
        throw new Error("検索結果の形式が正しくありません。");
    }

    return data.items
        .map(video => {
            const id = typeof video.id === "string"
                ? video.id
                : video.id?.videoId;

            return {
                id: id || "",
                title:
                    video.title ||
                    video.snippet?.title ||
                    "Untitled",
                channel:
                    video.channel ||
                    video.channelTitle ||
                    video.snippet?.channelTitle ||
                    "",
                thumbnail:
                    video.thumbnail ||
                    video.snippet?.thumbnails?.medium?.url ||
                    video.snippet?.thumbnails?.default?.url ||
                    ""
            };
        })
        .filter(video => /^[a-zA-Z0-9_-]{11}$/.test(video.id))
        .slice(0, MAX_YOUTUBE_RESULTS);
}


// ========================================
// YouTube Search: Prepare Results
// ========================================

function renderYouTubeSearchResults(videos) {
    const container = getElement("youtube-search-results");
    if (!container) return;

    allYouTubeResults = Array.isArray(videos)
        ? videos.slice(0, MAX_YOUTUBE_RESULTS)
        : [];

    displayedYouTubeCount = 0;

    container.replaceChildren();

    const oldControls = getElement("youtube-load-controls");
    if (oldControls) oldControls.remove();

    if (allYouTubeResults.length === 0) {
        const empty = document.createElement("p");
        empty.className = "youtube-search-empty";
        empty.textContent = "動画が見つかりませんでした。";
        container.appendChild(empty);
        return;
    }

    const controls = document.createElement("div");
    controls.id = "youtube-load-controls";
    controls.className = "youtube-load-controls";

    const status = document.createElement("p");
    status.id = "youtube-display-count";
    status.setAttribute("aria-live", "polite");

    const button = document.createElement("button");
    button.id = "youtube-load-more";
    button.type = "button";
    button.textContent = "さらに8件表示";

    controls.append(status, button);
    container.after(controls);

    button.addEventListener("click", renderNextYouTubeBatch);

    // Display the first 8 results.
    renderNextYouTubeBatch();
}


// ========================================
// YouTube Search: Show 8 at a Time
// ========================================

function renderNextYouTubeBatch() {
    const container = getElement("youtube-search-results");
    const button = getElement("youtube-load-more");

    if (!container) return;

    if (displayedYouTubeCount >= allYouTubeResults.length) {
        updateYouTubeDisplayStatus();
        return;
    }

    const nextItems = allYouTubeResults.slice(
        displayedYouTubeCount,
        displayedYouTubeCount + YOUTUBE_BATCH_SIZE
    );

    nextItems.forEach(video => {
        const card = document.createElement("article");
        card.className = "youtube-result-item";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Play ${video.title}`);

        const image = document.createElement("img");
        image.className = "youtube-result-thumbnail";
        image.src = video.thumbnail ||
            `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;
        image.alt = video.title;
        image.loading = "lazy";

        image.onerror = () => {
            image.onerror = null;
            image.src =
                `https://img.youtube.com/vi/${encodeURIComponent(video.id)}/mqdefault.jpg`;
        };

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

        const playVideo = () => {
            loadYouTube(video.id);

            getElement("player")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        };

        playButton.addEventListener("click", event => {
            event.stopPropagation();
            playVideo();
        });

        card.addEventListener("click", playVideo);

        card.addEventListener("keydown", event => {
            if (
                event.target === card &&
                (event.key === "Enter" || event.key === " ")
            ) {
                event.preventDefault();
                playVideo();
            }
        });

        info.append(title, channel, playButton);
        card.append(image, info);
        container.appendChild(card);
    });

    displayedYouTubeCount += nextItems.length;

    updateYouTubeDisplayStatus();

    if (button) {
        button.hidden =
            displayedYouTubeCount >= allYouTubeResults.length;
    }
}


// ========================================
// YouTube Search: Display Status
// ========================================

function updateYouTubeDisplayStatus() {
    const status = getElement("youtube-display-count");
    const button = getElement("youtube-load-more");

    if (status) {
        status.textContent =
            `${displayedYouTubeCount} / ${allYouTubeResults.length} 件を表示中`;
    }

    if (button) {
        const remaining =
            allYouTubeResults.length - displayedYouTubeCount;

        button.textContent = remaining > 0
            ? `さらに${Math.min(YOUTUBE_BATCH_SIZE, remaining)}件表示`
            : "すべて表示しました";

        button.hidden = remaining <= 0;
    }
}


// ========================================
// YouTube Search: Form Handler
// ========================================

async function handleYouTubeSearch(event) {
    // Prevent the browser from navigating away from the player.
    if (event) {
        event.preventDefault();
    }

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

    youtubeSearchInProgress = true;

    if (button) {
        button.disabled = true;
        button.textContent = "検索中...";
    }

    status.textContent = "YouTubeを検索しています...";
    results.replaceChildren();

    const oldControls = getElement("youtube-load-controls");
    if (oldControls) oldControls.remove();

    try {
        const videos = await searchYouTubeVideos(query);

        renderYouTubeSearchResults(videos);

        status.textContent =
            `${videos.length} 件の動画を取得しました。`;
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
    initializeLogin();

    const searchForm = getElement("youtube-search-form");

    if (searchForm) {
        searchForm.addEventListener("submit", handleYouTubeSearch);
    }

    const searchButton = getElement("youtube-search-button");

    if (searchButton && !searchForm) {
        searchButton.addEventListener("click", handleYouTubeSearch);
    }

    // Handle the video form in the supplied index.html.
    const videoForm = getElement("video-form");

    if (videoForm) {
        videoForm.addEventListener("submit", event => {
            event.preventDefault();
            loadVideo();
        });
    } else {
        // Backward compatibility with older HTML versions.
        const urlInput = getElement("url");

        if (urlInput) {
            urlInput.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.isComposing) {
                    event.preventDefault();
                    loadVideo();
                }
            });
        }
    }

    // Support the current HTML ID and the older ID.
    const clearButton =
        getElement("clear-history") ||
        getElement("clear-history-button");

    if (clearButton) {
        clearButton.addEventListener("click", clearHistory);
    }

    renderHistory();

    console.log("Tan Video Player initialized successfully.");
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeVideoPlayer,
        { once: true }
    );
} else {
    initializeVideoPlayer();
}
