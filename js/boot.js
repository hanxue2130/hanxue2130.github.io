/* global Fluid, CONFIG */


<!-- External scripts -->
const scripts = [
  "https://code.jquery.com/jquery-3.6.0.min.js",
  "https://cdn.jsdelivr.net/npm/bootstrap@4/dist/js/bootstrap.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/nprogress@0/nprogress.min.js",
  "https://cdn.jsdelivr.net/npm/typed.js@2/lib/typed.min.js",
  "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
];

scripts.forEach(src => {
  const script = document.createElement('script');
  script.src = src;
  script.async = false; // Ensures they load in order
  document.head.appendChild(script);
});
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('color-toggle-btn');

  if (toggleBtn) {
    toggleBtn.onclick = function() {
      const html = document.documentElement;
      const current = html.getAttribute('data-default-color-scheme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-default-color-scheme', next);

      // Optional: Save preference to local storage so it persists on refresh
      localStorage.setItem('theme', next);
    };
  }
});
