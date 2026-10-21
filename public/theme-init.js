// Apply the saved theme before first paint to avoid a flash. New users get
// Hearthside (dark). Colour themes remember whether they are dark in
// cardmaker.themeDark (written by src/ui/theme/theme.ts).
try {
  var t = localStorage.getItem('cardmaker.theme') || 'hearthside'
  var basic = t === 'light' || t === 'dark' || t === 'system'
  var saved = localStorage.getItem('cardmaker.themeDark')
  var dark = basic
    ? t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    : t === 'hearthside' || saved === '1' || (saved === null && t === 'arcade')
  document.documentElement.classList.toggle('dark', dark)
  if (!basic) document.documentElement.dataset.theme = t
} catch (e) {}
