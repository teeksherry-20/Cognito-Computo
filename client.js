// Enhanced client.js with improved error handling and fixes

// Global variables for trolley voting (stored locally)
let trolleyVotes = { A: 0, B: 0 };

// Global variables for filtering and pagination
let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
const articlesPerPage = 5;

// Improved loadArticles function with better error handling
async function loadArticles() {
  try {
    const res = await fetch("http://localhost:3000/articles");
    
    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }
    
    const articles = await res.json();
    
    // Ensure articles is an array
    if (!Array.isArray(articles)) {
      console.error('Articles data is not an array:', articles);
      allArticles = [];
    } else {
      allArticles = articles;
    }
    
    // Apply current filters and sort
    applyFiltersAndSort();
    
    const container = document.getElementById("article-container");
    if (!container) return;
    
    container.innerHTML = "";

    if (!filteredArticles.length) {
      container.innerHTML = "<p id='no-results'>No articles found.</p>";
      updatePaginationControls();
      return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const articlesToShow = filteredArticles.slice(startIndex, endIndex);

    articlesToShow.forEach((a) => {
      const div = document.createElement("div");
      div.classList.add("article-card");
      div.innerHTML = `
        <div class="article-header">
          <span>${new Date(a.date).toLocaleDateString()}</span>
          <span class="genre">${a.genre || 'General'}</span>
        </div>
        <h3>${a.title || 'Untitled'}</h3>
        <p class="intro">${a.intro || 'No description available.'}</p>
        <div class="article-footer">
          <div class="like-section">
            <button class="like-btn" data-title="${a.title}">
              👍 Like (<span class="like-count">${a.likes || 0}</span>)
            </button>
          </div>
          <a href="#" class="read-more" onclick="openModal('${a.title}')">Read More →</a>
        </div>
      `;
      container.appendChild(div);
    });

    // Update pagination controls
    updatePaginationControls();

    // Attach like handlers
    attachLikeHandlers();
    
  } catch (err) {
    console.error("Error loading articles:", err);
    
    // Show user-friendly error message
    const container = document.getElementById("article-container");
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #925682; font-family: 'Press Start 2P', monospace; font-size: 0.9rem;">
          <p>⚠️ Unable to load articles</p>
          <p style="font-size: 0.7rem; margin-top: 10px;">Please check if the server is running on port 3000</p>
          <button onclick="loadArticles()" style="margin-top: 15px; padding: 8px 16px; background: #925682; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Retry
          </button>
        </div>
      `;
    }
    
    // Initialize empty arrays to prevent further errors
    allArticles = [];
    filteredArticles = [];
    updatePaginationControls();
  }
}

// Function to apply filters and sorting with error checking
function applyFiltersAndSort() {
  // Ensure allArticles is an array
  if (!Array.isArray(allArticles)) {
    console.error('allArticles is not an array:', allArticles);
    allArticles = [];
  }

  const searchQuery = document.getElementById("search-input")?.value.toLowerCase() || "";
  const sortBy = document.getElementById("sort-select")?.value || "latest";
  
  // Filter articles
  filteredArticles = allArticles.filter(article => {
    if (!article) return false;
    
    const title = (article.title || '').toLowerCase();
    const intro = (article.intro || '').toLowerCase();
    const matchesSearch = title.includes(searchQuery) || intro.includes(searchQuery);
    
    return matchesSearch;
  });
  
  // Sort articles
  filteredArticles.sort((a, b) => {
    if (!a || !b) return 0;
    
    switch (sortBy) {
      case "oldest":
        return new Date(a.date || 0) - new Date(b.date || 0);
      case "latest":
      default:
        return new Date(b.date || 0) - new Date(a.date || 0);
    }
  });
  
  // Reset to first page when filters change
  currentPage = 1;
}

// Function to update pagination controls
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  const prevBtn = document.getElementById("prevPageButton");
  const nextBtn = document.getElementById("nextPageButton");
  const pageIndicator = document.getElementById("pageIndicator");
  
  if (prevBtn && nextBtn && pageIndicator) {
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
    
    if (totalPages === 0) {
      pageIndicator.textContent = "No articles";
    } else {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }
  }
}

// Function to attach like button handlers
function attachLikeHandlers() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const articleTitle = e.target.getAttribute("data-title");
      const likeCountSpan = e.target.querySelector(".like-count");
      const currentLikes = parseInt(likeCountSpan.textContent) || 0;
      const newLikeCount = currentLikes + 1;

      try {
        const response = await fetch("http://localhost:3000/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: articleTitle,
            newLikeCount,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Update the like count in the UI
        likeCountSpan.textContent = newLikeCount;
        
        // Update the like count in our local data
        const article = allArticles.find(a => a && a.title === articleTitle);
        if (article) {
          article.likes = newLikeCount;
        }
        
        // Show heart animation
        showHeartAnimation(e.target);
        
      } catch (err) {
        console.error("Error liking article:", err);
        // Revert the like count on error
        likeCountSpan.textContent = currentLikes;
      }
    });
  });
}

// Function to show heart animation
function showHeartAnimation(button) {
  const heart = document.createElement('div');
  heart.textContent = '❤️';
  heart.className = 'heart-float';
  
  const rect = button.getBoundingClientRect();
  heart.style.position = 'fixed';
  heart.style.left = rect.left + rect.width / 2 + 'px';
  heart.style.top = rect.top + 'px';
  heart.style.zIndex = '1000';
  heart.style.pointerEvents = 'none';
  
  document.body.appendChild(heart);
  
  setTimeout(() => {
    heart.remove();
  }, 1000);
}

// Function to open modal (placeholder)
function openModal(title) {
  alert(`Opening article: ${title}`);
}

// Pagination functions
function nextPage() {
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    loadArticles();
    
    // Scroll to top of articles
    const container = document.getElementById("article-container");
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadArticles();
    
    // Scroll to top of articles
    const container = document.getElementById("article-container");
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Push Notification System for New Articles
class ArticleNotificationSystem {
  constructor() {
    this.lastKnownArticleCount = 0;
    this.subscriptionKey = 'article-notifications-subscribed';
    this.lastCountKey = 'last-article-count';
    this.init();
  }

  async init() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    this.lastKnownArticleCount = parseInt(sessionStorage.getItem(this.lastCountKey)) || 0;
    this.showSubscriptionPrompt();
    this.startPeriodicCheck();
  }

  showSubscriptionPrompt() {
    const isSubscribed = sessionStorage.getItem(this.subscriptionKey);
    if (isSubscribed !== null) return;
    this.createNotificationPrompt();
  }

  createNotificationPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.id = 'notification-prompt';
    promptDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #925682;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 300px;
      font-family: 'Courier Prime', monospace;
      font-size: 0.9rem;
    `;

    promptDiv.innerHTML = `
      <div style="margin-bottom: 10px;">
        📚 Get notified when new articles are published!
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="enable-notifications" style="
          background: white;
          color: #925682;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        ">Enable</button>
        <button id="dismiss-notifications" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        ">Maybe Later</button>
      </div>
    `;

    document.body.appendChild(promptDiv);

    document.getElementById('enable-notifications').onclick = () => this.requestPermission();
    document.getElementById('dismiss-notifications').onclick = () => this.dismissPrompt();
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        sessionStorage.setItem(this.subscriptionKey, 'true');
        this.showSuccessMessage();
        
        new Notification('Cogito Computo Notifications Enabled! 🧠', {
          body: 'You\'ll now get notified when new articles are published.',
          icon: 'logo.jpg'
        });
      } else {
        sessionStorage.setItem(this.subscriptionKey, 'false');
        this.showErrorMessage();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.showErrorMessage();
    }
    
    this.dismissPrompt();
  }

  dismissPrompt() {
    const prompt = document.getElementById('notification-prompt');
    if (prompt) {
      prompt.remove();
    }
  }

  showSuccessMessage() {
    this.showMessage('✅ Notifications enabled!', '#4CAF50');
  }

  showErrorMessage() {
    this.showMessage('⚠ Notifications blocked.', '#f44336');
  }

  showMessage(text, color) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 1001;
      font-family: 'Courier Prime', monospace;
      font-size: 0.9rem;
    `;
    messageDiv.textContent = text;
    
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
  }

  async checkForNewArticles() {
    try {
      const response = await fetch("http://localhost:3000/articles");
      if (!response.ok) return;
      
      const articles = await response.json();
      if (!Array.isArray(articles)) return;
      
      const currentCount = articles.length;
      
      if (this.lastKnownArticleCount > 0 && currentCount > this.lastKnownArticleCount) {
        const newArticleCount = currentCount - this.lastKnownArticleCount;
        this.sendNewArticleNotification(newArticleCount, articles[0]);
      }
      
      this.lastKnownArticleCount = currentCount;
      sessionStorage.setItem(this.lastCountKey, currentCount.toString());
      
    } catch (error) {
      console.error('Error checking for new articles:', error);
    }
  }

  sendNewArticleNotification(count, latestArticle) {
    if (Notification.permission !== 'granted') return;
    if (sessionStorage.getItem(this.subscriptionKey) !== 'true') return;
    if (!latestArticle) return;

    const title = count === 1 
      ? `New Article: ${latestArticle.title}` 
      : `${count} New Articles Published!`;
    
    const body = count === 1
      ? (latestArticle.intro || '').substring(0, 100) + '...'
      : `Check out the latest posts on Cogito Computo`;

    const notification = new Notification(title, {
      body: body,
      icon: 'logo.jpg',
      badge: 'logo.jpg',
      tag: 'new-articles',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      setTimeout(() => {
        const firstArticle = document.querySelector('.article-card');
        if (firstArticle) {
          firstArticle.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };
  }

  startPeriodicCheck() {
    setInterval(() => this.checkForNewArticles(), 5 * 60 * 1000);
    setTimeout(() => this.checkForNewArticles(), 10000);
  }
}

// Trolley widget functions
function initializeTrolleyVotes() {
  const saved = sessionStorage.getItem('trolleyVotes');
  if (saved) {
    try {
      trolleyVotes = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved trolley votes:', e);
      trolleyVotes = { A: 0, B: 0 };
    }
  }
}

function saveTrolleyVotes() {
  sessionStorage.setItem('trolleyVotes', JSON.stringify(trolleyVotes));
}

function vote(option) {
  if (option !== 'A' && option !== 'B') return;
  
  trolleyVotes[option]++;
  saveTrolleyVotes();
  updatePollDisplay();
  showVoteConfirmation(option);
}

function updatePollDisplay() {
  const totalVotes = trolleyVotes.A + trolleyVotes.B;
  const resultEl = document.getElementById('poll-result');
  
  if (!resultEl) {
    setTimeout(updatePollDisplay, 100);
    return;
  }
  
  if (totalVotes === 0) {
    resultEl.textContent = 'No votes yet';
  } else {
    const percentA = ((trolleyVotes.A / totalVotes) * 100).toFixed(1);
    const percentB = ((trolleyVotes.B / totalVotes) * 100).toFixed(1);
    resultEl.textContent = `Pull Lever: ${percentA}% (${trolleyVotes.A}) | Do Nothing: ${percentB}% (${trolleyVotes.B})`;
  }
}

function showVoteConfirmation(option) {
  const message = option === 'A' ? 'You chose to pull the lever!' : 'You chose to do nothing!';
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #925682;
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 1002;
    font-family: 'Courier Prime', monospace;
    font-size: 1rem;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 2000);
}

function createTrolleyWidget() {
  const widget = document.createElement('div');
  widget.className = 'trolley-widget';
  widget.innerHTML = `
    <video autoplay loop muted playsinline>
      <source src="trolley.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
    <h3>🚃 Trolley Problem Poll</h3>
    <p>A runaway trolley is heading toward five people. You can pull a lever to divert it to another track, where it will kill one person instead. What do you do?</p>
    <div class="trolley-buttons">
      <button id="voteA" class="trolley-btn">Pull the Lever</button>
      <button id="voteB" class="trolley-btn">Do Nothing</button>
    </div>
    <p id="poll-result" class="poll-result">Loading votes...</p>
  `;
  
  return widget;
}

// Quiz widget creation function
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

      setTimeout(() => {
        let tally = { kant: 0, nietzsche: 0, beauvoir: 0, socrates: 0 };
        ["q1", "q2", "q3", "q4"].forEach(q => {
          const ans = quizForm.querySelector(`input[name="${q}"]:checked`);
          if (ans) tally[ans.value]++;
        });

        let result = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
        showResult(result);
      }, 1500);
    }

    function showResult(philosopher) {
      const messages = {
        kant: {
          text: "🧠 You're like Immanuel Kant – you believe in reason, duty, and universal moral laws.",
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
          <button id="share-btn">Share Result</button>
        </div>
      `;

      widget.querySelector("#retake-btn").addEventListener("click", () => {
        resultBox.innerHTML = "";
        quizForm.reset();
        quizForm.style.display = "block";
        currentStep = 0;
        showQuestion(currentStep);
        nextBtn.textContent = "Next Question";
      });

      widget.querySelector("#share-btn").addEventListener("click", () => {
        const shareText = `I got ${philosopher.charAt(0).toUpperCase() + philosopher.slice(1)} in the "Which Philosopher Are You?" quiz on Cogito Computo! 🧠`;
        if (navigator.share) {
          navigator.share({ title: "Cogito Computo Quiz Result", text: shareText, url: window.location.href })
            .catch(() => alert("Sharing cancelled."));
        } else {
          navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
          alert("Result copied to clipboard!");
        }
      });
    }

    showQuestion(currentStep);

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

// Initialize notification system
let notificationSystem;

// Main DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize trolley votes
  initializeTrolleyVotes();
  
  // Load articles first
  await loadArticles();

  // Initialize notification system
  try {
    notificationSystem = new ArticleNotificationSystem();
  } catch (error) {
    console.error('Error initializing notification system:', error);
  }

  // Set up filter event listeners
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      applyFiltersAndSort();
      loadArticles();
    }, 300));
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      applyFiltersAndSort();
      loadArticles();
    });
  }
  
  // Set up pagination event listeners
  const prevBtn = document.getElementById('prevPageButton');
  const nextBtn = document.getElementById('nextPageButton');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', prevPage);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', nextPage);
  }

  // Dark mode toggle functionality
  const toggleButton = document.getElementById('darkModeToggle');
  const storedDarkMode = sessionStorage.getItem('darkMode');
  
  if (storedDarkMode === 'enabled') {
    document.body.classList.add('dark-mode');
    if (toggleButton) toggleButton.textContent = '☀️ Light Mode';
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const darkModeEnabled = document.body.classList.contains('dark-mode');
      sessionStorage.setItem('darkMode', darkModeEnabled ? 'enabled' : 'disabled');
      toggleButton.textContent = darkModeEnabled ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
  }

  // Navigation functionality
  const homeLink = document.getElementById('home-link');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Reset filters and show all articles
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'latest';
      applyFiltersAndSort();
      loadArticles();
    });
  }

  // Genre filter links
  const genreLinks = document.querySelectorAll('.genre-link');
  genreLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const genre = e.target.getAttribute('data-genre');
      
      // Filter articles by genre
      if (Array.isArray(allArticles)) {
        filteredArticles = allArticles.filter(article => 
          article && article.genre && article.genre.toLowerCase() === genre.toLowerCase()
        );
        currentPage = 1;
        
        // Update the display
        const container = document.getElementById("article-container");
        if (container) {
          container.innerHTML = "";
          
          if (!filteredArticles.length) {
            container.innerHTML = `<p id='no-results'>No ${genre} articles found.</p>`;
            updatePaginationControls();
            return;
          }

          // Show filtered articles
          const startIndex = (currentPage - 1) * articlesPerPage;
          const endIndex = startIndex + articlesPerPage;
          const articlesToShow = filteredArticles.slice(startIndex, endIndex);

          articlesToShow.forEach((a) => {
            const div = document.createElement("div");
            div.classList.add("article-card");
            div.innerHTML = `
              <div class="article-header">
                <span>${new Date(a.date).toLocaleDateString()}</span>
                <span class="genre">${a.genre || 'General'}</span>
              </div>
              <h3>${a.title || 'Untitled'}</h3>
              <p class="intro">${a.intro || 'No description available.'}</p>
              <div class="article-footer">
                <div class="like-section">
                  <button class="like-btn" data-title="${a.title}">
                    👍 Like (<span class="like-count">${a.likes || 0}</span>)
                  </button>
                </div>
                <a href="#" class="read-more" onclick="openModal('${a.title}')">Read More →</a>
              </div>
            `;
            container.appendChild(div);
          });

          updatePaginationControls();
          attachLikeHandlers();
          
          // Scroll to articles
          setTimeout(() => {
            const firstArticle = document.querySelector('.article-card');
            if (firstArticle) {
              firstArticle.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      }
    });
  });

  // Add quiz widget to page if there's a quiz container
  const quizContainer = document.getElementById('quiz-container');
  if (quizContainer) {
    const quizWidget = createQuizWidget();
    quizContainer.appendChild(quizWidget);
  }

  // Add trolley widget to page if there's a trolley container
  const trolleyContainer = document.getElementById('trolley-container');
  if (trolleyContainer) {
    const trolleyWidget = createTrolleyWidget();
    trolleyContainer.appendChild(trolleyWidget);
    
    // Attach event listeners for trolley voting
    setTimeout(() => {
      const voteABtn = document.getElementById('voteA');
      const voteBBtn = document.getElementById('voteB');
      
      if (voteABtn && voteBBtn) {
        voteABtn.onclick = () => vote('A');
        voteBBtn.onclick = () => vote('B');
      }
      
      // Update initial display
      updatePollDisplay();
    }, 100);
  }

  // Add both widgets to home page if there's a widgets container
  const widgetsContainer = document.getElementById('widgets-container');
  if (widgetsContainer) {
    // Create container for both widgets
    const widgetRow = document.createElement('div');
    widgetRow.className = 'widget-row';
    
    // Add trolley widget
    const trolleyWidget = createTrolleyWidget();
    widgetRow.appendChild(trolleyWidget);
    
    // Add quiz widget  
    const quizWidget = createQuizWidget();
    widgetRow.appendChild(quizWidget);
    
    widgetsContainer.appendChild(widgetRow);
    
    // Attach trolley event listeners
    setTimeout(() => {
      const voteABtn = document.getElementById('voteA');
      const voteBBtn = document.getElementById('voteB');
      
      if (voteABtn && voteBBtn) {
        voteABtn.onclick = () => vote('A');
        voteBBtn.onclick = () => vote('B');
      }
      
      updatePollDisplay();
    }, 100);
  }

  // Hide loading message
  setTimeout(() => {
    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) {
      loadingMessage.style.display = 'none';
    }
  }, 1000);
});

// Utility function for debouncing search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Make pagination functions globally accessible
window.nextPage = nextPage;
window.prevPage = prevPage;
window.vote = vote;
