(function installWanshanRouteContract() {
  if (window.wanshanRoute) return;

  const ROUTES = new Set(["novels", "scripts", "extraction", "storyboards", "video", "extra-tools", "settings"]);

  function current() {
    const raw = `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`;
    const match = raw.match(/(?:^|[\\/#])(?:wanshan|manjuxia)?[\\/]?(novels|scripts|extraction|storyboards|video|extra-tools|settings)(?:[/?#]|$)/i);
    return match && ROUTES.has(match[1].toLowerCase()) ? match[1].toLowerCase() : "";
  }

  function is(route) {
    return current() === route;
  }

  function watch(callback) {
    let last = current();
    const check = () => {
      const next = current();
      if (next === last) return;
      last = next;
      callback(next);
    };
    const timer = window.setInterval(check, 300);
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }

  window.wanshanRoute = Object.freeze({ current, is, watch });
})();
