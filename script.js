
// ========================================
// Video Player
// YouTube + TikTok
// ========================================


// ========================================
// Load Video
// ========================================

function loadVideo(videoInput = null) {
    const input = String(
        videoInput ?? document.getElementById("url").value
    ).trim();

    if (!input) {
        alert("URL or video IDを入力してください。");
        return;
    }

    // ================================
    // Detect platform
    // ================================

    if (isTikTok(input)) {
        loadTikTok(input);
        return;
    }

    loadYouTube(input);
}


// ========================================
// YouTube
// ========================================

function loadYouTube(input) {
    let videoId = "";
    let isShorts = false;

    // 11文字のYouTube動画ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
        videoId = input;
    } else {
        try {
            const url = new URL(
                /^https?:\/\//i.test(input)
                    ? input
                    : `https://${input}`
            );

            const hostname = url.hostname
                .replace(/^www\./, "")
                .toLowerCase();

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

                videoId =
                    url.pathname
                        .split("/")
                        .filter(Boolean)[0] || "";

            } else if (hostname === "youtube-nocookie.com") {

                const match = url.pathname.match(
                    /^\/embed\/([^/?]+)/
                );

                if (match) {
                    videoId = match[1];
                }
            }

        } catch (error) {
            console.error("YouTube URL parsing error:", error);
        }
    }

    // ================================
    // Validate
    // ================================

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        console.error("Invalid YouTube input:", input);
        alert("Invalid YouTube video ID or URL.");
        return;
    }

    // ================================
    // Player
    // ================================

    const player = document.getElementById("player");

    if (!player) return;

    player.innerHTML = "";
    player.className = isShorts
        ? "shorts-player"
        : "normal-player";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.youtube-nocookie.com/embed/${videoId}`;

    iframe.title = "YouTube video player";

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.allowFullscreen = true;

    player.appendChild(iframe);

    // ================================
    // History
    // ================================

    addHistory(
        videoId,
        isShorts,
        "youtube"
    );
}


// ========================================
// TikTok detection
// ========================================

function isTikTok(input) {
    if (/^https?:\/\//i.test(input)) {
        try {
            const url = new URL(input);

            const hostname = url.hostname
                .replace(/^www\./, "")
                .toLowerCase();

            return (
                hostname === "tiktok.com" ||
                hostname.endsWith(".tiktok.com")
            );

        } catch {
            return false;
        }
    }

    return (
        input.includes("tiktok.com") ||
        input.includes("vm.tiktok.com") ||
        input.includes("vt.tiktok.com")
    );
}


// ========================================
// Load TikTok
// ========================================

function loadTikTok(input) {

    let videoId = "";

    try {
        const url = new URL(
            /^https?:\/\//i.test(input)
                ? input
                : `https://${input}`
        );

        const hostname = url.hostname
            .replace(/^www\./, "")
            .toLowerCase();

        // --------------------------------
        // /player/v1/VIDEO_ID
        // --------------------------------

        if (
            hostname === "tiktok.com" &&
            url.pathname.startsWith("/player/v1/")
        ) {
            videoId =
                url.pathname
                    .split("/")
                    .filter(Boolean)[2] || "";
        }

        // --------------------------------
        // /@username/video/VIDEO_ID
        // --------------------------------

        else {
            const match = url.pathname.match(
                /\/video\/(\d+)/
            );

            if (match) {
                videoId = match[1];
            }
        }

    } catch (error) {
        console.error("TikTok URL parsing error:", error);
    }

    // ================================
    // Validate TikTok ID
    // ================================

    if (!/^\d+$/.test(videoId)) {
        console.error("Invalid TikTok input:", input);
        alert("Invalid TikTok video URL.");
        return;
    }

    // ================================
    // Player
    // ================================

    const player = document.getElementById("player");

    if (!player) return;

    player.innerHTML = "";
    player.className = "tiktok-player";

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.tiktok.com/player/v1/${videoId}`;

    iframe.title = "TikTok video player";

    iframe.allow =
        "fullscreen";

    iframe.allowFullscreen = true;

    player.appendChild(iframe);

    // ================================
    // History
    // ================================

    addHistory(
        videoId,
        false,
        "tiktok"
    );
}


// ========================================
// History
// ========================================

function getHistory() {
    try {
        const saved =
            localStorage.getItem("youtubeHistory");

        const history =
            JSON.parse(saved || "[]");

        if (!Array.isArray(history)) {
            return [];
        }

        return history;

    } catch (error) {
        console.error(
            "Failed to read history:",
            error
        );

        return [];
    }
}


// ========================================
// Add History
// ========================================

function addHistory(
    videoId,
    isShorts = false,
    platform = "youtube"
) {

    let history = getHistory();

    // --------------------------------
    // Remove same video
    // --------------------------------

    history = history.filter(item => {
        return !(
            item.id === videoId &&
            (item.platform || "youtube") === platform
        );
    });

    // --------------------------------
    // Add new history
    // --------------------------------

    history.unshift({
        id: videoId,
        platform: platform,
        title: null,
        author: null,
        isShorts: isShorts,
        date: new Date().toLocaleString("ja-JP")
    });

    
/* ========================================
   YouTube Data API v3 Search
   ======================================== */

// Paste your Google Cloud API key here.
// Restrict the key to YouTube Data API v3
// and your website's HTTP referrers.
const YOUTUBE_API_KEY = "YOUR_API_KEY";

let youtubeSearchInProgress = false;

async function searchYouTubeVideos(query) {
    const url = new URL(
        "https://www.googleapis.com/youtube/v3/search"
    );

    url.search = new URLSearchParams({
        key: YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        maxResults: "10",
        q: query,
        safeSearch: "moderate"
    }).toString();

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        const reason =
            data?.error?.errors?.[0]?.reason || "";

        if (
            response.status === 403 &&
            (
                reason === "quotaExceeded" ||
                reason === "dailyLimitExceeded"
            )
        ) {
            throw new Error(
                "YouTube search quota exceeded. Try again later."
            );
        }

        if (
            response.status === 403 &&
            reason === "keyInvalid"
        ) {
            throw new Error(
                "Invalid API key. Check your Google Cloud settings."
            );
        }

        throw new Error(
            data?.error?.message ||
            `YouTube API error: ${response.status}`
        );
    }

    return (data.items || [])
        .filter(item => item.id?.videoId)
        .map(item => ({
            id: item.id.videoId,
            title: item.snippet?.title || "Untitled",
            channel: item.snippet?.channelTitle || "",
            thumbnail:
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                ""
        }));
}


// ========================================
// Render Search Results
// ========================================

function renderYouTubeSearchResults(videos) {
    const container = document.getElementById(
        "youtube-search-results"
    );

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

        const image = document.createElement("img");
        image.className = "youtube-result-thumbnail";
        image.src = video.thumbnail;
        image.alt = video.title;
        image.loading = "lazy";

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
            // Use the existing player and history system.
            loadYouTube(video.id);

            // Scroll the player into view.
            document.getElementById("player")?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        });

        info.append(title, channel, playButton);
        card.append(image, info);
        container.appendChild(card);
    });
}


// ========================================
// Search Form
// ========================================

const youtubeSearchForm = document.getElementById(
    "youtube-search-form"
);

if (youtubeSearchForm) {
    youtubeSearchForm.addEventListener("submit", async event => {
        event.preventDefault();

        if (youtubeSearchInProgress) return;

        const input = document.getElementById(
            "youtube-search-input"
        );

        const status = document.getElementById(
            "youtube-search-status"
        );

        const button = document.getElementById(
            "youtube-search-button"
        );

        const results = document.getElementById(
            "youtube-search-results"
        );

        const query = input.value.trim();

        if (!query) {
            status.textContent = "検索キーワードを入力してください。";
            return;
        }

        if (
            !YOUTUBE_API_KEY ||
            YOUTUBE_API_KEY === "YOUR_API_KEY"
        ) {
            status.textContent =
                "YouTube API キーを設定してください。";
            return;
        }

        youtubeSearchInProgress = true;
        button.disabled = true;
        button.textContent = "検索中...";
        status.textContent = "YouTube を検索しています...";
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
            button.disabled = false;
            button.textContent = "検索";
        }
    });
}


    // --------------------------------
    // Maximum 50
    // --------------------------------

    history = history.slice(0, 50);

    localStorage.setItem(
        "youtubeHistory",
        JSON.stringify(history)
    );

    renderHistory();

    // --------------------------------
    // Fetch title
    // --------------------------------

    if (platform === "youtube") {
        fetchYouTubeTitle(videoId);
    } else if (platform === "tiktok") {
        fetchTikTokTitle(videoId);
    }
}


// ========================================
// Display History
// ========================================

function renderHistory() {

    const history = getHistory();

    const container =
        document.getElementById("history");

    if (!container) return;

    container.innerHTML = "";

    if (history.length === 0) {
        container.textContent =
            "履歴はありません。";

        return;
    }

    history.forEach(item => {

        const platform =
            item.platform || "youtube";

        const element =
            document.createElement("div");

        element.className =
            "history-item";


        // =================================
        // Thumbnail
        // =================================

        const image =
            document.createElement("img");

        if (platform === "youtube") {

            image.src =
                `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`;

        } else {

            // TikTokは直接thumbnailを取得できないため
            // プレースホルダーとして使用
            image.src =
                "https://www.tiktok.com/favicon.ico";
        }

        image.alt =
            `${platform} video thumbnail`;


        // =================================
        // Information
        // =================================

        const info =
            document.createElement("div");

        info.className =
            "history-info";


        const title =
            document.createElement("strong");

        title.textContent =
            item.title ||
            "タイトルを取得中...";


        const author =
            document.createElement("p");

        author.textContent =
            item.author || "";


        const date =
            document.createElement("p");

        date.textContent =
            item.date || "";


        const platformText =
            document.createElement("small");

        platformText.textContent =
            platform === "tiktok"
                ? "TikTok"
                : "YouTube";


        info.appendChild(title);
        info.appendChild(author);
        info.appendChild(date);
        info.appendChild(platformText);


        // =================================
        // Play button
        // =================================

        const playButton =
            document.createElement("button");

        playButton.textContent =
            "再生";


        playButton.addEventListener(
            "click",
            () => {

                if (platform === "tiktok") {

                    loadTikTok(
                        `https://www.tiktok.com/player/v1/${item.id}`
                    );

                } else {

                    if (item.isShorts) {

                        loadYouTube(
                            `https://www.youtube.com/shorts/${item.id}`
                        );

                    } else {

                        loadYouTube(item.id);
                    }
                }
            }
        );


        // =================================
        // Delete button
        // =================================

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent =
            "削除";

        deleteButton.className =
            "delete-button";


        deleteButton.addEventListener(
            "click",
            () => {
                removeHistory(
                    item.id,
                    platform
                );
            }
        );


        // =================================
        // Append
        // =================================

        element.appendChild(image);
        element.appendChild(info);
        element.appendChild(playButton);
        element.appendChild(deleteButton);

        container.appendChild(element);
    });
}


// ========================================
// Fetch YouTube title
// ========================================

async function fetchYouTubeTitle(videoId) {

    try {

        const response =
            await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(
                    `https://www.youtube.com/watch?v=${videoId}`
                )}&format=json`
            );

        if (!response.ok) return;

        const data =
            await response.json();

        let history =
            getHistory();

        history =
            history.map(item => {

                if (
                    item.id === videoId &&
                    (item.platform || "youtube") === "youtube"
                ) {

                    return {
                        ...item,
                        title: data.title,
                        author: data.author_name
                    };
                }

                return item;
            });

        localStorage.setItem(
            "youtubeHistory",
            JSON.stringify(history)
        );

        renderHistory();

    } catch (error) {

        console.error(
            "Failed to fetch YouTube title:",
            error
        );
    }
}


// ========================================
// Fetch TikTok title
// ========================================

async function fetchTikTokTitle(videoId) {

    // TikTokのoEmbed API
    // CORS等で取得できない場合があるため
    // 失敗しても履歴自体は残る

    try {

        const url =
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(
                `https://www.tiktok.com/player/v1/${videoId}`
            )}`;

        const response =
            await fetch(url);

        if (!response.ok) return;

        const data =
            await response.json();

        let history =
            getHistory();

        history =
            history.map(item => {

                if (
                    item.id === videoId &&
                    item.platform === "tiktok"
                ) {

                    return {
                        ...item,
                        title:
                            data.title ||
                            data.html ||
                            "TikTok",
                        author:
                            data.author_name ||
                            ""
                    };
                }

                return item;
            });

        localStorage.setItem(
            "youtubeHistory",
            JSON.stringify(history)
        );

        renderHistory();

    } catch (error) {

        console.error(
            "Failed to fetch TikTok title:",
            error
        );
    }
}


// ========================================
// Delete One History
// ========================================

function removeHistory(
    videoId,
    platform = "youtube"
) {

    let history =
        getHistory();

    history =
        history.filter(item => {

            return !(
                item.id === videoId &&
                (item.platform || "youtube") === platform
            );
        });

    localStorage.setItem(
        "youtubeHistory",
        JSON.stringify(history)
    );

    renderHistory();
}


// ========================================
// Clear All History
// ========================================

function clearHistory() {

    if (
        !confirm(
            "すべての再生履歴を削除しますか？"
        )
    ) {
        return;
    }

    localStorage.removeItem(
        "youtubeHistory"
    );

    renderHistory();
}


// ========================================
// Enter Key
// ========================================

const urlInput =
    document.getElementById("url");

if (urlInput) {

    urlInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {
                loadVideo();
            }
        }
    );
}


// ========================================
// Initialize
// ========================================

renderHistory();

// ========================================
// Video Player
// YouTube + TikTok
// YouTube Search via Cloudflare Worker
// ========================================

// ========================================
// Configuration
// ========================================

// Cloudflare Worker URL
// 必ず実際のWorker URLと一致させてください。
const WORKER_URL =
    "https://project-y-i2.tann0104.workers.dev";

const HISTORY_KEY = "youtubeHistory";
const MAX_HISTORY = 50;

let youtubeSearchInProgress = false;


// ========================================
// Load Video
// ========================================

function loadVideo(videoInput = null) {
    const input = String(
        videoInput ?? document.getElementById("url")?.value ?? ""
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
// YouTube URL Parser
// ========================================

function parseYouTubeVideo(input) {
    const value = String(input).trim();

    // Direct video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
        return {
            id: value,
            isShorts: false
        };
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const hostname = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        let videoId = "";
        let isShorts = false;

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "music.youtube.com"
        ) {
            const match = url.pathname.match(
                /^\/(embed|shorts|live)\/([^/?#]+)/
            );

            if (match) {
                videoId = match[2];
                isShorts = match[1] === "shorts";
            } else {
                videoId = url.searchParams.get("v") || "";
            }
        } else if (hostname === "youtu.be") {
            videoId =
                url.pathname.split("/").filter(Boolean)[0] || "";
        } else if (hostname === "youtube-nocookie.com") {
            const match = url.pathname.match(
                /^\/embed\/([^/?#]+)/
            );

            if (match) {
                videoId = match[1];
            }
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return null;
        }

        return {
            id: videoId,
            isShorts
        };
    } catch (error) {
        console.error("YouTube URL parsing error:", error);
        return null;
    }
}


// ========================================
// Load YouTube
// ========================================

function loadYouTube(input) {
    const video = parseYouTubeVideo(input);

    if (!video) {
        console.error("Invalid YouTube input:", input);
        alert("Invalid YouTube video ID or URL.");
        return;
    }

    const player = document.getElementById("player");

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
    const value = String(input).trim();

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const hostname = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        return (
            hostname === "tiktok.com" ||
            hostname.endsWith(".tiktok.com")
        );
    } catch {
        return false;
    }
}


// ========================================
// Parse TikTok Video ID
// ========================================

function parseTikTokVideoId(input) {
    const value = String(input).trim();

    // Allow a numeric ID directly.
    if (/^\d+$/.test(value)) {
        return value;
    }

    try {
        const url = new URL(
            /^https?:\/\//i.test(value)
                ? value
                : `https://${value}`
        );

        const hostname = url.hostname
            .replace(/^www\./i, "")
            .toLowerCase();

        if (
            hostname !== "tiktok.com" &&
            !hostname.endsWith(".tiktok.com")
        ) {
            return null;
        }

        // https://www.tiktok.com/player/v1/VIDEO_ID
        const playerMatch = url.pathname.match(
            /^\/player\/v1\/(\d+)/
        );

        if (playerMatch) {
            return playerMatch[1];
        }

        // https://www.tiktok.com/@user/video/VIDEO_ID
        const videoMatch = url.pathname.match(
            /\/video\/(\d+)/
        );

        if (videoMatch) {
            return videoMatch[1];
        }

        // Short links such as vm.tiktok.com may redirect.
        // This parser does not resolve redirects itself.
        return null;
    } catch (error) {
        console.error("TikTok URL parsing error:", error);
        return null;
    }
}


// ========================================
// Load TikTok
// ========================================

function loadTikTok(input) {
    const videoId = parseTikTokVideoId(input);

    if (!videoId) {
        console.error("Invalid TikTok input:", input);
        alert(
            "Invalid TikTok video URL. Use a video URL containing /video/VIDEO_ID."
        );
        return;
    }

    const player = document.getElementById("player");

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

    // Remove the same video from its existing position.
    history = history.filter(item => {
        return !(
            item.id === videoId &&
            (item.platform || "youtube") === platform
        );
    });

    // Add the newest item first.
    history.unshift({
        id: videoId,
        platform,
        title: null,
        author: null,
        isShorts,
        date: new Date().toLocaleString("ja-JP")
    });

    // Keep only the latest 50 items.
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
    const container = document.getElementById("history");

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

        const platformText = document.createElement("small");
        platformText.textContent =
            platform === "tiktok" ? "TikTok" : "YouTube";

        info.append(title, author, date, platformText);

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
        const url =
            "https://www.youtube.com/oembed?" +
            new URLSearchParams({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                format: "json"
            });

        const response = await fetch(url);

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
        console.error("Failed to fetch YouTube title:", error);
    }
}


// ========================================
// Fetch TikTok Title
// ========================================

async function fetchTikTokTitle(videoId) {
    try {
        const url =
            "https://www.tiktok.com/oembed?" +
            new URLSearchParams({
                url: `https://www.tiktok.com/player/v1/${videoId}`
            });

        const response = await fetch(url);

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
        console.error("Failed to fetch TikTok title:", error);
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
// YouTube Search via Cloudflare Worker
// ========================================

async function searchYouTubeVideos(query) {
    const url = new URL(WORKER_URL);
    url.searchParams.set("q", query);

    const response = await fetch(url.toString());

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
            "検索結果の形式が正しくありません。Workerのコードを確認してください。"
        );
    }

    return data.items
        .filter(video => video.id)
        .map(video => ({
            id: String(video.id),
            title: video.title || "Untitled",
            channel: video.channel || "",
