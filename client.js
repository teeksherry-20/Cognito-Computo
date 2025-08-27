// Enhanced client.js with backend URL configuration

// Detect environment and set API base URL
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  
  // If running on localhost or local development
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168')) {
    return window.location.origin; // Use same origin for local development
  }
  
  // For production - point to your backend server
  // Replace this URL with your actual backend deployment URL
  if (hostname.includes('netlify.app')) {
    return 'https://your-backend-app.onrender.com'; // Replace with your actual backend URL
  }
  
  // For Render deployment (if frontend and backend are on same domain)
  if (hostname.includes('render.com') || hostname.includes('onrender.com')) {
    return window.location.origin; // Use same origin
  }
  
  // Default fallback
  return window.location.origin;
})();

console.log('🌐 API Base URL:', API_BASE_URL);

// Rest of your client.js code remains the same...
// (I'm only showing the part that needs to change)

// Global variables for trolley voting (stored locally)
let trolleyVotes = { A: 0, B: 0 };

// Global variables for filtering and pagination
let allArticles = [];
let filteredArticles = [];
let currentPage = 1;
const articlesPerPage = 5;
