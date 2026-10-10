// Functional stress test: run separately from frame-time benchmarks.
// playwright-cli run-code --filename=scripts/footer-budget-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  const target = await context.newPage();
  const cdp = await context.newCDPSession(target);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try {
    await target.goto(origin + '/#footer');
    await target.locator('#footer').scrollIntoViewIfNeeded();
    await target.waitForFunction(() => document.querySelector('[data-footer-fluid]').dataset.fluidState === 'idle');
    await target.evaluate(() => {
      const footer = document.querySelector('#footer');
      let active = true;
      let frame;
      const stress = () => {
        if (!active) return;
        const until = performance.now() + 27;
        while (performance.now() < until) { /* Deliberate competing main-thread work. */ }
        frame = requestAnimationFrame(stress);
      };
      const input = setInterval(() => {
        const box = footer.getBoundingClientRect();
        footer.dispatchEvent(new PointerEvent('pointermove', {
          clientX: box.left + 50 + Math.random() * 180,
          clientY: box.top + 120, pointerId: 1, pointerType: 'mouse',
        }));
      }, 100);
      frame = requestAnimationFrame(stress);
      window.__stopBudgetStress = () => { active = false; cancelAnimationFrame(frame); clearInterval(input); };
    });
    await target.waitForFunction(() => document.querySelector('[data-footer-fluid]').dataset.fluidState === 'budget-fallback', undefined, { timeout: 20000 });
    await target.evaluate(() => window.__stopBudgetStress());
    const result = await target.evaluate(() => {
      const canvas = document.querySelector('[data-footer-fluid]');
      return { state: canvas.dataset.fluidState, quality: canvas.dataset.fluidQuality,
        filter: document.querySelector('[data-footer-content]').style.filter, frames: canvas.dataset.fluidFrames };
    });
    if (result.filter || result.quality !== 'low') throw new Error('Budget fallback did not restore the static surface');
    await target.waitForTimeout(180);
    if (await target.locator('[data-footer-fluid]').getAttribute('data-fluid-frames') !== result.frames) throw new Error('Fallback kept rendering');
    await target.locator('#footer').getByRole('link', { name: 'Contact', exact: true }).click();
    await target.waitForFunction(() => Math.abs(document.querySelector('#contact').getBoundingClientRect().top) < 2);
    return { ...result, renderingStopped: true, contactNavigation: true, method: 'injected 27ms competing RAF work; functional fallback check, not a device benchmark' };
  } finally { await context.close(); }
}
