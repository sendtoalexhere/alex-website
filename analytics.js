/* A thin analytics wrapper.
   The site calls track() regardless of whether analytics is switched on. Until you add a
   provider's script tag to index.html, every call here is a silent no-op — so the site
   works perfectly with analytics off, and nothing about a visitor is collected.

   Works as-is with either provider (both are cookieless, so no consent banner is needed):
     Plausible  <script defer data-domain="alex-tols.com" src="https://plausible.io/js/script.tagged-events.js"></script>
     Umami      <script defer src="https://cloud.umami.is/script.js" data-website-id="YOUR-ID"></script>
*/

export function track(name, props) {
  try {
    if (typeof window.plausible === 'function') window.plausible(name, props ? { props } : undefined);
    else if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, props);
  } catch { /* analytics must never break the site */ }
}

// "How long do they stay": a single-page site reports no duration on its own, because
// duration is derived from a visitor moving between pages. These milestones answer it directly.
export function trackDwell() {
  for (const [ms, at] of [[30e3, '30s'], [120e3, '2min'], [300e3, '5min']]) {
    setTimeout(() => { if (!document.hidden) track('engaged', { at }); }, ms);
  }
}
