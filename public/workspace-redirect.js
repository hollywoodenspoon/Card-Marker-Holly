// The old Hearthside Table (playtest/) and Hearthside Engine (engine/) pages: both are
// workspaces of the main app now. Send old links and installed shortcuts there,
// keeping a game pack to open ("#pack=<id>").
;(function () {
  var ws = document.documentElement.getAttribute('data-workspace') || 'cards'
  var pack = new URLSearchParams(location.hash.slice(1)).get('pack')
  var hash = '#/' + ws + (ws === 'play' && pack ? '/pack=' + encodeURIComponent(pack) : '')
  location.replace(new URL('../', location.href).href + hash)
})()
