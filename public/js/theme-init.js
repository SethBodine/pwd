// PWD – theme-init.js
// Runs as a classic (non-module) script BEFORE the ES module bundle loads,
// preventing a flash of the wrong theme on page load.
// Must stay a separate file — inline scripts violate script-src 'self' CSP.
(function () {
  var stored = localStorage.getItem('pwd-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.className = stored || (prefersDark ? 'dark' : 'light');
}());
