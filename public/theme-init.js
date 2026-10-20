// Apply the saved theme before first paint to avoid a flash.
try {
  var t = localStorage.getItem('cardmaker.theme') || 'system'
  var fun = { bubblegum: false, arcade: true, forest: false, sunset: false }
  var dark =
    t in fun
      ? fun[t]
      : t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  if (t in fun) document.documentElement.dataset.theme = t
} catch (e) {}
