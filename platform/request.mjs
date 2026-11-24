// Keep the timeout active until the response body has also arrived.
export async function requestJSON(url, options = {}, {timeoutMs = 0, signal} = {}) {
  const controller = new AbortController();
  let timedOut = false, timer;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, {once: true});
  if (timeoutMs > 0) timer = setTimeout(() => {timedOut = true; abort();}, timeoutMs);
  try {
    const response = await fetch(url, {...options, signal: controller.signal});
    let result;
    try {result = await response.json();}
    catch (error) {
      if (controller.signal.aborted) throw error;
      throw Error('Der Server hat keine lesbare Antwort gesendet. Bitte erneut laden.');
    }
    return {response, result};
  } catch (error) {
    if (timedOut) throw Error('Die Antwort dauert zu lange. Bitte die Verbindung prüfen und erneut laden.');
    if (controller.signal.aborted) throw error;
    if (error instanceof TypeError) throw Error('Der Server ist nicht erreichbar. Bitte die Verbindung prüfen und erneut laden.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
