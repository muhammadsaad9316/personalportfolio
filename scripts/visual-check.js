// Local site: playwright-cli run-code --filename=scripts/visual-check.js
async (page) => {
  const origin = await page.evaluate(() => location.origin);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(origin + "/work");
  await page.goto(origin + "/#work");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-project]")]
    .every((el) => el.style.opacity === "1"));
  await page.mouse.move(20, 20);
  const frame = page.locator("[data-flight-frame]");
  const original = await frame.boundingBox();
  await frame.hover();
  await page.waitForTimeout(700);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(2800);
  const covers = await page.evaluate(() => {
    const frame = document.querySelector("[data-flight-frame]").getBoundingClientRect();
    const slot = document.querySelector("[data-case-slot]").getBoundingClientRect();
    return frame.left <= slot.left && frame.top <= slot.top &&
      frame.right >= slot.right && frame.bottom >= slot.bottom;
  });
  if (!covers) throw new Error("Hovered preview leaves an exposed edge at case landing");
  await page.mouse.move(20, 20);
  await page.keyboard.press("PageUp");
  await page.waitForTimeout(2800);
  const returned = await frame.boundingBox();
  if (["x", "y", "width", "height"].some((key) => Math.abs(original[key] - returned[key]) > 1)) {
    throw new Error("Reverse did not restore the original Work frame");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    const clipped = await page.evaluate(() =>
      document.documentElement.scrollWidth > innerWidth ||
      [...document.querySelectorAll("[data-line], [data-code-line], [data-case-chapter]")]
        .some((el) => el.scrollWidth > el.clientWidth + 1));
    if (clipped) throw new Error(`Clipped text at ${width}px`);
  }
  return "Hovered flight covers the case slot; reverse within 1px; no clipped text at 320/390/768/1024px.";
}
