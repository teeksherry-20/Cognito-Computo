function setupDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (!darkModeToggle) return;

  // Load saved theme
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
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (!darkModeToggle) return;
  const isDark = document.body.classList.contains('dark-mode');
  darkModeToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// ✅ Run on page load
document.addEventListener('DOMContentLoaded', setupDarkMode);
