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

  // FIX 1: Enhanced Share Dialog Function
  function createShareDialog(title, articleUrl, introText) {
    // Remove any existing dialog
    const existingDialog = document.getElementById('share-dialog');
    if (existingDialog) existingDialog.remove();

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.id = 'share-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    // Create dialog content
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      text-align: center;
      font-family: 'Courier Prime', monospace;
      animation: slideIn 0.3s ease;
    `;

    // Add CSS animations if not already present
    if (!document.querySelector('#share-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'share-dialog-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .share-option {
          display: block;
          width: 100%;
          padding: 12px;
          margin: 8px 0;
          border: 1px solid #925682;
          background: white;
          color: #925682;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Courier Prime', monospace;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .share-option:hover {
          background: #925682;
          color: white;
        }
        .share-url-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: 'Courier Prime', monospace;
          font-size: 0.9rem;
          margin: 10px 0;
          background: #f9f9f9;
        }
      `;
      document.head.appendChild(style);
    }

    dialogContent.innerHTML = `
      <h3 style="color: #925682; margin-bottom: 20px; font-size: 1.2rem;">Share this article</h3>
      <p style="color: #666; margin-bottom: 20px; font-size: 0.9rem;">${title}</p>
      
      <input type="text" class="share-url-input" value="${articleUrl}" readonly>
      
      <div style="margin: 20px 0;">
        <button class="share-option" onclick="copyToClipboard('${articleUrl}')">
          📋 Copy Link to Clipboard
        </button>
        
        <button class="share-option" onclick="shareViaEmail('${encodeURIComponent(title)}', '${encodeURIComponent(articleUrl)}', '${encodeURIComponent(introText)}')">
          ✉️ Share via Email
        </button>
        
        <button class="share-option" onclick="shareOnTwitter('${encodeURIComponent(title)}', '${encodeURIComponent(articleUrl)}')">
          🐦 Share on Twitter
        </button>
        
        <button class="share-option" onclick="shareOnFacebook('${encodeURIComponent(articleUrl)}')">
          📘 Share on Facebook
        </button>
      </div>
      
      <button onclick="closeShareDialog()" style="
        background: #f0f0f0;
        border: 1px solid #ddd;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Courier Prime', monospace;
        margin-top: 10px;
      ">Close</button>
    `;

    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    // Close dialog when clicking outside
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeShareDialog();
      }
    });

    // Close with Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeShareDialog();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  // Share dialog utility functions
  window.copyToClipboard = async function(url) {
    try {
      await navigator.clipboard.writeText(url);
      showShareMessage('✅ Link copied to clipboard!', '#4CAF50');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showShareMessage('✅ Link copied to clipboard!', '#4CAF50');
    }
    setTimeout(closeShareDialog, 1500);
  };

  window.shareViaEmail = function(title, url, intro) {
    const subject = `Check out this article: ${decodeURIComponent(title)}`;
    const body = `I thought you might enjoy this article from Cogito Computo:\n\n${decodeURIComponent(title)}\n\n${decodeURIComponent(intro)}\n\nRead more: ${decodeURIComponent(url)}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    closeShareDialog();
  };

  window.shareOnTwitter = function(title, url) {
    const text = `Check out this article: ${decodeURIComponent(title)}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
    closeShareDialog();
  };

  window.shareOnFacebook = function(url) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    closeShareDialog();
  };

  window.closeShareDialog = function() {
    const dialog = document.getElementById('share-dialog');
    if (dialog) {
      dialog.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => dialog.remove(), 300);
    }
  };

  window.showShareMessage = function(message, color) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10001;
      font-family: 'Courier Prime', monospace;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
  };

  // Add fadeOut animation
  if (!document.querySelector('#fadeout-style')) {
    const style = document.createElement('style');
    style.id = 'fadeout-style';
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
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
          <div class="like-section" data-title="${article.Title}" data-url="${article['Article URL']}" data-intro="${article.Introduction}">
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

    // FIX 2: Updated share button functionality with dialog
    if (e.target && e.target.classList.contains('share-button')) {
      e.preventDefault();
      
      // Get article information
      const likeSection = e.target.closest('.like-section');
      
      if (!likeSection) {
        console.error('Could not find article information');
        return;
      }
      
      const title = likeSection.getAttribute('data-title');
      const articleUrl = likeSection.getAttribute('data-url') || window.location.href;
      const introText = likeSection.getAttribute('data-intro') || 'Check out this article from Cogito Computo!';
      
      // Show share dialog
      createShareDialog(title, articleUrl, introText.substring(0, 100) + '...');
    }
  });

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
        <div class="like-section" data-title="${article.originalTitle}" data-url="${article.url}" data-intro="${article.intro}">
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
    const shareBtn = articleEl.querySelector('.share-button');

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
