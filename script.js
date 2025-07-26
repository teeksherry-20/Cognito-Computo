document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://api.sheetbest.com/sheets/29c9e88c-a1a1-4fb7-bb75-12b8fb82264a';
  const container = document.getElementById('article-container');

  // Fetch and render articles
  fetch(API_BASE)
    .then(res => res.json())
    .then(data => {
      container.innerHTML = '';

      data.forEach(article => {
        const div = document.createElement('div');
        div.className = 'article fade-in';
        div.style.position = 'relative';

        div.innerHTML = `
          <h2>${article.Title}</h2>
          <p>${article.Introduction.replace(/\n/g, '<br>')}</p>
          <a href="${article['Article URL']}" class="read-more" target="_blank" rel="noopener noreferrer">Keep Reading →</a>
          <div class="like-section" data-title="${article.Title}">
            <button class="like-button" aria-label="Like article ${article.Title}">❤️</button>
            <span class="like-count">${article.Like || 0}</span>
            <button class="share-button" aria-label="Share article ${article.Title}">Share ⌯⌲</button>
          </div>
        `;

        container.appendChild(div);
      });

      // After articles are added, disable like buttons already liked by user
      document.querySelectorAll('.like-section').forEach(section => {
        const title = section.getAttribute('data-title');
      });
    })
    .catch(err => {
      container.innerHTML = `<p style="color:red">Failed to load articles: ${err.message}</p>`;
      console.error(err);
    });

  // Event delegation for like and share buttons
  container.addEventListener('click', e => {
    // Share button clicked
    if (e.target && e.target.classList.contains('share-button')) {
      const likeSection = e.target.closest('.like-section');
      const title = likeSection.getAttribute('data-title');
      const shareText = `Check out this article "${title}" on Cogito Computo! 🧠`;

      if (navigator.share) {
        navigator.share({
          title: 'Cogito Computo Article',
          text: shareText,
          url: window.location.href,
        }).catch(() => alert('Sharing cancelled.'));
      } else {
        navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        alert('Article link copied to clipboard!');
      }
    }
    if (e.target.classList.contains('share-button')) {
  const section = e.target.closest('.like-section');
  const title = section.getAttribute('data-title');
  const articleLink = section.parentElement.querySelector('a').href;

  if (navigator.share) {
    navigator.share({
      title: title,
      url: articleLink
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(articleLink).then(() => {
      alert('Link copied to clipboard!');
    });
  }
}

  });
const toggleButton = document.getElementById('darkModeToggle');
  const storedDarkMode = localStorage.getItem('darkMode');
  if (storedDarkMode === 'enabled') {
    document.body.classList.add('dark-mode');
    if (toggleButton) toggleButton.textContent = '☀️ Light Mode';
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const darkModeEnabled = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', darkModeEnabled ? 'enabled' : 'disabled');
      toggleButton.textContent = darkModeEnabled ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
  }

  // --- Navigation Highlight and Home Reload ---
  const navLinks = document.querySelectorAll('nav a');
  const currentPath = window.location.pathname.split('/').pop();
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (
      linkPath === currentPath ||
      (linkPath === 'index.html' && (currentPath === '' || currentPath === 'index.html'))
    ) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }

    if (link.textContent.trim().toLowerCase() === 'home') {
      link.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = 'index.html';
      });
    }
  });

  // --- Skip blog logic if on About page ---
  const bodyId = document.body.id;
  if (bodyId === 'about') return;

  // --- Blog Page Logic ---
  const sheetUrl = 'https://api.sheetbest.com/sheets/29c9e88c-a1a1-4fb7-bb75-12b8fb82264a';
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  const articleContainer = document.getElementById('article-container');
  const noResults = document.getElementById('no-results');
  const pageIndicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPageButton');
  const nextBtn = document.getElementById('nextPageButton');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');

  let articles = [];
  let filteredArticles = [];
  const articlesPerPage = 5;
  let currentPage = 1;
  let selectedGenre = null;

  // Poll data persistence using localStorage
  const storedPollData = localStorage.getItem('pollData');
  const pollData = storedPollData ? JSON.parse(storedPollData) : { A: 0, B: 0 };

  // Update poll result display with current counts
  function updatePollDisplay() {
    const totalVotes = pollData.A + pollData.B;
    if (totalVotes === 0) {
      const resultEl = document.getElementById('poll-result');
      if (resultEl) resultEl.textContent = 'No votes yet';
    } else {
      const percentA = ((pollData.A / totalVotes) * 100).toFixed(1);
      const percentB = ((pollData.B / totalVotes) * 100).toFixed(1);
      const resultEl = document.getElementById('poll-result');
      if (resultEl) resultEl.textContent = `Pull the Lever: ${percentA}% | Do Nothing: ${percentB}%`;
    }
  }

  updatePollDisplay();

  function vote(option) {
    if (option !== 'A' && option !== 'B') return;

    pollData[option]++;
    localStorage.setItem('pollData', JSON.stringify(pollData));
    updatePollDisplay();
  }

  // Attach poll buttons event listeners (only if on homepage and buttons exist)
  const voteAButton = document.getElementById('voteA');
  const voteBButton = document.getElementById('voteB');
  if (voteAButton && voteBButton) {
    voteAButton.onclick = () => vote('A');
    voteBButton.onclick = () => vote('B');
  }

  // Genre filtering on nav clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const genre = link.textContent.trim().toLowerCase();
      if (genre === 'philosophy' || genre === 'ai and tech' || genre === 'tech for teens') {
        e.preventDefault();
        selectedGenre = genre;
        currentPage = 1;
        applyFilters();

        // Scroll so nav is top and first article visible
        setTimeout(() => {
          const firstArticle = document.querySelector('#article-container .article');
          if (firstArticle) {
            const nav = document.querySelector('nav');
            const navHeight = nav?.offsetHeight || 0;
            const y = firstArticle.getBoundingClientRect().top + window.scrollY - navHeight - 10;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 100);
      }
    });
  });

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    applyFilters();
  });

  sortSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFilters();
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < Math.ceil(filteredArticles.length / articlesPerPage)) {
      currentPage++;
      renderArticles();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });

  window.addEventListener('click', e => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  });

  async function loadArticles() {
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) throw new Error(`Failed to fetch articles: ${response.status}`);

      const data = await response.json();

      articles = data.map(obj => ({
        title: obj['Title'],
        date: new Date(obj['Date']),
        intro: obj['Introduction'],
        content: obj['Full Content'],
        url: obj['Article URL'],
        genre: obj['Genre'] || ''
      }));

      applyFilters();
    } catch (error) {
      console.error('Error loading articles:', error);
      noResults.style.display = 'block';
      noResults.textContent = 'Failed to load articles.';
    }
  }

  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;

    filteredArticles = articles.filter(article => {
      const matchesGenre = !selectedGenre || article.genre.toLowerCase() === selectedGenre.toLowerCase();
      const matchesSearch =
        article.title.toLowerCase().includes(searchTerm) ||
        article.intro.toLowerCase().includes(searchTerm);
      return matchesGenre && matchesSearch;
    });

    filteredArticles.sort((a, b) =>
      sortBy === 'latest' ? b.date - a.date : a.date - b.date
    );

    currentPage = Math.min(currentPage, Math.ceil(filteredArticles.length / articlesPerPage) || 1);
    renderArticles();
  }

  function createArticleElement(article) {
  const articleEl = document.createElement('article');
  articleEl.className = 'article fade-in';
  articleEl.tabIndex = 0;

  // Use article.Like or 0 for initial like count
  const likes = article.Like || 0;

  articleEl.innerHTML = `
    <div class="article-header">
      <time datetime="${article.date.toISOString().split('T')[0]}" class="pub-date">
        ${article.date.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' })}
      </time>
    </div>
    <h2>${article.title}</h2>
    <p class="intro">${article.intro}</p>
    <div class="article-footer">
      <button class="read-more-btn" aria-label="Read full article: ${article.title}">Keep Reading →</button>
      <div class="like-section" data-title="${article.Title}">
  <button class="like-button" aria-label="Like article ${article.Title}">❤️❤️</button>
  <span class="like-count">${article.Like || 0}</span>
  <button class="share-button" aria-label="Share article ${article.Title}">Share ⌲</button>
</div>
    </div>
  `;
    const likedKey = `liked-${article.Title}`;
const liked = localStorage.getItem(likedKey);
if (liked) {
  articleEl.querySelector('.like-button').disabled = true;
  articleEl.querySelector('.like-button').textContent = '❤️❤️ Liked';
}


  articleEl.querySelector('.read-more-btn').addEventListener('click', () => openModal(article));

  // Attach like button event listener here:
  const likeBtn = articleEl.querySelector('.like-button');
  const likeCountSpan = articleEl.querySelector('.like-count');

  likeBtn.addEventListener('click', () => {
    let likes = parseInt(likeCountSpan.textContent) || 0;
    likes++;
    likeCountSpan.textContent = likes;

    // Floating heart animation
    const heart = document.createElement('div');
    heart.textContent = '❤️❤️';
    heart.className = 'heart-float';
    likeBtn.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);

    const title = article.title;
    

    fetch(`${API_BASE}/Title/${encodeURIComponent(title)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Like: likes }),
    }).catch(err => console.error('Error updating like:', err));
  });

  requestAnimationFrame(() => {
    articleEl.classList.add('visible');
  });

  return articleEl;
}

  function renderArticles() {
    articleContainer.innerHTML = '';

    if (filteredArticles.length === 0) {
      noResults.style.display = 'block';
      noResults.textContent = 'No articles found.';
      pageIndicator.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    } else {
      noResults.style.display = 'none';
    }

    const start = (currentPage - 1) * articlesPerPage;
    const end = start + articlesPerPage;
    const articlesToShow = filteredArticles.slice(start, end);

    const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (currentPage === 1 && articlesToShow.length > 0 && isHomePage) {
      // Widget container
      const widgetRow = document.createElement('div');
      widgetRow.className = 'flex-row-container';

      // Trolley widget
      const trolleyWidget = document.createElement('div');
      trolleyWidget.className = 'trolley-widget';
      trolleyWidget.innerHTML = `
        <video autoplay loop muted playsinline>
          <source src="trolley.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <h3>Trolley Problem Poll</h3>
        <button id="voteA">Pull the Lever</button>
        <button id="voteB">Do Nothing</button>
        <p id="poll-result" class="poll-result">No votes yet</p>
      `;
      widgetRow.appendChild(trolleyWidget);

      // Quiz widget
      const quizWidget = createQuizWidget();
      widgetRow.appendChild(quizWidget);

      articleContainer.appendChild(widgetRow);

      articleContainer.appendChild(createArticleElement(articlesToShow[0]));

      for (let i = 1; i < articlesToShow.length; i++) {
        articleContainer.appendChild(createArticleElement(articlesToShow[i]));
      }
    } else {
      articlesToShow.forEach(article => {
        articleContainer.appendChild(createArticleElement(article));
      });
    }

    pageIndicator.textContent = `Page ${currentPage} of ${Math.ceil(filteredArticles.length / articlesPerPage)}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === Math.ceil(filteredArticles.length / articlesPerPage);

    // Attach poll button listeners again after rendering
    if (isHomePage) {
      const voteAButton = document.getElementById('voteA');
      const voteBButton = document.getElementById('voteB');
      if (voteAButton && voteBButton) {
        voteAButton.onclick = () => vote('A');
        voteBButton.onclick = () => vote('B');
      }

      updatePollDisplay();
    }
  }

  // Modal functions
  function openModal(article) {
    modalTitle.textContent = article.title;

    const lines = article.content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    let html = '';
    lines.forEach(line => {
      const imgMatch = line.match(/^\[img:(.+?)\]$/i);
      if (imgMatch) {
        const imgUrl = imgMatch[1];
        html += `<img src="${imgUrl}" alt="Article Image" style="max-width: 100%; margin-bottom: 1rem;" />`;
      } else {
        html += `<p>${line}</p>`;
      }
    });

    modalBody.innerHTML = html;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
  }

  // Quiz widget creator
  function createQuizWidget() {
    const widget = document.createElement('div');
    widget.className = 'quiz-widget';
    widget.innerHTML = `
      <h3 class="quiz-title">🧠 Which Philosopher Are You?</h3>
      <div class="quiz-progress-bar-container">
        <div id="quiz-bar" class="quiz-progress-bar"></div>
      </div>
      <div id="quiz-progress">Question 1 of 4</div>
      <form id="quiz-form">
        <div class="quiz-question show" id="q1">
          <p>1. What drives your decisions most?</p>
          <label><input type="radio" name="q1" value="kant" /> Duty and rules</label><br />
          <label><input type="radio" name="q1" value="nietzsche" /> Personal freedom</label><br />
          <label><input type="radio" name="q1" value="beauvoir" /> Social context and equality</label><br />
          <label><input type="radio" name="q1" value="socrates" /> Asking questions and dialogue</label>
        </div>
        <div class="quiz-question" id="q2">
          <p>2. How do you view truth?</p>
          <label><input type="radio" name="q2" value="kant" /> Absolute and universal</label><br />
          <label><input type="radio" name="q2" value="nietzsche" /> Relative and self-made</label><br />
          <label><input type="radio" name="q2" value="beauvoir" /> Influenced by society</label><br />
          <label><input type="radio" name="q2" value="socrates" /> Always questioned and probed</label>
        </div>
        <div class="quiz-question" id="q3">
          <p>3. What motivates your actions?</p>
          <label><input type="radio" name="q3" value="kant" /> Moral duty</label><br />
          <label><input type="radio" name="q3" value="nietzsche" /> Creating your own values</label><br />
          <label><input type="radio" name="q3" value="beauvoir" /> Fighting social injustice</label><br />
          <label><input type="radio" name="q3" value="socrates" /> Seeking knowledge</label>
        </div>
        <div class="quiz-question" id="q4">
          <p>4. How do you learn best?</p>
          <label><input type="radio" name="q4" value="kant" /> Following structured teaching</label><br />
          <label><input type="radio" name="q4" value="nietzsche" /> Through experience and challenge</label><br />
          <label><input type="radio" name="q4" value="beauvoir" /> From social interaction</label><br />
          <label><input type="radio" name="q4" value="socrates" /> By questioning assumptions</label>
        </div>
        <button type="button" id="next-btn">Next Question</button>
      </form>
      <div id="quiz-result"></div>
    `;

    setTimeout(() => {
      const quizForm = widget.querySelector("#quiz-form");
      const questions = widget.querySelectorAll(".quiz-question");
      const nextBtn = widget.querySelector("#next-btn");
      const resultBox = widget.querySelector("#quiz-result");
      let currentStep = 0;

      function hideAllQuestions() {
        questions.forEach(q => q.classList.remove('show'));
      }

      function showQuestion(step) {
        hideAllQuestions();
        if (questions[step]) {
          questions[step].classList.add('show');
          updateProgress(step);
        }
      }

      function updateProgress(step) {
        widget.querySelector("#quiz-progress").textContent = `Question ${step + 1} of ${questions.length}`;
        widget.querySelector("#quiz-bar").style.width = `${((step + 1) / questions.length) * 100}%`;
      }

      function submitQuiz() {
        resultBox.innerHTML = `<div id="loading-message">Calculating your philosopher...</div>`;
        resultBox.scrollIntoView({ behavior: "smooth" });

        setTimeout(() => {
          let tally = { kant: 0, nietzsche: 0, beauvoir: 0, socrates: 0 };
          ["q1", "q2", "q3", "q4"].forEach(q => {
            const ans = quizForm.querySelector(`input[name="${q}"]:checked`);
            if (ans) tally[ans.value]++;
          });

          let result = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
          localStorage.setItem("philosopherResult", result);
          showResult(result);
        }, 1500);
      }

      function showResult(philosopher) {
        const messages = {
          kant: {
            text: "🧠 You're like Immanuel Kant - (serving kant) – you believe in reason, duty, and universal moral laws.",
            image: "kant.jpg",
          },
          nietzsche: {
            text: "🔥 You're like Nietzsche – bold, independent, and all about creating your own values.",
            image: "nietzsche.jpg",
          },
          beauvoir: {
            text: "🌸 You're like Simone de Beauvoir – deeply aware, expressive, and challenging societal norms.",
            image: "beauvoir.jpg",
          },
          socrates: {
            text: "💬 You're like Socrates – curious, reflective, and never stop asking why.",
            image: "socrates.jpg",
          },
        };

        const { text, image } = messages[philosopher];

        quizForm.style.display = "none";
        resultBox.innerHTML = `
          <div class="quiz-result">
            <img src="${image}" alt="${philosopher}" />
            <p>${text}</p>
            <button id="retake-btn">Retake Quiz</button>
            <button id="share-btn">Share Your Result</button>
          </div>
        `;

        widget.querySelector("#retake-btn").addEventListener("click", () => {
          localStorage.removeItem("philosopherResult");
          resultBox.innerHTML = "";
          quizForm.reset();
          quizForm.style.display = "block";
          currentStep = 0;
          showQuestion(currentStep);
          nextBtn.textContent = "Next Question";
        });

        widget.querySelector("#share-btn").addEventListener("click", () => {
          const shareText = `I got ${philosopher.charAt(0).toUpperCase() + philosopher.slice(1)} in the “Which Philosopher Are You?” quiz on Cogito Computo! 🧠`;
          if (navigator.share) {
            navigator.share({ title: "Cogito Computo Quiz Result", text: shareText, url: window.location.href })
              .catch(() => alert("Sharing cancelled."));
          } else {
            navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
            alert("Result copied to clipboard!");
          }
        });

        resultBox.scrollIntoView({ behavior: "smooth" });
      }

      const storedResult = localStorage.getItem("philosopherResult");
      if (storedResult) {
        quizForm.style.display = "none";
        showResult(storedResult);
      } else {
        quizForm.style.display = "block";
        showQuestion(currentStep);
      }

      nextBtn.addEventListener("click", () => {
        const currentQuestion = questions[currentStep];
        const selected = currentQuestion.querySelector("input:checked");

        if (!selected) {
          alert("Please select an answer.");
          return;
        }

        currentStep++;
        if (currentStep < questions.length) {
          showQuestion(currentStep);
          nextBtn.textContent = currentStep === questions.length - 1 ? "Submit" : "Next Question";
        } else {
          submitQuiz();
        }
      });
    }, 0);

    return widget;
  }

  // Initial load
  loadArticles();
});
