import { useEffect, useState } from "react";
import client from "../api/client";

/**
 * GET a path with query parameters and give back `{loading}`, `{failed, status}` or `{data}`.
 * Changing the path, the parameters or `attempt` starts a fresh load. With `refreshMs` the data is fetched again
 * on that interval while the tab is visible, and the old data stays on screen if a refresh fails.
 */
export function useApi(path, params, { attempt = 0, refreshMs = 0 } = {}) {
  const paramKey = JSON.stringify(params ?? {});
  const key = `${path}|${paramKey}|${attempt}`;
  const [result, setResult] = useState({ key: null });

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      client
        .get(path, { params: JSON.parse(paramKey) })
        .then((res) => {
          if (alive) setResult({ key, data: res.data });
        })
        .catch((error) => {
          if (alive) setResult((previous) => (previous.key === key && previous.data ? previous : { key, failed: true, status: error.response?.status }));
        });
    };
    load();
    const timer = refreshMs ? setInterval(load, refreshMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [key, path, paramKey, refreshMs]);

  return result.key === key ? result : { loading: true };
}
