(function(){
  const LS_KEY = 'recipebox-theme';
  const toggle = document.getElementById('theme-toggle');
  const iconPath = document.getElementById('theme-path');

  if(!toggle || !iconPath) return;

  function setTheme(t){
    if(t === 'light'){
      document.documentElement.setAttribute('data-theme','light');
      iconPath.setAttribute('d', 'M6.76 4.84l-1.8-1.79L3.17 5.84l1.79 1.79 1.8-2.79z M1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.03 2.13l-1.79-1.8-1.8 1.8 1.8 1.79 1.79-1.79zM17 13h3v-2h-3v2zM12 6a6 6 0 100 12 6 6 0 000-12z');
      toggle.setAttribute('aria-pressed','true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      iconPath.setAttribute('d','M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
      toggle.setAttribute('aria-pressed','false');
    }
  }

  function readPref(){
    try{return localStorage.getItem(LS_KEY)}catch(e){return null}
  }
  function writePref(v){try{localStorage.setItem(LS_KEY,v)}catch(e){}
  }

  // initialize: honor stored preference, otherwise system preference
  const stored = readPref();
  if(stored === 'light' || stored === 'dark'){
    setTheme(stored);
  } else {
    const sys = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    setTheme(sys);
  }

  toggle.addEventListener('click', ()=>{
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
    writePref(next);
  });
})();
