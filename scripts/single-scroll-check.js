// Local site: playwright-cli run-code --filename=scripts/single-scroll-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const results = {};
  const rest = y => page.waitForFunction(y => Math.abs(scrollY - y) < 1, y, { timeout: 9000 });
  const fresh = async (hash, y) => {
    await page.goto(origin + '/work');
    await page.goto(origin + '/' + hash);
    await rest(y);
    await page.waitForTimeout(250);
  };
  const gesture = (deltas, gap) => page.evaluate(async ({ deltas, gap }) => {
    for (const deltaY of deltas) {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, gap));
    }
  }, { deltas, gap });
  const stays = async y => {
    await rest(y);
    await page.waitForTimeout(550);
    const actual = await page.evaluate(() => scrollY);
    if (Math.abs(actual - y) > 1) throw new Error(`One wheel gesture advanced past ${y} to ${actual}`);
  };
  try {
    await page.bringToFront();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await fresh('', 0);
    const start = await page.evaluate(() => performance.now());
    await gesture([180, 120, 80, 45, 24, 12, 5], 80);
    await page.waitForFunction(() => scrollY === 900 && [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1'));
    results.firstGestureMs = (await page.evaluate(() => performance.now())) - start;
    if (results.firstGestureMs < 3800) throw new Error('A decaying tail accelerated the first entrance');
    await stays(900);
    results.heroOneSection = true;

    await fresh('#work', 900);
    await gesture([180, 120, 80, 45, 24, 12, 5], 80);
    await stays(1800);
    results.workOneSection = true;

    await fresh('#case-studies', 1800);
    await gesture([160, 110, 75, 45, 24, 12, 6, 2, 0.5], 140);
    await stays(2700);
    results.tailAcrossLanding = true;

    await gesture([-160, -110, -75, -45, -24, -12, -6, -2], 80);
    await stays(1800);
    results.reverseOneSection = true;

    await fresh('#work', 900);
    await gesture([100, 100, 100, 100, 100, 100], 80);
    await stays(1800);
    results.equalWheelPackets = true;

    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 1000);
    await stays(2700);
    results.newGestureAfterQuiet = true;
    if (errors.length) throw new Error(errors.join('\n'));
    return results;
  } finally {
    page.off('pageerror', onError);
  }
}
