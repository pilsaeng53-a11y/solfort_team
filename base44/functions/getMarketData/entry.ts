Deno.serve(async (req) => {
  const TIMEOUT = 5000;

  const fetchWithTimeout = async (url, timeout) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  // Source 1: fawazahmed0 currency API
  try {
    const res = await fetchWithTimeout(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      TIMEOUT
    );
    if (res.ok) {
      const data = await res.json();
      const krwRate = data?.usd?.krw;
      if (krwRate && krwRate > 0) {
        return Response.json({ usdt_krw: Math.round(krwRate * 100) / 100, source: "fawazahmed0" });
      }
    }
  } catch (e) {
    // fallthrough
  }

  // Source 2: Upbit API
  try {
    const res = await fetchWithTimeout(
      "https://api.upbit.com/v1/ticker?markets=USDT-KRW",
      TIMEOUT
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].trade_price) {
        return Response.json({ usdt_krw: data[0].trade_price, source: "upbit" });
      }
    }
  } catch (e) {
    // fallthrough
  }

  // Fallback
  return Response.json({ usdt_krw: 1500, source: "fallback" });
});