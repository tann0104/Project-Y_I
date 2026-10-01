```javascript
function loadVideo() {
  const input = document.getElementById("url").value.trim();

  let videoId = "";

  try {
    const url = new URL(input);

    // youtube.com/watch?v=xxxx
    if (url.hostname.includes("youtube.com")) {
      videoId = url.searchParams.get("v") || "";
    }

    // youtu.be/xxxx
    if (url.hostname === "youtu.be") {
      videoId = url.pathname.substring(1);
    }

    // youtube-nocookie.com/embed/xxxx
    if (url.hostname.includes("youtube-nocookie.com")) {
      const match = url.pathname.match(/\/embed\/([^/]+)/);

      if (match) {
        videoId = match[1];
      }
    }

  } catch {
    // URLではなく動画IDを直接入力した場合
    videoId = input;
  }

  if (!videoId) {
    alert("YouTube動画を指定してください");
    return;
  }

  const player = document.getElementById("player");

  player.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}"
      title="YouTube video player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
}
```
