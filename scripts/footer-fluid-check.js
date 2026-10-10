// Chromium local site: playwright-cli run-code --filename=scripts/footer-fluid-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const results = {};
  const errors = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const publish = () => page.evaluate((value) => { window.__footerQAChecks = value; }, results);
  page.on("pageerror", (error) => errors.push(error.message));
  const openFooter = async (target) => {
    await target.goto(origin + "/#footer", { waitUntil: "load" });
    await target.evaluate(() => document.fonts.ready);
    await target.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await target.waitForFunction(() => document.querySelector("[data-footer-fluid]")?.dataset.fluidState);
    await target.evaluate(() => window.scrollTo(0, document.querySelector("#footer").offsetTop));
    await target.waitForFunction(() => [...document.querySelectorAll("#footer [data-footer-col]")]
      .every((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true })));
  };
  const snapshot = (target) => target.evaluate(() => {
    const canvas = document.querySelector("[data-footer-fluid]");
    const content = document.querySelector("[data-footer-content]");
    return { state: canvas.dataset.fluidState, frames: Number(canvas.dataset.fluidFrames),
      resolution: canvas.dataset.fluidResolution, backing: [canvas.width, canvas.height],
      deforming: canvas.dataset.fluidDeforming, filter: content.style.filter,
      mapResolution: canvas.dataset.fluidMapResolution, mapMs: canvas.dataset.fluidMapMs,
      display: getComputedStyle(canvas).display, pointerEvents: getComputedStyle(canvas).pointerEvents,
      canvasCount: document.querySelectorAll("[data-footer-fluid]").length,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  const wake = async (target) => {
    await target.evaluate(() => document.activeElement?.blur());
    const before = (await snapshot(target)).frames;
    const box = await target.locator("#footer").boundingBox();
    await target.mouse.move(box.x + 80, Math.max(20, box.y + 100));
    await target.mouse.move(box.x + 220, Math.max(20, box.y + 150), { steps: 8 });
    await target.waitForFunction((previous) => Number(document.querySelector("[data-footer-fluid]").dataset.fluidFrames) > previous, before);
    await target.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidDeforming === "true"
      && document.querySelector("[data-footer-content]").style.filter.startsWith("url("));
  };
  const frozen = async (target) => {
    const before = (await snapshot(target)).frames;
    await target.waitForTimeout(350);
    assert((await snapshot(target)).frames === before, "Fluid frames continued while paused");
    return before;
  };
  const unwarped = (value, reason) => assert(!value.filter && value.deforming !== "true", `Content retained its filter during ${reason}`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin + "/work");
  await openFooter(page);
  results.initialReduced = await snapshot(page);
  assert(results.initialReduced.state === "reduced-motion" && results.initialReduced.frames === 0 && results.initialReduced.display === "none", "Initial reduced motion rendered fluid");
  unwarped(results.initialReduced, "initial reduced motion");
  await frozen(page);
  const footerLinks = page.locator("#footer a, #footer button");
  await footerLinks.first().focus();
  results.keyboardOrder = [];
  for (let index = 0; index < await footerLinks.count(); index++) {
    results.keyboardOrder.push(await page.evaluate(() => document.activeElement.textContent.trim()));
    if (index + 1 < await footerLinks.count()) await page.keyboard.press("Tab");
  }
  assert(results.keyboardOrder.join("|") === "Work|Case Studies|Contact|LinkedIn|GitHub|Email|Back to top", "Footer tab order changed");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => scrollY < 2);
  results.keyboardBackToTop = await page.evaluate(() => scrollY);
  await publish();

  await openFooter(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle");
  await page.waitForFunction(() => [...document.querySelectorAll("#footer [data-footer-col]")].every((el) => el.style.opacity === "1"));
  const hitboxes = () => page.evaluate(() => [...document.querySelectorAll("#footer a, #footer button")].map((el) => {
    const box = el.getBoundingClientRect(); return [box.x, box.y, box.width, box.height];
  }));
  const restingBoxes = await hitboxes();
  await wake(page);
  results.running = await snapshot(page);
  const warpedBoxes = await hitboxes();
  results.hitboxMaxDelta = Math.max(...restingBoxes.flatMap((box, i) => box.map((value, j) => Math.abs(value - warpedBoxes[i][j]))));
  assert(results.hitboxMaxDelta < 0.5, "Liquid deformation changed native link/button geometry");
  assert(results.running.pointerEvents === "none" && results.running.canvasCount === 1 && !results.running.overflow, "Canvas obstructs the footer layout");
  await publish();
  await page.evaluate(() => {
    const canvas = document.querySelector("[data-footer-fluid]");
    window.__footerLossExtension = canvas.getContext("webgl2").getExtension("WEBGL_lose_context");
    if (!window.__footerLossExtension) throw new Error("Context-loss extension unavailable");
    window.__footerLossExtension.loseContext();
  });
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "context-lost");
  results.contextLost = await snapshot(page);
  unwarped(results.contextLost, "context loss");
  await frozen(page);
  assert(await page.locator("#footer a").first().isVisible(), "Context loss hid footer navigation");
  await page.evaluate(() => window.__footerLossExtension.restoreContext());
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle");
  await wake(page);
  results.contextRestored = await snapshot(page);
  await publish();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "reduced-motion");
  results.liveReduced = await snapshot(page);
  unwarped(results.liveReduced, "live reduced motion");
  await frozen(page);
  await publish();

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle");
  await wake(page);
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle", null, { timeout: 12000 });
  results.idle = await snapshot(page);
  unwarped(results.idle, "idle settling");
  await frozen(page);
  await wake(page);
  await page.locator("#footer a").first().focus();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "keyboard");
  results.keyboardStatic = await snapshot(page);
  unwarped(results.keyboardStatic, "keyboard focus");
  await frozen(page);
  await page.locator('#footer button[aria-label="Back to top"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => scrollY < 2);
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "offscreen");
  results.offscreen = await snapshot(page);
  unwarped(results.offscreen, "offscreen pause");
  await frozen(page);
  await publish();
  await page.evaluate(() => {
    window.__retiredFooterCanvas = document.querySelector("[data-footer-fluid]");
    window.__retiredFooterContent = document.querySelector("[data-footer-content]");
    window.next.router.push("/work");
  });
  await page.waitForFunction(() => location.pathname === "/work" && !document.querySelector("[data-footer-fluid]"));
  results.unmount = await page.evaluate(() => ({ state: window.__retiredFooterCanvas.dataset.fluidState, connected: window.__retiredFooterCanvas.isConnected, frames: window.__retiredFooterCanvas.dataset.fluidFrames, deforming: window.__retiredFooterCanvas.dataset.fluidDeforming, filter: window.__retiredFooterContent.style.filter }));
  assert(results.unmount.state === "disposed" && !results.unmount.connected, "Fluid effect did not clean up on React route unmount");
  unwarped(results.unmount, "React unmount");
  await page.evaluate(() => window.next.router.push("/#footer"));
  await page.waitForSelector("[data-footer-fluid]");
  await page.evaluate(() => window.scrollTo(0, document.querySelector("#footer").offsetTop));
  await page.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle");
  results.remount = await snapshot(page);
  assert(results.remount.canvasCount === 1 && results.remount.frames === 0, "Fluid remount retained duplicate canvases or frames");
  await publish();

  results.keyboardRoutes = [];
  for (const [name, offset] of [["Work", 0], ["Case Studies", 1], ["Contact", 5]]) {
    await openFooter(page);
    await page.locator("#footer").getByRole("link", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction((band) => {
      const stage = document.querySelector("[data-experience-stage]");
      const sticky = document.querySelector("[data-experience-sticky]");
      return Math.abs(scrollY - (stage.offsetTop + band * sticky.offsetHeight)) < 2;
    }, offset);
    results.keyboardRoutes.push({ name, y: await page.evaluate(() => scrollY) });
    await publish();
  }

  const browser = page.context().browser();
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const touchPage = await touchContext.newPage();
  touchPage.on("pageerror", (error) => errors.push(error.message));
  const cdp = await touchContext.newCDPSession(touchPage);
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await openFooter(touchPage);
  await touchPage.evaluate(() => window.scrollTo(0, document.querySelector("#footer").offsetTop - 100));
  await touchPage.waitForFunction(() => document.querySelector("[data-footer-fluid]").dataset.fluidState === "idle");
  const startY = await touchPage.evaluate(() => scrollY);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 35, y: 600 }] });
  for (let y = 580; y >= 400; y -= 20) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 35, y }] });
    await touchPage.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await touchPage.waitForTimeout(900);
  results.touch = { ...(await snapshot(touchPage)), scrollDelta: await touchPage.evaluate((initial) => scrollY - initial, startY) };
  assert(results.touch.scrollDelta > 20 && results.touch.frames > 0 && results.touch.pointerEvents === "none" && !results.touch.overflow, "Touch interaction blocked scrolling or failed to render");
  assert(results.touch.deforming === "true" && results.touch.filter.startsWith("url("), "Native touch did not warp the content");
  await touchPage.locator('#footer button[aria-label="Back to top"]').tap();
  await touchPage.waitForFunction(() => scrollY < 2);
  results.touchBackToTop = await touchPage.evaluate(() => scrollY);
  await publish();
  await touchContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
      return kind === "webgl2" ? null : original.call(this, kind, ...options);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  fallbackPage.on("pageerror", (error) => errors.push(error.message));
  await openFooter(fallbackPage);
  results.unsupported = await snapshot(fallbackPage);
  assert(results.unsupported.state === "unsupported" && results.unsupported.frames === 0 && await fallbackPage.locator("#footer a").first().isVisible(), "Unsupported WebGL lost the static footer");
  unwarped(results.unsupported, "unsupported WebGL");
  await frozen(fallbackPage);
  await fallbackContext.close();
  assert(!errors.length, `Browser errors: ${errors.join("; ")}`);
  results.browserErrors = errors;
  await publish();
  return results;
}
