(function () {
  // Asset generation polls the backend in the background. Element Plus adds a
  // page-level loading mask during the refresh; keep that mask from blocking
  // the cards and the other tabs while generation is still running.
  const CLASS_NAME = "wanshan-image-generation-active";
  const MASK_SELECTOR = ".el-loading-mask";

  function generationIsActive() {
    return Boolean(document.querySelector(
      ".image-placeholder.generating, .cvd-loading-overlay, .element-image-section .el-button.is-loading"
    ));
  }

  function sync() {
    const active = generationIsActive();
    document.documentElement.classList.toggle(CLASS_NAME, active);
    document.body && document.body.classList.toggle(CLASS_NAME, active);
    document.querySelectorAll(MASK_SELECTOR).forEach((mask) => {
      const inWorkbench = Boolean(mask.closest(".page-container, .main-content, #app"));
      if (!inWorkbench) return;
      if (active) {
        if (!mask.dataset.wanshanDisplay) mask.dataset.wanshanDisplay = mask.style.display || "";
        if (mask.style.display !== "none") mask.style.setProperty("display", "none", "important");
        if (mask.style.pointerEvents !== "none") mask.style.setProperty("pointer-events", "none", "important");
      } else if (mask.dataset.wanshanDisplay !== undefined) {
        mask.style.display = mask.dataset.wanshanDisplay;
        mask.style.removeProperty("pointer-events");
        delete mask.dataset.wanshanDisplay;
      }
    });
  }

  const observer = new MutationObserver(sync);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    sync();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
