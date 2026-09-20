let counter = 0;

export const jsonp = <T>(url: string, timeoutMs = 10000): Promise<T> =>
  new Promise((resolve, reject) => {
    const callbackName = `__spotifun_jsonp_${Date.now()}_${counter++}`;
    const script = document.createElement("script");
    let timer: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timer);
      delete (window as any)[callbackName];
      script.remove();
    };

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`JSONP request failed: ${url}`));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`JSONP request timed out: ${url}`));
    }, timeoutMs);

    script.src = `${url}${
      url.includes("?") ? "&" : "?"
    }output=jsonp&callback=${callbackName}`;
    document.head.appendChild(script);
  });
