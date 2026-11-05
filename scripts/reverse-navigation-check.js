// Local site: playwright-cli run-code --filename=scripts/reverse-navigation-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on("pageerror", onError);

  const rest = (y) => page.waitForFunction(
    (expected) => Math.abs(scrollY - expected) < 1,
    y,
    { timeout: 7000 },
  ).catch(() => { throw new Error(`Did not reach reverse rest ${y}`); });
  const up = async (y) => {
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, -1000);
    await rest(y);
  };

  try {
    await page.bringToFront();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(origin + "/work");
    await page.goto(origin + "/#contact");
    await rest(5400);
    await page.waitForTimeout(800);

    // Native scrollbar movement can reverse the page while the footer glide is held.
    await page.mouse.wheel(0, 1000);
    await page.waitForFunction(() => scrollY > 5500);
    await page.evaluate(() => scrollTo(0, 5200));
    await rest(5400);
    await up(4500);

    for (const y of [3600, 2700, 1800, 900, 0]) await up(y);
    const heroVisible = await page.locator("[data-hero-root]").evaluate(
      (hero) => getComputedStyle(hero.parentElement).visibility === "visible",
    );
    if (!heroVisible) throw new Error("Reverse returned to a hidden Hero");

    await page.waitForFunction(() =>
      Math.abs(new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-hero-person]')).transform).a - 1) < 0.0001 &&
      [...document.querySelectorAll('[data-exit]')].every(element => +getComputedStyle(element).opacity === 1));
    await page.waitForTimeout(2000);
    await page.mouse.wheel(0, 1000);
    await rest(900);
    await page.waitForFunction(() => [...document.querySelectorAll("[data-project]")]
      .every((card) => card.style.opacity === "1"));
    if (errors.length) throw new Error(errors.join("\n"));

    return "Interrupted footer glide recovers; full upward wheel sequence reaches Hero; forward replay reaches Work; no runtime errors.";
  } finally {
    page.off("pageerror", onError);
  }
}
