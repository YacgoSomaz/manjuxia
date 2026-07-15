// Materialize browser-generated multipart bodies before the app's signed-fetch
// layer hashes them. FormData itself is not byte-addressable, but Request is.
(function installMultipartFetchBridge() {
  const nativeFetch = window.__manjuxiaNativeFetch || window.fetch.bind(window);
  window.__manjuxiaNativeFetch = nativeFetch;
  window.fetch = async function multipartAwareFetch(input, init) {
    const body = init && init.body;
    if (!(body instanceof FormData)) {
      return nativeFetch(input, init);
    }

    const request = new Request(input, init);
    const bytes = new Uint8Array(await request.arrayBuffer());
    const headers = new Headers(request.headers);
    return nativeFetch(input, { ...init, body: bytes, headers });
  };
})();
