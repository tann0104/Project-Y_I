
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

