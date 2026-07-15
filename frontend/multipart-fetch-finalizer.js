// Materialize multipart bodies after the signed fetch wrapper is installed.
(function installSignedMultipartAdapter() {
  function install() {
    if (window.__manjuxiaSignedMultipartAdapter) return;
    const signedFetch = window.fetch.bind(window);
    window.fetch = async function signedMultipartFetch(input, init) {
      const body = init && init.body;
      if (!(body instanceof FormData)) return signedFetch(input, init);
      const request = new Request(input, init);
      const bytes = new Uint8Array(await request.arrayBuffer());
      return signedFetch(input, {
        ...init,
        body: bytes,
        headers: new Headers(request.headers),
      });
    };
    window.__manjuxiaSignedMultipartAdapter = true;
  }

  if (document.readyState === "complete") install();
  else window.addEventListener("load", install, { once: true });
})();
