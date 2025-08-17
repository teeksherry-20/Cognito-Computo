async function loadArticles() {
  try {
    const res = await fetch("http://localhost:3000/articles");
    const articles = await res.json();
    const container = document.getElementById("article-container");
    container.innerHTML = "";

    if (!articles.length) {
      container.innerHTML = "<p>No articles found.</p>";
      return;
    }

    articles.forEach((a) => {
      const div = document.createElement("div");
      div.classList.add("article-card");
      div.innerHTML = `
        <h3>${a.title}</h3>
        <small>${a.date} | ${a.genre}</small>
        <p>${a.intro}</p>
        <button class="like-btn" data-title="${a.title}">
          👍 Like (${a.likes})
        </button>
      `;
      container.appendChild(div);
    });

    // Attach like handlers
    document.querySelectorAll(".like-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const articleTitle = e.target.getAttribute("data-title");
        const currentLikes = parseInt(e.target.innerText.match(/\d+/)[0]);
        const newLikeCount = currentLikes + 1;

        try {
          await fetch("http://localhost:3000/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              articleId: articleTitle,
              newLikeCount,
            }),
          });
          e.target.innerText = `👍 Like (${newLikeCount})`;
        } catch (err) {
          console.error("Error liking article:", err);
        }
      });
    });
  } catch (err) {
    console.error("Error loading articles:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadArticles);
