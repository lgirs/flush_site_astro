/**
 * Chooses ONE random SVG from a data attribute and paints it as background.
 * Runs on every page load. No inline scripts required.
 */
function initRandomMark() {
  const roots = document.querySelectorAll<HTMLElement>('.rm[data-rm-urls]');
  roots.forEach((root) => {
    const json = root.getAttribute('data-rm-urls') || '[]';
    const fallback = root.getAttribute('data-rm-fallback') || '';
    let urls: string[] = [];
    try { urls = JSON.parse(json); } catch {}
    const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
    const choice = urls.length ? pick(urls) : fallback;

    const bg = root.querySelector<HTMLElement>('.rm__bg');
    if (bg && choice) bg.style.backgroundImage = `url(${choice})`;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRandomMark, { once: true });
} else {
  initRandomMark();
}
