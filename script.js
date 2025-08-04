document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://api.sheetbest.com/sheets/29c9e88c-a1a1-4fb7-bb75-12b8fb82264a';
  const container = document.getElementById('article-container');

  // ENHANCEMENT 1: Global variables to track shared data across all users
  let globalLikeCounts = {}; // Store current like counts from API
  let globalTrolleyData = { A: 0, B: 0 }; // Store current trolley votes from API

  // ENHANCEMENT 2: Function to fetch current trolley vote counts from API
  async function fetchTrolleyVotes() {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch trolley data');
      
      const data = await response.json();
      
      // Find trolley entries and their row indices
      let trolleyAIndex = -1;
      let trolleyBIndex = -1;
      
      data.forEach((item, index) => {
        if (item.ID === 'trolley' && item.Option === 'A') {
          trolleyAIndex = index;
          globalTrolleyData.A = parseInt(item.Count || 0);
        }
        if (item.ID === 'trolley' && item.Option === 'B') {
          trolleyBIndex = index;
          globalTrolleyData.B = parseInt(item.Count || 0);
        }
      });
      
      // Store the row indices for later updates
      window.trolleyRowIndices = { A: trolleyAIndex, B: trolleyBIndex };
      
      console.log('Fetched trolley votes:', globalTrolleyData, 'Row indices:', window.trolleyRowIndices);
    } catch (error) {
      console.error('Error fetching trolley votes:', error);
      // Keep existing local counts if API fails
    }
  }

  // ENHANCEMENT 3: Function to update trolley vote in spreadsheet
  async function updateTrolleyVote(option) {
    try {
      // First increment our local count
      globalTrolleyData[option]++;
      
      // Get the row index for this option
      const rowIndex = window.trolleyRowIndices?.[option];
      if (rowIndex === undefined || rowIndex === -1) {
        throw new Error(`Cannot find row index for trolley option ${option}`);
      }
      
      // Update the specific row using SheetBest row-based update
      const updateData = {
        ID: 'trolley',
        Option: option,
        Count: globalTrolleyData[option],
        Title: null,
        Date: null,
        Genre: null,
        Introduction: null,
        'Full Content': null,
        Like: null
      };
      
      const response = await fetch(`${API_BASE}/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update trolley vote: ${response.status}`);
      }
      
      console.log(`Successfully updated trolley vote for option ${option} at row ${rowIndex} with count ${globalTrolleyData[option]}`);
    } catch (error) {
      console.error('Error updating trolley vote:', error);
      // Revert local count if API update failed
      globalTrolleyData[option]--;
    }
  }

  // ENHANCEMENT 4: Function to fetch current like counts from API
  async function fetchLikeCounts() {
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch like data');
      
      const data = await response.json();
      
      // Store current like counts for each article
      data.forEach(article => {
        if (article.Title && article.Like !== null && article.Like !== undefined) {
          globalLikeCounts[article.Title] = parseInt(article.Like) || 0;
        }
      });
      
      console.log('Fetched like counts:', globalLikeCounts);
    } catch (error) {
      console.error('Error fetching like counts:', error);
    }
  }

  // ENHANCEMENT 5: Function to update like count in spreadsheet
  async function updateLikeCount(title, newCount) {
    try {
      // Update our global count immediately for responsive UI
      globalLikeCounts[title] = newCount;
      
      // Update the spreadsheet using PATCH method for specific article
      const response = await fetch(`${API_BASE}/Title/${encodeURIComponent(title)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Like: newCount }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update like count');
      }
      
      console.log(`Successfully updated like count for "${title}" to ${newCount}`);
    } catch (error) {
      console.error('Error updating like count:', error);
      // Revert global count if API update failed
      globalLikeCounts[title] = newCount - 1;
    }
  }

  // Fetch and render articles
  fetch(API_BASE)
    .then(res => res.json())
    .then(data => {
      container.innerHTML = '';

      // ENHANCEMENT 6: Filter out trolley data and only show actual articles
      const articles = data.filter(item => item.ID !== 'trolley' && item.Title);

      articles.forEach(article => {
        const div = document.createElement('div');
        div.className = 'article fade-in';
        div.style.position = 'relative';

        // ENHANCEMENT 7: Use global like count or fallback to article data
        const currentLikes = globalLikeCounts[article.Title] || parseInt(article.Like) || 0;

        div.innerHTML = `
          <h2>${article.Title}</h2>
          <p>${article.Introduction.replace(/\n/g, '<br>')}</p>
          <a href="${article['Article URL']}" class="read-more" target="_blank" rel="noopener noreferrer">Keep Reading →</a>
          <div class="like-section" data-title="${article.Title}">
            <button class="like-button" aria-label="Like article ${article.Title}">❤️</button>
            <span class="like-count">${currentLikes}</span>
            <button class="share-button" aria-label="Share article ${article.Title}">Share ⌯⌲</button>
          </div>
        `;

        container.appendChild(div);
      });

      // After articles are added, disable like buttons already liked by user
      document.querySelectorAll('.like-section').forEach(section => {
        const title = section.getAttribute('data-title');
        // Check if user has already liked this article (stored locally for user experience)
        const likedKey = `liked-${title}`;
        if (localStorage.getItem(likedKey)) {
          const likeButton = section.querySelector('.like-button');
          likeButton.disabled = true;
          likeButton.textContent = '❤️ Liked';
          likeButton.style.opacity = '0.6';
        }
      });
    })
    .catch(err => {
      container.innerHTML = `<p style="color:red">Failed to load articles: ${err.message}</p>`;
      console.error(err);
    });

  // ENHANCEMENT 8: Enhanced event delegation for like and share buttons
  container.addEventListener('click', async e => {
    // ENHANCEMENT 9: Improved like button functionality with shared counts
    if (e.target && e.target.classList.contains('like-button') && !e.target.disabled) {
      const likeSection = e.target.closest('.like-section');
      const title = likeSection.getAttribute('data-title');
      const likeCountSpan = likeSection.querySelector('.like-count');
      
      // Get current count from global data or DOM
      let currentCount = globalLikeCounts[title] || parseInt(likeCountSpan.textContent) || 0;
      const newCount = currentCount + 1;
      
      // Update UI immediately for better user experience
      likeCountSpan.textContent = newCount;
      e.target.disabled = true;
      e.target.textContent = '❤️ Liked';
      e.target.style.opacity = '0.6';
      
      // Store user's like locally to prevent multiple likes from same user
      const likedKey = `liked-${title}`;
      localStorage.setItem(likedKey, 'true');
      
      // Create floating heart animation
      const heart = document.createElement('div');
      heart.textContent = '❤️';
      heart.className = 'heart-float';
      heart.style.cssText = `
        position: absolute;
        pointer-events: none;
        font-size: 20px;
        animation: heartFloat 1s ease-out forwards;
        z-index: 1000;
      `;
      
      // Add CSS animation if not already present
      if (!document.querySelector('#heart-animation-style')) {
        const style = document.createElement('style');
        style.id = 'heart-animation-style';
        style.textContent = `
          @keyframes heartFloat {
            0% { transform: translateY(0px); opacity: 1; }
            100% { transform: translateY(-30px); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      e.target.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);
      
      // Update the shared like count in spreadsheet
      await updateLikeCount(title, newCount);
    }

    // Share button clicked - keeping existing functionality
    if (e.target && e.target.classList.contains('share-button')) {
    e.preventDefault();
    
    // Get article information
    const likeSection = e.target.closest('.like-section');
    const articleElement = e.target.closest('.article');
    
    if (!likeSection || !articleElement) {
      console.error('Could not find article information');
      return;
    }
    
    const title = likeSection.getAttribute('data-title');
    const articleTitle = title || articleElement.querySelector('h2')?.textContent || 'Cogito Computo Article';
    
    // Get the article URL
    let articleUrl;
    const externalLink = articleElement.querySelector('a[href*="http"]');
    if (externalLink) {
      articleUrl = externalLink.href;
    } else {
      articleUrl = window.location.href;
    }
    
    // Get article intro
    const introElement = articleElement.querySelector('.intro, p');
    const articleText = introElement ? 
      introElement.textContent.substring(0, 100) + '...' : 
      'Check out this article from Cogito Computo!';
    
    const shareData = {
      title: articleTitle,
      text: articleText,
      url: articleUrl
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(articleUrl);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(articleUrl);
          alert('Link copied to clipboard!');
        } catch (clipboardError) {
          console.error('Share failed:', error);
        }
      }
    }
  }

  // Dark mode toggle - keeping existing functionality
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

  // Navigation Highlight and Home Reload - keeping existing functionality
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

  // Skip blog logic if on About page - keeping existing functionality
  const bodyId = document.body.id;
  if (bodyId === 'about') return;

  // Blog Page Logic - keeping existing functionality
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

  // ENHANCEMENT 10: Remove localStorage poll data and use shared API data
  // Poll data now comes from globalTrolleyData instead of localStorage

  // ENHANCEMENT 11: Updated poll display function to use shared data
  function updatePollDisplay() {
    const totalVotes = globalTrolleyData.A + globalTrolleyData.B;
    const resultEl = document.getElementById('poll-result');
    
    if (!resultEl) {
      // If poll result element doesn't exist yet, try again in a moment
      setTimeout(updatePollDisplay, 100);
      return;
    }
    
    if (totalVotes === 0) {
      resultEl.textContent = 'No votes yet';
    } else {
      const percentA = ((globalTrolleyData.A / totalVotes) * 100).toFixed(1);
      const percentB = ((globalTrolleyData.B / totalVotes) * 100).toFixed(1);
      resultEl.textContent = `Pull the Lever: ${percentA}% | Do Nothing: ${percentB}%`;
    }
    
    console.log('Poll display updated:', globalTrolleyData);
  }

  // ENHANCEMENT 12: Updated vote function to use shared API data
  async function vote(option) {
    if (option !== 'A' && option !== 'B') return;

    // Update trolley vote in spreadsheet and global data
    await updateTrolleyVote(option);
    
    // Update display with new counts
    updatePollDisplay();
  }

  // Attach poll buttons event listeners (only if on homepage and buttons exist)
  const voteAButton = document.getElementById('voteA');
  const voteBButton = document.getElementById('voteB');
  if (voteAButton && voteBButton) {
    voteAButton.onclick = () => vote('A');
    voteBButton.onclick = () => vote('B');
  }

  // Genre filtering on nav clicks - keeping existing functionality
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

  // Search and sort event listeners - keeping existing functionality
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

  // Modal event listeners - keeping existing functionality
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

  // Load articles function - keeping existing functionality with filter enhancement
  async function loadArticles() {
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) throw new Error(`Failed to fetch articles: ${response.status}`);

      const data = await response.json();

      // ENHANCEMENT 13: Filter out trolley data and only process actual articles
      const articleData = data.filter(item => item.ID !== 'trolley' && item.Title);

      articles = articleData.map(obj => ({
        title: obj['Title'],
        date: new Date(obj['Date']),
        intro: obj['Introduction'],
        content: obj['Full Content'],
        url: obj['Article URL'],
        genre: obj['Genre'] || '',
        // ENHANCEMENT 14: Include like count and title for reference
        like: parseInt(obj['Like']) || 0,
        originalTitle: obj['Title'] // Keep reference to original title for API calls
      }));

      applyFilters();
    } catch (error) {
      console.error('Error loading articles:', error);
      noResults.style.display = 'block';
      noResults.textContent = 'Failed to load articles.';
    }
  }

  // Apply filters function - keeping existing functionality
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

  // ENHANCEMENT 15: Updated createArticleElement function with shared like counts
  function createArticleElement(article) {
    const articleEl = document.createElement('article');
    articleEl.className = 'article fade-in';
    articleEl.tabIndex = 0;

    // ENHANCEMENT 16: Use global like count or article data for initial display
    const currentLikes = globalLikeCounts[article.originalTitle] || article.like || 0;

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
        <div class="like-section" data-title="${article.originalTitle}">
          <button class="like-button" aria-label="Like article ${article.originalTitle}">❤️</button>
          <span class="like-count">${currentLikes}</span>
          <button class="share-button" aria-label="Share article ${article.originalTitle}">Share ⌲</button>
        </div>
      </div>
    `;

    // ENHANCEMENT 17: Check if user has already liked this article locally
    const likedKey = `liked-${article.originalTitle}`;
    const liked = localStorage.getItem(likedKey);
    if (liked) {
      const likeButton = articleEl.querySelector('.like-button');
      likeButton.disabled = true;
      likeButton.textContent = '❤️ Liked';
      likeButton.style.opacity = '0.6';
    }

    // Attach read more button event listener
    articleEl.querySelector('.read-more-btn').addEventListener('click', () => openModal(article));

    // ENHANCEMENT 18: Enhanced like button event listener with shared functionality
    const likeBtn = articleEl.querySelector('.like-button');
    const likeCountSpan = articleEl.querySelector('.like-count');

    likeBtn.addEventListener('click', async () => {
      if (likeBtn.disabled) return; // Prevent multiple clicks
      
      // Get current count from global data or DOM
      let currentCount = globalLikeCounts[article.originalTitle] || parseInt(likeCountSpan.textContent) || 0;
      const newCount = currentCount + 1;
      
      // Update UI immediately
      likeCountSpan.textContent = newCount;
      likeBtn.disabled = true;
      likeBtn.textContent = '❤️ Liked';
      likeBtn.style.opacity = '0.6';
      
      // Store user's like locally
      const likedKey = `liked-${article.originalTitle}`;
      localStorage.setItem(likedKey, 'true');

      // Floating heart animation
      const heart = document.createElement('div');
      heart.textContent = '❤️';
      heart.className = 'heart-float';
      heart.style.cssText = `
        position: absolute;
        pointer-events: none;
        font-size: 20px;
        animation: heartFloat 1s ease-out forwards;
        z-index: 1000;
      `;
      
      likeBtn.appendChild(heart);
      setTimeout(() => heart.remove(), 1000);

      // Update shared like count in spreadsheet
      await updateLikeCount(article.originalTitle, newCount);
    });

    requestAnimationFrame(() => {
      articleEl.classList.add('visible');
    });

    return articleEl;
  }

  // Render articles function - keeping most functionality, enhancing trolley integration
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

      // ENHANCEMENT 19: Enhanced trolley widget with shared vote functionality
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
        <p id="poll-result" class="poll-result">Loading votes...</p>
      `;
      widgetRow.appendChild(trolleyWidget);

      // Quiz widget - keeping existing functionality
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

    // ENHANCEMENT 20: Re-attach poll button listeners with shared functionality
    if (isHomePage) {
      const voteAButton = document.getElementById('voteA');
      const voteBButton = document.getElementById('voteB');
      if (voteAButton && voteBButton) {
        voteAButton.onclick = () => vote('A');
        voteBButton.onclick = () => vote('B');
      }

      // Update poll display with current shared data - ensure it happens after DOM is ready
      setTimeout(() => {
        updatePollDisplay();
      }, 50);
    }
  }

  // Modal functions - keeping existing functionality
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

  // ENHANCEMENT 21: Enhanced quiz widget with no auto-scroll during results
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

      // ENHANCEMENT 22: Modified submitQuiz function to prevent auto-scrolling
      function submitQuiz() {
        resultBox.innerHTML = `<div id="loading-message">Calculating your philosopher...</div>`;
        // REMOVED: resultBox.scrollIntoView({ behavior: "smooth" }); - this was causing unwanted scrolling

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

      // ENHANCEMENT 23: Modified showResult function to prevent auto-scrolling
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

        // REMOVED: resultBox.scrollIntoView({ behavior: "smooth" }); - this was causing unwanted scrolling
        // Users can now see the result without the page jumping around
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

  // ENHANCEMENT 24: Initialize shared data on page load
  async function initializeSharedData() {
    console.log('Initializing shared data...');
    
    // Fetch current like counts from API
    await fetchLikeCounts();
    
    // Fetch current trolley vote counts from API  
    await fetchTrolleyVotes();
    
    console.log('Shared data initialized successfully', { likes: globalLikeCounts, trolley: globalTrolleyData });
  }

  // ENHANCEMENT 25: Load articles and initialize shared data
  async function initialize() {
    // Initialize shared data first
    await initializeSharedData();
    
    // Then load articles
    await loadArticles();
  }

  // ENHANCEMENT 26: Start the application with shared data initialization
  initialize();
  // Add this to your script.js file

// Push Notification System for New Articles
class ArticleNotificationSystem {
  constructor() {
    this.lastKnownArticleCount = 0;
    this.subscriptionKey = 'article-notifications-subscribed';
    this.lastCountKey = 'last-article-count';
    this.init();
  }

  async init() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    // Load last known article count
    this.lastKnownArticleCount = parseInt(localStorage.getItem(this.lastCountKey)) || 0;
    
    // Show subscription prompt if not already subscribed
    this.showSubscriptionPrompt();
    
    // Check for new articles periodically
    this.startPeriodicCheck();
  }

  showSubscriptionPrompt() {
    // Check if user already made a decision
    const isSubscribed = localStorage.getItem(this.subscriptionKey);
    if (isSubscribed !== null) return;

    // Create notification prompt
    this.createNotificationPrompt();
  }

  createNotificationPrompt() {
    const promptDiv = document.createElement('div');
    promptDiv.id = 'notification-prompt';
    promptDiv.style.cssText = `
      position: fixed;
      top: 20px;
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

    // Add event listeners
    document.getElementById('enable-notifications').onclick = () => this.requestPermission();
    document.getElementById('dismiss-notifications').onclick = () => this.dismissPrompt();
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        localStorage.setItem(this.subscriptionKey, 'true');
        this.showSuccessMessage();
        
        // Send a welcome notification
        new Notification('Cogito Computo Notifications Enabled! 🧠', {
          body: 'You\'ll now get notified when new articles are published.',
          icon: 'logo.png' // Make sure you have a logo file
        });
      } else {
        localStorage.setItem(this.subscriptionKey, 'false');
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
    
    // If user dismissed, ask again in 3 days
    if (!localStorage.getItem(this.subscriptionKey)) {
      const askAgainDate = new Date();
      askAgainDate.setDate(askAgainDate.getDate() + 3);
      localStorage.setItem('notification-ask-again', askAgainDate.toISOString());
    }
  }

  showSuccessMessage() {
    this.showMessage('✅ Notifications enabled! You\'ll be notified of new articles.', '#4CAF50');
  }

  showErrorMessage() {
    this.showMessage('❌ Notifications blocked. You can enable them in your browser settings.', '#f44336');
  }

  showMessage(text, color) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
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
    
    setTimeout(() => messageDiv.remove(), 4000);
  }

  async checkForNewArticles() {
    try {
      const API_BASE = 'https://api.sheetbest.com/sheets/29c9e88c-a1a1-4fb7-bb75-12b8fb82264a';
      const response = await fetch(API_BASE);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const articles = data.filter(item => item.ID !== 'trolley' && item.Title);
      const currentCount = articles.length;
      
      // Check if there are new articles
      if (this.lastKnownArticleCount > 0 && currentCount > this.lastKnownArticleCount) {
        const newArticleCount = currentCount - this.lastKnownArticleCount;
        this.sendNewArticleNotification(newArticleCount, articles[0]); // Show latest article
      }
      
      // Update the count
      this.lastKnownArticleCount = currentCount;
      localStorage.setItem(this.lastCountKey, currentCount.toString());
      
    } catch (error) {
      console.error('Error checking for new articles:', error);
    }
  }

  sendNewArticleNotification(count, latestArticle) {
    // Check if notifications are enabled
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem(this.subscriptionKey) !== 'true') return;

    const title = count === 1 
      ? `New Article: ${latestArticle.Title}` 
      : `${count} New Articles Published!`;
    
    const body = count === 1
      ? latestArticle.Introduction.substring(0, 100) + '...'
      : `Check out the latest posts on Cogito Computo`;

    const notification = new Notification(title, {
      body: body,
      icon: 'logo.png',
      badge: 'logo.png',
      tag: 'new-articles', // Prevents duplicate notifications
      requireInteraction: true // Keeps notification visible until user interacts
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Scroll to latest article if on home page
      if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        setTimeout(() => {
          const firstArticle = document.querySelector('.article');
          if (firstArticle) {
            firstArticle.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      }
    };
  }

  startPeriodicCheck() {
    // Check every 10 minutes for new articles
    setInterval(() => {
      this.checkForNewArticles();
    }, 10 * 60 * 1000); // 10 minutes

    // Also check when page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForNewArticles();
      }
    });
  }

  // Manual method to check for new articles (can be called from anywhere)
  async manualCheck() {
    await this.checkForNewArticles();
  }

  // Method to unsubscribe
  unsubscribe() {
    localStorage.setItem(this.subscriptionKey, 'false');
    this.showMessage('🔕 Notifications disabled', '#ff9800');
  }

  // Method to check subscription status
  isSubscribed() {
    return localStorage.getItem(this.subscriptionKey) === 'true' && 
           Notification.permission === 'granted';
  }
}

// Initialize the notification system
document.addEventListener('DOMContentLoaded', () => {
  // Create global instance
  window.articleNotifications = new ArticleNotificationSystem();
  
  // Add notification settings to your page (optional)
  const addNotificationSettings = () => {
    const nav = document.querySelector('nav');
    if (nav && window.articleNotifications.isSubscribed()) {
      const unsubscribeBtn = document.createElement('button');
      unsubscribeBtn.textContent = '🔔';
      unsubscribeBtn.title = 'Notification Settings';
      unsubscribeBtn.style.cssText = `
        background: none;
        border: 1px solid #925682;
        color: #925682;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 10px;
        font-size: 0.8rem;
      `;
      
      unsubscribeBtn.onclick = () => {
        if (confirm('Do you want to disable article notifications?')) {
          window.articleNotifications.unsubscribe();
          unsubscribeBtn.remove();
        }
      };
      
      nav.appendChild(unsubscribeBtn);
    }
  };
  
  // Add settings after a short delay
  setTimeout(addNotificationSettings, 1000);
});
  // Simple in-page notification system
// Add this to your existing script.js

class SimpleNotificationBanner {
  constructor() {
    this.lastCheckKey = 'last-article-check';
    this.dismissedKey = 'dismissed-notifications';
    this.init();
  }

  init() {
    // Check for new articles when page loads
    setTimeout(() => this.checkForNewArticles(), 2000);
  }

  async checkForNewArticles() {
    try {
      const API_BASE = 'https://api.sheetbest.com/sheets/29c9e88c-a1a1-4fb7-bb75-12b8fb82264a';
      const response = await fetch(API_BASE);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const articles = data.filter(item => item.ID !== 'trolley' && item.Title);
      
      // Get the most recent article date
      const latestArticle = articles
        .map(article => ({ ...article, date: new Date(article.Date) }))
        .sort((a, b) => b.date - a.date)[0];
      
      if (!latestArticle) return;
      
      // Check if this is a new article (posted in last 7 days)
      const daysSincePosted = (Date.now() - latestArticle.date) / (1000 * 60 * 60 * 24);
      const lastCheck = localStorage.getItem(this.lastCheckKey);
      const dismissedNotifications = JSON.parse(localStorage.getItem(this.dismissedKey) || '[]');
      
      // Show notification if:
      // - Article is less than 7 days old
      // - User hasn't seen this article notification before
      // - User hasn't dismissed this specific article
      if (daysSincePosted <= 7 && 
          (!lastCheck || new Date(lastCheck) < latestArticle.date) &&
          !dismissedNotifications.includes(latestArticle.Title)) {
        
        this.showNewArticleBanner(latestArticle);
      }
      
      // Update last check time
      localStorage.setItem(this.lastCheckKey, new Date().toISOString());
      
    } catch (error) {
      console.error('Error checking for new articles:', error);
    }
  }

  showNewArticleBanner(article) {
    // Remove any existing banner
    const existingBanner = document.getElementById('new-article-banner');
    if (existingBanner) existingBanner.remove();
    
    // Create banner
    const banner = document.createElement('div');
    banner.id = 'new-article-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #925682, #b773a3);
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-family: 'Courier Prime', monospace;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;
    
    banner.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 200px;">
          <strong>🆕 New Article:</strong> ${article.Title}
          <div style="font-size: 0.9em; opacity: 0.9; margin-top: 4px;">
            ${article.Introduction.substring(0, 100)}...
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="read-new-article" style="
            background: white;
            color: #925682;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9rem;
          ">Read Now</button>
          <button id="dismiss-banner" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.5);
            padding: 6px 12px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 0.8rem;
          ">Dismiss</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // Animate banner in
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);
    
    // Add body padding to prevent content overlap
    document.body.style.paddingTop = '70px';
    
    // Event listeners
    document.getElementById('read-new-article').onclick = () => {
      // Scroll to the article or open it
      const firstArticle = document.querySelector('.article');
      if (firstArticle) {
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => {
          banner.remove();
          document.body.style.paddingTop = '0';
          firstArticle.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    };
    
    document.getElementById('dismiss-banner').onclick = () => {
      this.dismissBanner(article.Title);
    };
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (document.getElementById('new-article-banner')) {
        this.dismissBanner(article.Title);
      }
    }, 30000);
  }

  dismissBanner(articleTitle) {
    const banner = document.getElementById('new-article-banner');
    if (!banner) return;
    
    // Add to dismissed list
    const dismissed = JSON.parse(localStorage.getItem(this.dismissedKey) || '[]');
    if (!dismissed.includes(articleTitle)) {
      dismissed.push(articleTitle);
      localStorage.setItem(this.dismissedKey, JSON.stringify(dismissed));
    }
    
    // Animate out and remove
    banner.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      banner.remove();
      document.body.style.paddingTop = '0';
    }, 300);
  }

  // Clean up old dismissed notifications (older than 30 days)
  cleanupDismissed() {
    // This would require article dates, implement if needed
  }
}

// Initialize simple notification system
document.addEventListener('DOMContentLoaded', () => {
  // Only show on homepage
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    window.simpleNotifications = new SimpleNotificationBanner();
  }
});
});
