/** Work mounts before the later stage scenes, so it prepares their shared layout
 * before any cinematic geometry is measured. Without JS, normal flow stays readable. */
export function prepareStageLayout(work: HTMLElement) {
  const root = work.closest<HTMLElement>("[data-experience-root]");
  if (root) root.dataset.cinematic = "true";
  return () => { if (root) delete root.dataset.cinematic; };
}
