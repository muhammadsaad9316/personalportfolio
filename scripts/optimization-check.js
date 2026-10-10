// Run against the local production build with playwright-cli run-code --filename=...
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const results = {};
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin + '/work');
  await page.goto(origin + '/#work');
  await page.waitForFunction(() => scrollY === document.querySelector('[data-experience-stage]').offsetTop);
  await page.waitForTimeout(300);
  for (const band of [0.5, 1.5, 2.5, 3.5, 4.5]) {
    await page.evaluate(value => {
      const stage = document.querySelector('[data-experience-stage]');
      scrollTo(0, stage.offsetTop + value * document.querySelector('[data-experience-sticky]').offsetHeight);
    }, band);
    await page.waitForFunction(value => {
      const stage = document.querySelector('[data-experience-stage]');
      const step = document.querySelector('[data-experience-sticky]').offsetHeight;
      return Math.abs(scrollY - stage.offsetTop - Math.round(value) * step) < 1;
    }, band);
  }
  await page.waitForTimeout(200);
  await page.keyboard.press('PageUp');
  await page.waitForFunction(() => scrollY === 4500);
  results.arbitraryScrollRecovery = true;

  await page.goto(origin + '/work');
  await page.goto(origin + '/#footer');
  await page.evaluate(() => scrollTo(0, document.querySelector('#footer').offsetTop));
  await page.waitForTimeout(400);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => Math.abs(document.querySelector('#footer').getBoundingClientRect().top) < 2);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => Math.abs(document.querySelector('#footer').getBoundingClientRect().top) < 2);
  results.modeRestoration = true;
  assert(await page.evaluate(() => !document.querySelector('main footer')), 'Global footer must be outside main');

  const browser = page.context().browser();
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await touch.newPage();
  const cdp = await touch.newCDPSession(phone);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const errors = [];
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(origin);
  await phone.waitForTimeout(1800);
  results.mobileRequests = await phone.evaluate(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/_next/image')).map(entry => entry.name));
  assert(results.mobileRequests.every(url => !url.includes('05-arrival') && !url.includes('03-expenses')), 'Phone eagerly downloaded later desktop screenshots');
  const portrait = results.mobileRequests.filter(url => url.includes('hero-saad'));
  assert(portrait.length === 1 && portrait[0].includes('q=75'), 'Phone fetched the wrong or duplicate portrait variants');
  const branch = results.mobileRequests.filter(url => url.includes('01-branch'));
  assert(branch.length <= 1, 'Duplicate branch overview downloaded');
  await phone.locator('#footer').scrollIntoViewIfNeeded();
  await phone.waitForTimeout(400);
  results.offscreenHeroMutations = await phone.evaluate(async () => {
    let changes = 0;
    const observer = new MutationObserver(list => changes += list.length);
    observer.observe(document.querySelector('[data-hero-root]'), { subtree: true, attributes: true, characterData: true, childList: true });
    await new Promise(resolve => setTimeout(resolve, 800));
    observer.disconnect();
    return changes;
  });
  assert(results.offscreenHeroMutations === 0, 'Mobile offscreen hero is still animating');
  await phone.locator('#case-studies').scrollIntoViewIfNeeded();
  const enlarge = phone.getByRole('link', { name: /^View full screenshot ↗:/ }).first();
  assert(await enlarge.isVisible() && await enlarge.getAttribute('target') === '_blank', 'Screenshot enlargement is unavailable');
  assert(!errors.length, errors.join('; '));
  await touch.close();

  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const staticPage = await staticContext.newPage();
  const staticCdp = await staticContext.newCDPSession(staticPage);
  await staticCdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await staticPage.goto(origin);
  const chapters = await staticPage.locator('[data-case-chapter]').evaluateAll(nodes => nodes.map(node => ({ top: node.getBoundingClientRect().top, bottom: node.getBoundingClientRect().bottom, visible: node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) })));
  assert(chapters.length === 3 && chapters.every(node => node.visible), 'No-JS case content is hidden');
  assert(chapters.slice(1).every((node, index) => node.top >= chapters[index].bottom), 'No-JS chapters overlap');
  for (const selector of ['#ending h2', '#contact h2', '#footer h2']) assert(await staticPage.locator(selector).first().isVisible(), `${selector} hidden without JS`);
  assert(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No-JS layout overflow');
  results.noJs = true;
  await staticContext.close();
  return results;
}
