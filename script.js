document.addEventListener('DOMContentLoaded', () => {
  // Auto-detect API base URL
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' // Local development
    : 'https://cogito-computo.onrender.com'; // Replace with your deployed backend URL
  
  const container = document.getElementById('article-container');

  // Global variables to track shared data across all users
  let globalLikeCounts = {};
  let globalTrolleyData = { A: 0, B: 0 };

  // Enhanced fetch with retry logic
  async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response;
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }

  // Function to fetch current trolley vote counts from API
  async function fetchTrolleyVotes() {
    try {
      console.log('Fetching trolley votes from:', `${API_BASE}/poll-data`);
      let response;
      
      try {
        response = await fetchWithRetry(`${API_BASE}/poll-data`);
      } catch (error) {
        console.log('Poll-data endpoint failed, trying main endpoint...');
        response = await fetchWithRetry(API_BASE);
      }
      
      const data = await response.json();
      
      // Handle both array and object responses
      if (Array.isArray(data)) {
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
        
        window.trolleyRowIndices = { A: trolleyAIndex, B: trolleyBIndex };
      } else {
        globalTrolleyData.A = data.A || 0;
        globalTrolleyData.B = data.B || 0;
      }
      
      console.log('✅ Fetched trolley votes:', globalTrolleyData);
    } catch (error) {
      console.error('❌ Error fetching trolley votes:', error);
      globalTrolleyData = { A: 0, B: 0 };
    }
  }

  // Function to update trolley vote in spreadsheet
  async function updateTrolleyVote(option) {
    try {
      globalTrolleyData[option]++;
      
      // Check if we have row indices for direct update
      if (window.trolleyRowIndices && window.trolleyRowIndices[option] !== -1) {
        const rowIndex = window.trolleyRowIndices[option];
        const updateData = {
          ID: 'trolley',
          Option: option,
          Count: globalTrolleyData[option],
          Title: '',
          Date: '',
          Genre: '',
          Introduction: '',
          'Full Content': '',
          Like: ''
        };
        
        await fetchWithRetry(`${API_BASE}/${rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
      } else {
        // Fallback to poll endpoint
        await fetchWithRetry(`${API_BASE}/poll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pollId: 'trolley',
            option,
            newCount: globalTrolleyData[option]
          })
        });
      }
      
      console.log(`✅ Successfully updated trolley vote for option ${option} with count ${globalTrolleyData[option]}`);
    } catch (error) {
      console.error('❌ Error updating trolley vote:', error);
      globalTrolleyData[option]--;
      
      // Show user-friendly error
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'Failed to save vote. Please try again.';
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 10px; border-radius: 5px; z-index: 1000;';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    }
  }

  // Function to fetch current like counts from API
  async function fetchLikeCounts() {
    try {
      console.log('Fetching like counts from:', `${API_BASE}/articles`);
      let response;
      
      try {
        response = await fetchWithRetry(`${API_BASE}/articles`);
      } catch (error) {
        console.log('Articles endpoint failed, trying main endpoint...');
        response = await fetchWithRetry(API_BASE);
      }
      
      const data = await response.json();
      
      data.forEach(article => {
        if (article.Title && article.ID !== 'trolley') {
          globalLikeCounts[article.Title] = parseInt(article.Like) || 0;
        } else if (article.title) {
          globalLikeCounts[article.title] = parseInt(article.likes || article.Like) || 0;
        }
      });
      
      console.log('✅ Fetched like counts:', globalLikeCounts);
    } catch (error) {
      console.error('❌ Error fetching like counts:', error);
    }
  }

  // Function to update like count in spreadsheet
  async function updateLikeCount(title, newCount) {
    try {
      globalLikeCounts[title] = newCount;
      
      let success = false;
      
      // Try specific like endpoint
      try {
        await fetchWithRetry(`${API_BASE}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: title, newLikeCount: newCount })
        });
        success = true;
      } catch (e) {
        console.log('Like endpoint failed, trying alternative...');
      }
      
      // Try title-based update
      if (!success) {
        try {
          await fetchWithRetry(`${API_BASE}/Title/${encodeURIComponent(title)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Like: newCount }),
          });
          success = true;
        } catch (e) {
          console.log('Title-based update failed');
        }
      }
      
      if (success) {
        console.log(`✅ Successfully updated like count for "${title}" to ${newCount}`);
      } else {
        throw new Error('All update methods failed');
      }
    } catch (error) {
      console.error('❌ Error updating like count:', error);
      globalLikeCounts[title] = newCount - 1;
      
      // Show user-friendly error
      const errorMsg = document.createElement('div');
      errorMsg.textContent = 'Failed to save like. Please try again.';
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 10px; border-radius: 5px; z-index: 1000;';
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    }
  }

  // Initialize shared data on page load
  async function initializeSharedData() {
    console.log('🔄 Initializing shared data...');
    
    // Show loading indicator
    if (container) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #925682; border-radius: 50%; animation: spin 1s linear infinite;"></div> Loading articles...</div>';
      
      // Add spinner animation
      if (!document.querySelector('#spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }
    }
    
    try {
      await Promise.all([
        fetchLikeCounts(),
        fetchTrolleyVotes()
      ]);
      
      console.log('✅ Shared data initialized successfully', { 
        likes: globalLikeCounts, 
        trolley: globalTrolleyData 
      });
    } catch (error) {
      console.error('❌ Error initializing shared data:', error);
      
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666;">
            <p>❌ Unable to connect to the server</p>
            <p style="font-size: 0.9em;">Please check your connection and try again</p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #925682; color: white; border: none; border-radius: 5px; cursor: pointer;">Retry</button>
          </div>
        `;
      }
    }
  }

  // Enhanced event delegation for like and share buttons
  if (container) {
    container.addEventListener('click', async e => {
      // Like button functionality
      if (e.target && e.target.classList.contains('like-button') && !e.target.disabled) {
        const likeSection = e.target.closest('.like-section');
        if (!likeSection) return;
        
        const title = likeSection.getAttribute('data-title');
        const likeCountSpan = likeSection.querySelector('.like-count');
        
        if (!title || !likeCountSpan) return;
        
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

      // Share button functionality
      if (e.target && e.target.classList.contains('share-button')) {
        e.preventDefault();
        
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
            
            // Show success message
            const successMsg = document.createElement('div');
            successMsg.textContent = '✅ Link copied to clipboard!';
            successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; z-index: 1000;';
            document.body.appendChild(successMsg);
            setTimeout(() => successMsg.remove(), 2000);
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            // Fallback: copy to clipboard
            try {
              await navigator.clipboard.writeText(articleUrl);
              
              const successMsg = document.createElement('div');
              successMsg.textContent = '✅ Link copied to clipboard!';
              successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; z-index: 1000;';
              document.body.appendChild(successMsg);
              setTimeout(() => successMsg.remove(), 2000);
            } catch (clipboardError) {
              console.error('Share failed:', error);
              // Final fallback - show URL in alert
              alert(`Share this article: ${articleUrl}`);
            }
          }
        }
      }
    });
  }

  // Load and render articles for homepage
  async function loadAndRenderHomepageArticles() {
    if (!container) return;
    
    try {
      console.log('Loading articles from:', API_BASE);
      const response = await fetchWithRetry(API_BASE);
      const data = await response.json();
      
      container.innerHTML = '';

      // Filter out trolley data and only show actual articles
      const articles = data.filter(item => item.ID !== 'trolley' && item.Title && item.Title.trim());

      if (articles.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666;">
            <p>📝 No articles found</p>
            <p style="font-size: 0.9em;">Check back soon for new content!</p>
          </div>
        `;
        return;
      }

      articles.forEach(article => {
        const div = document.createElement('div');
        div.className = 'article fade-in';
        div.style.position = 'relative';

        // Use global like count or fallback to article data
        const currentLikes = globalLikeCounts[article.Title] || parseInt(article.Like) || 0;

        // Determine if article URL is external or internal
        const articleUrl = article['Article URL'] || article['Full Content'] || '#';
        const isExternal = articleUrl.startsWith('http');

        div.innerHTML = `
          <h2>${article.Title}</h2>
          <p class="intro">${article.Introduction ? article.Introduction.replace(/\n/g, '<br>') : 'No introduction available'}</p>
          <a href="${articleUrl}" class="read-more" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            Keep Reading →${isExternal ? ' 🔗' : ''}
          </a>
          <div class="like-section" data-title="${article.Title}">
            <button class="like-button" aria-label="Like article ${article.Title}">❤️</button>
            <span class="like-count">${currentLikes}</span>
            <button class="share-button" aria-label="Share article ${article.Title}">Share ⌘⌲</button>
          </div>
        `;

        container.appendChild(div);
      });

      // After articles are added, disable like buttons already liked by user
      document.querySelectorAll('.like-section').forEach(section => {
        const title = section.getAttribute('data-title');
        const likedKey = `liked-${title}`;
        if (localStorage.getItem(likedKey)) {
          const likeButton = section.querySelector('.like-button');
          if (likeButton) {
            likeButton.disabled = true;
            likeButton.textContent = '❤️ Liked';
            likeButton.style.opacity = '0.6';
          }
        }
      });

      console.log(`✅ Loaded ${articles.length} articles successfully`);
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666;">
            <p style="color: red;">❌ Failed to load articles</p>
            <p style="font-size: 0.9em;">${err.message}</p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #925682; color: white; border: none; border-radius: 5px; cursor: pointer;">Retry</button>
          </div>
        `;
      }
      console.error('❌ Error loading articles:', err);
    }
  }

  // Dark mode toggle
  const toggleButton = document.getElementById('darkModeToggle');
  if (toggleButton) {
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode === 'enabled') {
      document.body.classList.add('dark-mode');
      toggleButton.textContent = '☀️ Light Mode';
    }

    toggleButton.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const darkModeEnabled = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', darkModeEnabled ? 'enabled' : 'disabled');
      toggleButton.textContent = darkModeEnabled ? '☀️ Light Mode' : '🌙 Dark Mode';
    });
  }

  // Navigation functionality
  const navLinks = document.querySelectorAll('nav a');
  if (navLinks.length > 0) {
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
  }

  // Poll functionality
  function updatePollDisplay() {
    const totalVotes = globalTrolleyData.A + globalTrolleyData.B;
    const resultEl = document.getElementById('poll-result');
    
    if (!resultEl) {
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

  async function vote(option) {
    if (option !== 'A' && option !== 'B') return;

    // Disable voting buttons temporarily
    const voteButtons = document.querySelectorAll('#voteA, #voteB');
    voteButtons.forEach(btn => btn.disabled = true);

    try {
      await updateTrolleyVote(option);
      updatePollDisplay();
      
      // Show success feedback
      const successMsg = document.createElement('div');
      successMsg.textContent = `✅ Vote recorded for "${option === 'A' ? 'Pull the Lever' : 'Do Nothing'}"`;
      successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; z-index: 1000;';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 2000);
    } catch (error) {
      console.error('Voting failed:', error);
    } finally {
      // Re-enable voting buttons
      setTimeout(() => {
        voteButtons.forEach(btn => btn.disabled = false);
      }, 1000);
    }
  }

  // Attach poll buttons event listeners
  function attachPollListeners() {
    const voteAButton = document.getElementById('voteA');
    const voteBButton = document.getElementById('voteB');
    if (voteAButton && voteBButton) {
      voteAButton.onclick = () => vote('A');
      voteBButton.onclick = () => vote('B');
    }
  }

  // Main initialization
  async function initialize() {
    console.log('🚀 Starting application initialization...');
    
    try {
      // Initialize shared data first
      await initializeSharedData();
      
      // Load homepage articles if we're on homepage and container exists
      const bodyId = document.body.id;
      if (bodyId !== 'about' && container) {
        await loadAndRenderHomepageArticles();
      }
      
      // Attach poll listeners
      attachPollListeners();
      
      // Update poll display with a slight delay to ensure DOM is ready
      setTimeout(updatePollDisplay, 500);
      
      console.log('✅ Application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
    }
  }

  // Start the application
  initialize();
});

// Enhanced notification system for new articles
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
      // Use the same API_BASE detection logic
      const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://cogito-computo.onrender.com'; // Replace with your deployed backend URL
      
      const response = await fetch(API_BASE);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const articles = data.filter(item => item.ID !== 'trolley' && item.Title && item.Title.trim());
      
      if (articles.length === 0) return;
      
      // Get the most recent article date
      const latestArticle = articles
        .map(article => ({ ...article, date: new Date(article.Date) }))
        .sort((a, b) => b.date - a.date)[0];
      
      // Check if this is a new article (posted in last 7 days)
      const daysSincePosted = (Date.now() - latestArticle.date) / (1000 * 60 * 60 * 24);
      const lastCheck = localStorage.getItem(this.lastCheckKey);
      const dismissedNotifications = JSON.parse(localStorage.getItem(this.dismissedKey) || '[]');
      
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
    
    const introText = article.Introduction ? article.Introduction.substring(0, 100) + '...' : 'New article available!';
    
    banner.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 200px;">
          <strong>🆕 New Article:</strong> ${article.Title}
          <div style="font-size: 0.9em; opacity: 0.9; margin-top: 4px;">
            ${introText}
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
    const readButton = document.getElementById('read-new-article');
    const dismissButton = document.getElementById('dismiss-banner');
    
    if (readButton) {
      readButton.onclick = () => {
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
    }
    
    if (dismissButton) {
      dismissButton.onclick = () => {
        this.dismissBanner(article.Title);
      };
    }
    
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
}

// Initialize notification system for homepage only
document.addEventListener('DOMContentLoaded', () => {
  // Only show on homepage
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    window.simpleNotifications = new SimpleNotificationBanner();
  }
});
