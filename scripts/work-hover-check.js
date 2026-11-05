// Local site: playwright-cli run-code --filename=scripts/work-hover-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const results = {};
  let checkpoint = 'initial Work entrance';
  try {
    await page.bringToFront();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(origin + '/work');
    await page.goto(origin + '/#work');
    await page.waitForFunction(() => scrollY === 900);
    await page.waitForFunction(() => !!document.querySelector('[data-cinematic]') &&
      [...document.querySelectorAll('[data-project]')].every(element => element.style.opacity === '1'));
    await page.mouse.move(20, 20);
    await page.waitForTimeout(200);
    const cards = page.locator('[data-project] a');
    const moveTo = async index => {
      const box = await cards.nth(index).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    };
    const state = () => page.locator('[data-project-motion]').evaluateAll(elements =>
      elements.map(element => ({
        opacity: +getComputedStyle(element).opacity,
        scale: new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
      })));
    const selected = async index => {
      await page.waitForTimeout(100);
      await page.waitForFunction(index => [...document.querySelectorAll('[data-project-motion]')]
        .every((element, i) => {
          const style = getComputedStyle(element);
          return Math.abs(+style.opacity - (i === index ? 1 : 0.65)) < 0.002 &&
            Math.abs(new DOMMatrixReadOnly(style.transform).a - (i === index ? 1.035 : 1)) < 0.002;
        }), index, { timeout: 5000 });
    };

    await moveTo(0);
    await selected(0);
    await page.evaluate(() => {
      window.workHoverFrames = [];
      window.workHoverSampling = true;
      const sample = () => {
        window.workHoverFrames.push({
          time: performance.now(),
          opacity: [...document.querySelectorAll('[data-project-motion]')]
            .map(element => +getComputedStyle(element).opacity),
        });
        if (window.workHoverSampling) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    for (const index of [1, 2, 3, 0, 2, 1, 3, 0]) {
      await moveTo(index);
      await page.waitForTimeout(90);
    }
    await selected(0);
    const frames = await page.evaluate(() => {
      window.workHoverSampling = false;
      return window.workHoverFrames;
    });
    const jumps = frames.slice(1).map((frame, i) => ({
      delta: Math.max(...frame.opacity.map((value, j) => Math.abs(value - frames[i].opacity[j]))),
      elapsed: frame.time - frames[i].time,
    }));
    const normalFrames = jumps.filter(frame => frame.elapsed < 26);
    results.maxOpacityStep = Math.max(...normalFrames.map(frame => frame.delta));
    assert(results.maxOpacityStep < 0.18, 'Project switching snapped instead of blending');
    const intervals = jumps.map(frame => frame.elapsed).sort((a, b) => a - b);
    results.frameP95 = intervals[Math.floor(intervals.length * 0.95)];
    results.framesOver32ms = intervals.filter(value => value > 32).length;
    results.sampledFrames = frames.length;

    const box = await cards.nth(0).boundingBox();
    checkpoint = 'cursor placement';
    await page.mouse.move(20, 20);
    await page.waitForTimeout(400);
    await page.mouse.move(box.x + 18, box.y + 20);
    await page.waitForTimeout(450);
    const labelOffset = await page.evaluate(({ x, y }) => {
      const network = document.querySelector('[data-network]').getBoundingClientRect();
      const label = document.querySelector('[data-network] > div[aria-hidden="true"]');
      const matrix = new DOMMatrixReadOnly(getComputedStyle(label).transform);
      return Math.hypot(matrix.e - (x - network.left), matrix.f - (y - network.top));
    }, { x: box.x + 18, y: box.y + 20 });
    assert(labelOffset < 2, `Cursor label moved toward the card centre: ${labelOffset}px`);
    results.cursorOffset = labelOffset;

    checkpoint = 'keyboard focus';
    await page.mouse.move(20, 20);
    await cards.nth(0).focus();
    await selected(0);
    await page.keyboard.press('Tab');
    await selected(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    checkpoint = 'reduced motion';
    await page.waitForTimeout(450);
    assert((await state()).every(value => value.opacity === 1 && value.scale === 1),
      'Reduced motion retained a dimmed or enlarged card');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    checkpoint = 'media reentry';
    await page.waitForFunction(() => [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1'));
    await cards.nth(1).focus();
    await selected(1);
    results.keyboardAndMediaReentry = true;

    checkpoint = 'reverse exit';
    await cards.nth(1).evaluate(element => element.blur());
    await page.waitForTimeout(550);
    assert((await state()).every(value => value.opacity === 1 && value.scale === 1),
      'Leaving projects did not restore every card');
    await page.goto(origin + '/work');
    await page.goto(origin + '/#work');
    await page.waitForFunction(() => scrollY === 900 &&
      [...document.querySelectorAll('[data-project]')].every(element => element.style.opacity === '1'));
    await moveTo(0);
    await selected(0);
    await page.keyboard.press('PageUp');
    await page.waitForFunction(() => scrollY === 0);
    await page.waitForFunction(() => Math.abs(new DOMMatrixReadOnly(
      getComputedStyle(document.querySelector('[data-hero-person]')).transform,
    ).a - 1) < 0.0001);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-exit]')]
      .every(element => +getComputedStyle(element).opacity === 1));
    await page.waitForTimeout(2000);
    const leftovers = await page.evaluate(() => ({
      label: +getComputedStyle(document.querySelector('[data-network] > div[aria-hidden="true"]')).opacity,
      nodes: [...document.querySelectorAll('[data-trace-node-active]')]
        .some(element => +getComputedStyle(element).opacity > 0),
    }));
    assert(leftovers.label === 0 && !leftovers.nodes, 'Hover survived the reverse exit to Hero');
    checkpoint = 'forward replay';
    await page.mouse.move(20, 20);
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => scrollY === 900);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-project]')]
      .every(element => element.style.opacity === '1'));
    await moveTo(2);
    await selected(2);
    results.reverseExitAndReturn = true;

    await page.setViewportSize({ width: 390, height: 844 });
    checkpoint = 'narrow layout';
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('#work').scrollIntoViewIfNeeded();
    assert((await state()).every(value => value.opacity === 1 && value.scale === 1),
      'Narrow layout retained hover styling');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Narrow Work layout overflows');
    results.narrowLayout = true;
    assert(!errors.length, `Browser runtime errors: ${errors.join('; ')}`);
    return results;
  } catch (error) {
    throw new Error(`${checkpoint}: ${error.message}`);
  } finally {
    await page.evaluate(() => { window.workHoverSampling = false; });
    page.off('pageerror', onError);
  }
}
