// OAS — Init script (harus load di <head> sebelum CSS render)

(function(){
  // Baca tema sebelum apapun dirender
  try { window.__initialTheme = localStorage.getItem('bhp_theme') || 'dark'; } catch(e) { window.__initialTheme = 'dark'; }
  // Tulis style inline — body invisible sampai loading screen siap
  var isLight = window.__initialTheme === 'light';
  var bg = isLight ? '#f8fafc' : '#0d0f14';
  document.write('<style id="anti-glitch-style">html,body{background:'+bg+' !important;overflow:hidden;}</style>');
})();
