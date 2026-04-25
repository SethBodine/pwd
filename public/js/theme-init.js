// PWD – theme-init.js
// Runs as a classic (non-module) script BEFORE the ES module bundle loads,
// preventing a flash of the wrong theme on page load.
// Must stay a separate file — inline scripts violate script-src 'self' CSP.
(function () {
  var stored      = localStorage.getItem('pwd-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme       = stored || (prefersDark ? 'dark' : 'light');
  // Use classList so ui.js can also use classList.toggle without conflict
  document.documentElement.classList.add(theme);
}());
