
// Detect environment and set API base URL
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168')) {
    return 'http://localhost:3000';
  }
  if (hostname.includes('netlify.app') || hostname.includes('cogitocomputo.netlify.app')) {
    return 'https://cogito-computo-1cjv.onrender.com';
  }
  if (hostname.includes('render.com') || hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  return 'https://cogito-computo-1cjv.onrender.com';
})();

console.log('🌐 API Base URL:', API_BASE_URL);

let trolleyVotes = { A: 0, B: 0 };

let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
const articlesPerPage = 4;

let articleContainer, searchInput, sortSelect, pageIndicator, prevPageButton, nextPageButton;
let noResults, modal, modalTitle, modalBody, modalClose, darkModeToggle;
let currentGenreFilter = '';

document.addEventListener('DOMContentLoaded', async function() {
  initializeElements();
  setupEventListeners();

  try {
    await loadArticles();
  } catch (err) {
    console.error("❌ Error loading articles:", err);
  }

  // ✅ Always run widgets and dark mode
  createWidgets();
  setupDarkMode();
});


function initializeElements() {
  articleContainer = document.getElementById('article-container');
  searchInput = document.getElementById('search-input');
  sortSelect = document.getElementById('sort-select');
  pageIndicator = document.getElementById('pageIndicator');
  prevPageButton = document.getElementById('prevPageButton');
  nextPageButton = document.getElementById('nextPageButton');
  noResults = document.getElementById('no-results');
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modal-title');
  modalBody = document.getElementById('modal-body');
  modalClose = document.getElementById('modal-close');
  darkModeToggle = document.getElementById('darkModeToggle');
}

function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  sortSelect.addEventListener('change', handleSort);
  prevPageButton.addEventListener('click', () => changePage(-1));
  nextPageButton.addEventListener('click', () => changePage(1));

  document.getElementById('home-link').addEventListener('click', (e) => {
    e.preventDefault();
    showAllArticles();
  });

  document.querySelectorAll('.genre-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const genre = e.target.getAttribute('data-genre');
      filterByGenre(genre);
    });
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display !== 'none') {
      closeModal();
    }
  });
}

// Parse [img:URL] tags into <img>
function parseImages(text) {
  if (!text) return "";
  return text.replace(/\[img:(.*?)\]/g, (match, url) => {
    return `<img src="${url}" alt="article image" class="article-image">`;
  });
}

function extractImagesOnly(text) {
  if (!text) return "";
  return (text.match(/\[img:(.*?)\]/g) || [])
    .map(match => {
      const url = match.slice(5, -1);
      return `<img src="${url}" alt="article image" class="article-image">`;
    })
    .join("");
}


// Load articles
async function loadArticles() {
  try {
    console.log('📡 Fetching articles from:', `${API_BASE_URL}/articles`);
    const response = await fetch(`${API_BASE_URL}/articles`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const articles = await response.json();
    allArticles = articles;
    filteredArticles = [...allArticles];

    const loadingMessage = document.querySelector('.loading-message');
    if (loadingMessage) loadingMessage.style.display = 'none';

    displayArticles();
  } catch (error) {
    console.error('❌ Failed to load articles:', error);
    articleContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: #d32f2f;">⚠️ Failed to Load Articles: ${error.message}</div>`;
  }
}

function displayArticles() {
  if (filteredArticles.length === 0) {
    noResults.style.display = 'block';
    articleContainer.innerHTML = '';
    updatePagination();
    return;
  }

  noResults.style.display = 'none';
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const articlesToShow = filteredArticles.slice(startIndex, endIndex);

  articleContainer.innerHTML = articlesToShow.map(article => `
    <article class="blog-post" data-id="${article.id}">
      <div class="article-header">
        ${extractImagesOnly(article.intro)} <!-- ✅ only images -->
        <h2 class="article-title">${escapeHtml(article.title)}</h2>
        <div class="article-meta">
          <span class="article-date">${formatDate(article.date)}</span>
          <span class="article-genre">${escapeHtml(article.genre)}</span>
        </div>
      </div>
      <div class="article-intro">
        ${formatIntroText(article.intro)} <!-- ✅ only text -->
      </div>
      <div class="article-footer">
        <div class="article-actions" style="display:flex; gap:10px; align-items:center;">
          <button class="read-more-btn" onclick="openModal(${article.id})">Read Full Article →</button>
          <button class="like-btn" onclick="likeArticle(${article.id})">❤️ <span class="like-count">${article.likes}</span></button>
        </div>
      </div>
    </article>
  `).join('');

  updatePagination();
}


function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  if (searchTerm === '') {
    filteredArticles = currentGenreFilter ? allArticles.filter(article => article.genre === currentGenreFilter) : [...allArticles];
  } else {
    const baseArticles = currentGenreFilter ? allArticles.filter(article => article.genre === currentGenreFilter) : allArticles;
    filteredArticles = baseArticles.filter(article =>
      article.title.toLowerCase().includes(searchTerm) ||
      article.intro.toLowerCase().includes(searchTerm) ||
      article.genre.toLowerCase().includes(searchTerm)
    );
  }
  currentPage = 1;
  displayArticles();
}

function handleSort() {
  const sortValue = sortSelect.value;
  filteredArticles.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortValue === 'latest') filteredArticles.reverse();
  currentPage = 1;
  displayArticles();
}

function filterByGenre(genre) {
  currentGenreFilter = genre;
  filteredArticles = allArticles.filter(article => article.genre === genre);
  searchInput.value = '';
  currentPage = 1;
  displayArticles();
}

function showAllArticles() {
  currentGenreFilter = '';
  filteredArticles = [...allArticles];
  searchInput.value = '';
  currentPage = 1;
  displayArticles();
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  const newPage = currentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updatePagination() {
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  pageIndicator.textContent = totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'No articles';
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= totalPages;
}

function openModal(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;

  modalTitle.textContent = article.title;
  modalBody.innerHTML = `
    <div class="modal-meta" style="text-align:center;">
      <span class="modal-date">${formatDate(article.date)}</span>
      <span class="modal-genre">${escapeHtml(article.genre)}</span>
    </div>
    <div class="modal-content-text" style="text-align:center;">
      ${parseImages(formatArticleContent(article.fullContent || article.intro))}
    </div>
  `;

  modal.style.display = 'flex'; // ensure flex centering works
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

async function likeArticle(articleId) {
  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;
  const newLikeCount = article.likes + 1;
  article.likes = newLikeCount;
  const likeCountElement = document.querySelector(`[data-id="${articleId}"] .like-count`);
  if (likeCountElement) {
    likeCountElement.textContent = newLikeCount;
    likeCountElement.parentElement.style.transform = 'scale(1.2)';
    setTimeout(() => { likeCountElement.parentElement.style.transform = 'scale(1)'; }, 200);
  }
  try {
    await fetch(`${API_BASE_URL}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, newLikeCount })
    });
  } catch (error) {
    console.warn('❌ Failed to sync like to backend:', error);
  }
}

// Create interactive widgets
function createWidgets() {
  const widgetContainer = document.getElementById('widgets-container');
  if (!widgetContainer) return;

  widgetContainer.innerHTML = `
    <div class="widget-row">
      <!-- Philosophy Quiz Widget -->
      <div class="quiz-widget">
        <h3 class="quiz-title">Which Philosopher Are You?</h3>
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar" id="quiz-progress-bar"></div>
        </div>
        <div id="quiz-progress">Question 1 of 4</div>
        
        <div id="quiz-container">
          <div class="quiz-question show" data-question="0">
            <p>What is the nature of reality?</p>
            <label><input type="radio" name="q0" value="a"> Everything is interconnected and part of one universal substance</label>
            <label><input type="radio" name="q0" value="b"> Reality is what we can observe and measure empirically</label>
            <label><input type="radio" name="q0" value="c"> Reality is fundamentally mental or spiritual in nature</label>
            <label><input type="radio" name="q0" value="d"> We can never truly know the nature of ultimate reality</label>
          </div>
          
          <div class="quiz-question" data-question="1">
            <p>How should one live a good life?</p>
            <label><input type="radio" name="q1" value="a"> Through reason, virtue, and acceptance of fate</label>
            <label><input type="radio" name="q1" value="b"> By maximizing happiness and minimizing suffering for the greatest number</label>
            <label><input type="radio" name="q1" value="c"> Through authentic self-expression and creating your own meaning</label>
            <label><input type="radio" name="q1" value="d"> By following moral duties and treating others as ends in themselves</label>
          </div>
          
          <div class="quiz-question" data-question="2">
            <p>What is the relationship between mind and body?</p>
            <label><input type="radio" name="q2" value="a"> They are one substance viewed from different perspectives</label>
            <label><input type="radio" name="q2" value="b"> The mind emerges from complex brain activity</label>
            <label><input type="radio" name="q2" value="c"> Mind and body are separate, interacting substances</label>
            <label><input type="radio" name="q2" value="d"> This question reveals the limits of human understanding</label>
          </div>
          
          <div class="quiz-question" data-question="3">
            <p>What is the source of human knowledge?</p>
            <label><input type="radio" name="q3" value="a"> Logical reasoning and intuitive understanding of eternal truths</label>
            <label><input type="radio" name="q3" value="b"> Sensory experience and empirical observation</label>
            <label><input type="radio" name="q3" value="c"> Personal experience and subjective interpretation</label>
            <label><input type="radio" name="q3" value="d"> Knowledge is limited by the structure of our minds</label>
          </div>
        </div>
        
        <button id="next-btn" onclick="nextQuestion()">Next Question</button>
        
        <div id="quiz-result" class="quiz-result" style="display: none;">
          <!-- Result will be populated by JavaScript -->
        </div>
      </div>
      
      <!-- Trolley Problem Widget -->
      <div class="trolley-widget">
        <h3>The Trolley Problem</h3>
        <video autoplay muted loop>
          <source src="https://cdn.pixabay.com/video/2019/03/25/22346-326831942_tiny.mp4" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <p>A runaway trolley is heading towards five people. You can pull a lever to divert it to another track, but there's one person on that track. What do you do?</p>
        
        <div class="trolley-buttons">
          <button class="trolley-btn" onclick="vote('A')">Pull the Lever<br><small>(Save 5, sacrifice 1)</small></button>
          <button class="trolley-btn" onclick="vote('B')">Do Nothing<br><small>(Let fate decide)</small></button>
        </div>
        
        <div id="poll-result" class="poll-result" style="display: none;">
          <!-- Poll results will be shown here -->
        </div>
      </div>
    </div>
  `;
  
  // Load trolley votes
  loadTrolleyVotes();
}

// Quiz functionality
let currentQuestionIndex = 0;
const totalQuestions = 4;
let quizAnswers = {};

function nextQuestion() {
  const currentQuestion = document.querySelector(`.quiz-question[data-question="${currentQuestionIndex}"]`);
  const selectedAnswer = currentQuestion.querySelector('input[type="radio"]:checked');
  
  if (!selectedAnswer) {
    alert('Please select an answer before continuing.');
    return;
  }
  
  // Store the answer
  quizAnswers[`q${currentQuestionIndex}`] = selectedAnswer.value;
  
  // Hide current question
  currentQuestion.classList.remove('show');
  
  // Move to next question or show result
  currentQuestionIndex++;
  
  if (currentQuestionIndex < totalQuestions) {
    // Show next question
    const nextQuestion = document.querySelector(`.quiz-question[data-question="${currentQuestionIndex}"]`);
    nextQuestion.classList.add('show');
    
    // Update progress
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
    document.getElementById('quiz-progress').textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
  } else {
    // Show result
    showQuizResult();
  }
}

function showQuizResult() {
  // Hide quiz interface
  document.getElementById('quiz-container').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('quiz-progress').style.display = 'none';
  document.querySelector('.quiz-progress-bar-container').style.display = 'none';
  
  // Calculate result based on answers
  const result = calculatePhilosopher(quizAnswers);
  
  // Show result
  const resultDiv = document.getElementById('quiz-result');
  resultDiv.innerHTML = `
    <img src="${result.image}" alt="${result.name}" onerror="this.src='https://via.placeholder.com/80x80?text=${result.name[0]}'">
    <h4>${result.name}</h4>
    <p>${result.description}</p>
    <div style="margin-top: 15px;">
      <button id="retake-btn" onclick="retakeQuiz()">🔄 Retake Quiz</button>
      <button id="share-btn" onclick="shareResult('${result.name}')">📤 Share Result</button>
    </div>
  `;
  resultDiv.style.display = 'block';
}

function calculatePhilosopher(answers) {
  const philosophers = {
    a: { name: "Spinoza", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Spinoza.jpg/200px-Spinoza.jpg", description: "Like Spinoza, you see reality as one interconnected whole and believe in living according to reason and virtue." },
    b: { name: "John Stuart Mill", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/John_Stuart_Mill_by_London_Stereoscopic_Company%2C_c1870.jpg/200px-John_Stuart_Mill_by_London_Stereoscopic_Company%2C_c1870.jpg", description: "Like Mill, you're practical and empirical, focused on maximizing happiness and well-being for everyone." },
    c: { name: "Sartre", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Sartre_1967_crop.jpg/200px-Sartre_1967_crop.jpg", description: "Like Sartre, you believe in authentic self-expression and that existence precedes essence." },
    d: { name: "Kant", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Kant_gemaelde_3.jpg/200px-Kant_gemaelde_3.jpg", description: "Like Kant, you recognize the limits of human knowledge while maintaining strong moral principles." }
  };
  
  // Count answers
  const counts = { a: 0, b: 0, c: 0, d: 0 };
  Object.values(answers).forEach(answer => counts[answer]++);
  
  // Find most common answer
  const topAnswer = Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
  
  return philosophers[topAnswer] || philosophers.a;
}

function retakeQuiz() {
  currentQuestionIndex = 0;
  quizAnswers = {};
  
  // Reset UI
  document.getElementById('quiz-container').style.display = 'block';
  document.getElementById('next-btn').style.display = 'block';
  document.getElementById('quiz-progress').style.display = 'block';
  document.querySelector('.quiz-progress-bar-container').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';
  
  // Reset progress
  document.getElementById('quiz-progress-bar').style.width = '25%';
  document.getElementById('quiz-progress').textContent = 'Question 1 of 4';
  
  // Reset questions
  document.querySelectorAll('.quiz-question').forEach((q, index) => {
    q.classList.toggle('show', index === 0);
    q.querySelectorAll('input[type="radio"]').forEach(input => input.checked = false);
  });
}

function shareResult(philosopher) {
  if (navigator.share) {
    navigator.share({
      title: 'My Philosopher Quiz Result',
      text: `I got ${philosopher} in the philosophy quiz! Take it yourself:`,
      url: window.location.href
    });
  } else {
    // Fallback for browsers that don't support Web Share API
    const text = `I got ${philosopher} in the philosophy quiz! Check it out at ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Result copied to clipboard!');
    }).catch(() => {
      alert(`My result: ${philosopher}. Check out this quiz at ${window.location.href}`);
    });
  }
}

// Trolley Problem functionality
async function vote(option) {
  trolleyVotes[option]++;
  
  // Show results immediately
  showPollResult();
  
  // Try to sync with backend
  try {
    await fetch(`${API_BASE_URL}/trolley-vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ option })
    });
  } catch (error) {
    console.warn('❌ Failed to sync vote to backend:', error);
  }
}

async function loadTrolleyVotes() {
  try {
    const response = await fetch(`${API_BASE_URL}/trolley-votes`);
    if (response.ok) {
      const votes = await response.json();
      trolleyVotes = votes;
    }
  } catch (error) {
    console.warn('❌ Failed to load trolley votes:', error);
  }
}

function showPollResult() {
  const total = trolleyVotes.A + trolleyVotes.B;
  const percentA = total > 0 ? Math.round((trolleyVotes.A / total) * 100) : 0;
  const percentB = total > 0 ? Math.round((trolleyVotes.B / total) * 100) : 0;
  
  const resultDiv = document.getElementById('poll-result');
  resultDiv.innerHTML = `
    <strong>Results so far:</strong><br>
    Pull Lever: ${percentA}% (${trolleyVotes.A} votes)<br>
    Do Nothing: ${percentB}% (${trolleyVotes.B} votes)<br>
    <small>Total votes: ${total}</small>
  `;
  resultDiv.style.display = 'block';
  
  // Disable buttons after voting
  document.querySelectorAll('.trolley-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  });
}

// Dark Mode functionality
function setupDarkMode() {
  // Check for saved preference or default to light mode
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  updateDarkModeToggle();
  
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateDarkModeToggle();
  });
}

function updateDarkModeToggle() {
  const isDark = document.body.classList.contains('dark-mode');
  darkModeToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? '' : date.toLocaleDateString();
}

function formatIntroText(text) {
  if (!text) return '';
  const plainText = text.replace(/\[img:.*?\]/g, '').trim();
  return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
}

function formatArticleContent(text) {
  return text || '';
}




