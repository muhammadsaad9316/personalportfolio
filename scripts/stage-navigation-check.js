// Desktop local site: playwright-cli run-code --filename=scripts/stage-navigation-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const rest = async (band) => {
    await page.waitForFunction((expected) => {
      const stage = document.querySelector("[data-experience-stage]");
      const sticky = document.querySelector("[data-experience-sticky]");
      if (!stage || !sticky) return false;
      const target = stage.offsetTop + (expected - 1) * sticky.offsetHeight;
      if (Math.abs(scrollY - target) > 2) return false;
      const visible = (selector) => {
        const element = document.querySelector(selector);
        return element && element.style.opacity === "1";
      };
      if (expected === 1) return [...document.querySelectorAll("[data-project]")].every((el) => el.style.opacity === "1");
      if (expected <= 4) return visible("[data-cases]") && visible("[data-closing-case]");
      if (expected <= 6) return visible(`[data-closing-panel="${expected === 5 ? "ending" : "contact"}"]`);
      return !document.documentElement.classList.contains("lenis-stopped");
    }, band, { timeout: 12000 }).catch(async () => {
      const position = await page.evaluate(() => ({ y: scrollY, hash: location.hash }));
      throw new Error(`Expected band ${band}; got ${JSON.stringify(position)}`);
    });
  };
  const fresh = async (hash, band) => {
    await page.goto(origin + "/work");
    await page.goto(origin + "/" + hash);
    await rest(band);
  };
  const key = async (name, band) => {
    // The gesture gate deliberately ignores new keys for 140ms after landing.
    await page.waitForTimeout(180);
    await page.keyboard.press(name);
    await rest(band);
  };

  await fresh("#work", 1);
  const chapterIds = await page.locator("[data-case-chapter]").evaluateAll(
    (chapters) => chapters.map((chapter) => chapter.dataset.caseChapter),
  );
  if (chapterIds.join(",") !== "intro,solution,result") {
    throw new Error(`Expected three case slides; got ${chapterIds.join(",")}`);
  }
  await page.locator('#work a[href="/#case-studies"]').click();
  await rest(2);
  await key("PageDown", 3);

  await fresh("#case-studies", 2);
  await key("PageDown", 3);
  await page.reload();
  await rest(3);
  await key("PageDown", 4);
  await page.goto(origin + "/work");
  await page.goBack();
  await rest(4);
  await key("PageUp", 3);

  await page.evaluate(() => { location.hash = "#ending"; });
  await rest(5);
  await page.goBack();
  await rest(2);
  await page.goForward();
  await rest(5);
  await key("PageUp", 4);

  await fresh("#ending", 5);
  await key("PageUp", 4);
  await fresh("#contact", 6);
  await page.waitForTimeout(180);
  await page.keyboard.press("PageDown");
  await page.waitForFunction(() => Math.abs(scrollY - document.querySelector("footer").offsetTop) < 1);
  await page.locator('footer a[href="#work"]').click();
  await rest(1);
  await page.waitForTimeout(700);
  if (!await page.evaluate(() => document.documentElement.classList.contains("lenis-stopped"))) {
    throw new Error("Footer release timer unlocked a newly selected Work beat");
  }
  await key("PageDown", 2);
  await fresh("#contact", 6);
  await key("PageDown", 7);
  await page.locator('footer a[href="#work"]').click();
  await rest(1);
  await key("PageDown", 2);
  await key("PageUp", 1);

  // Leaving cinematic mode must remove every registered beat.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('#work a[href="/#case-studies"]').click();
  await page.waitForFunction(() => Math.abs(document.querySelector("#case-studies").getBoundingClientRect().top) < 2);
  return "Direct links, chapter reload/cross-page history, fragment history, stale-hash navigation, keyboard and reduced-motion cleanup passed.";
}
