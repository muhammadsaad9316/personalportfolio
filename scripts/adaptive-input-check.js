// Local site: playwright-cli run-code --filename=scripts/adaptive-input-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const results = {};
  let checkpoint = 'initialization';
  const rest = y => page.waitForFunction(expected => Math.abs(scrollY - expected) < 1, y, { timeout: 9000 });
  const fresh = async hash => {
    await page.goto(origin + '/work');
    await page.goto(origin + '/' + hash);
    await rest(hash === '#work' ? 900 : hash === '#case-studies' ? 1800 : hash === '#contact' ? 5400 : hash === '#footer' ? 6300 : 0);
    await page.waitForTimeout(200);
  };
  const clickNav = href => page.evaluate(href => {
    document.querySelector(`a[href="${href}"]`).click();
  }, href);
  const repeatPrevented = () => page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', repeat: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  const pinchPrevented = () => page.evaluate(() => {
    const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  try {
    await page.bringToFront();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await fresh('');
    checkpoint = 'single-scroll baseline';
    assert(await repeatPrevented(), 'Held keys drifted off the Hero rest');
    const baselineStart = await page.evaluate(() => performance.now());
    await page.mouse.wheel(0, 1000);
    assert(!await pinchPrevented(), 'The Hero handoff blocked browser pinch/zoom');
    await page.waitForFunction(() => scrollY === 900 && [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1'));
    results.singleToWorkMs = (await page.evaluate(() => performance.now())) - baselineStart;
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, 1000);
    assert(!await pinchPrevented(), 'The shared-frame flight blocked browser pinch/zoom');
    await rest(1800);

    checkpoint = 'double-scroll forward';
    await fresh('');
    const doubleStart = await page.evaluate(() => performance.now());
    await page.evaluate(() => {
      window.inputFrames = [];
      window.sampleInput = true;
      let previous = performance.now();
      const tick = now => {
        window.inputFrames.push(now - previous);
        previous = now;
        if (window.sampleInput) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(320);
    await page.mouse.wheel(0, 1000);
    await page.waitForFunction(() => scrollY === 900 && [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1'));
    results.repeatedWheelToWorkMs = (await page.evaluate(() => performance.now())) - doubleStart;
    assert(results.repeatedWheelToWorkMs < results.singleToWorkMs * 0.85,
      'Repeated input did not accelerate the existing transition');
    await page.waitForTimeout(500);
    assert(await page.evaluate(() => scrollY === 900), 'Repeated wheel input silently queued another section');
    const frames = await page.evaluate(() => { window.sampleInput = false; return window.inputFrames; });
    frames.sort((a, b) => a - b);
    results.frameP95 = frames[Math.floor(frames.length * 0.95)];
    results.frameCount = frames.length;
    results.framesOver32ms = frames.filter(value => value > 32).length;

    checkpoint = 'double-scroll reverse';
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -1000);
    await page.waitForTimeout(320);
    await page.mouse.wheel(0, -1000);
    await rest(0);
    await page.waitForFunction(() => Math.abs(new DOMMatrixReadOnly(
      getComputedStyle(document.querySelector('[data-hero-person]')).transform).a - 1) < 0.0001);
    results.doubleReverse = true;

    checkpoint = 'keyboard chapters';
    await fresh('#case-studies');
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageDown');
    await rest(3600);
    await page.waitForTimeout(200);
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageUp');
    await rest(1800);
    results.doubleKeyboard = true;

    checkpoint = 'closing forward and reverse';
    await page.waitForTimeout(200);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageDown');
    await rest(3600);
    await page.waitForTimeout(200);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageDown');
    await rest(5400);
    await page.waitForTimeout(200);
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageUp');
    await rest(3600);
    results.doubleClosing = true;

    checkpoint = 'latest direction';
    await fresh('#case-studies');
    await page.mouse.wheel(0, 1000);
    assert(!await page.evaluate(() => {
      const event = new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }), 'The animation hold blocked browser pinch/zoom');
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, -1000);
    await rest(2700);
    await rest(1800);
    assert(await page.evaluate(() => scrollY === 1800), 'A stale queued direction won over the latest input');
    results.latestDirection = true;

    checkpoint = 'navigation cancellation and repeated target';
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('PageDown');
    await clickNav('#contact');
    await clickNav('#contact');
    await rest(5400);
    await clickNav('#work');
    await clickNav('#work');
    await page.waitForTimeout(1200);
    assert(await page.evaluate(() => scrollY === 900 && [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1')), 'Old motion or duplicate navigation reset the destination');
    results.navigationLatestTarget = true;
    assert(await repeatPrevented(), 'Held keys drifted off the Work rest');

    checkpoint = 'same-target navigation at the pending seam';
    await fresh('#work');
    await page.mouse.wheel(0, 1000);
    await rest(1800);
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      window.seamNavigation = false;
      const onScroll = () => {
        if (Math.abs(scrollY - 900) >= 1) return;
        window.removeEventListener('scroll', onScroll);
        window.seamNavigation = true;
        document.querySelector('a[href="#work"]').click();
      };
      window.addEventListener('scroll', onScroll);
    });
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageUp');
    await rest(900);
    await page.waitForTimeout(1400);
    assert(await page.evaluate(() => window.seamNavigation && scrollY === 900),
      'A queued direction survived explicit same-target navigation');
    results.sameTargetCancelsPending = true;

    checkpoint = 'double Back to top';
    await fresh('#footer');
    assert(!await repeatPrevented(), 'Held keys blocked native footer scrolling');
    const homeStart = await page.evaluate(() => performance.now());
    await page.locator('#footer button[aria-label="Back to top"]').evaluate(button => button.click());
    await page.waitForTimeout(120);
    await page.locator('#footer button[aria-label="Back to top"]').evaluate(button => button.click());
    await rest(0);
    results.doubleHomeMs = (await page.evaluate(() => performance.now())) - homeStart;
    assert(results.doubleHomeMs < 1100, 'Double Back to top restarted the long glide');
    await page.waitForTimeout(200);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
    await page.keyboard.press('PageDown');
    await rest(1800);

    checkpoint = 'navigation during Back to top';
    await fresh('#footer');
    await page.locator('#footer button[aria-label="Back to top"]').evaluate(button => button.click());
    await page.waitForTimeout(120);
    await clickNav('#contact');
    await page.waitForTimeout(1700);
    assert(await page.evaluate(() => scrollY === 5400), 'The cancelled home glide changed the new destination');
    results.homeCancellation = true;

    checkpoint = 'queued reverse at footer';
    await fresh('#contact');
    await page.mouse.wheel(0, 1000);
    await page.waitForFunction(() => scrollY > 5500);
    await page.mouse.wheel(0, -1000);
    await rest(6300);
    await rest(5400);
    await page.waitForTimeout(250);
    assert(await page.evaluate(() => scrollY === 5400), 'Queued footer reverse did not restore Contact');
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -1000);
    await rest(4500);
    results.queuedFooterReverse = true;
    assert(errors.length === 0, errors.join('\n'));
    return results;
  } catch (error) {
    throw new Error(`${checkpoint}: ${error.message}`);
  } finally {
    await page.evaluate(() => { window.sampleInput = false; });
    page.off('pageerror', onError);
  }
}
