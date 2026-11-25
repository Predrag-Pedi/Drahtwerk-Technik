// Offers load independently of the article catalogue. A failed/incomplete read
// must never be treated as an empty collection that can overwrite saved work.
export function offerCollection({read, write}) {
  let documents = [], ready = false, loading, queue = Promise.resolve(), pending = 0;
  const requireReady = () => {
    if (!ready) throw Error('Die Offerten sind noch nicht geladen. Bitte zuerst erneut laden.');
  };
  return {
    get documents() { return documents; },
    get ready() { return ready; },
    get pending() { return pending; },
    async load() {
      if (ready) return documents;
      if (loading) return loading;
      loading = (async () => {
        const value = await read();
        const next = value === undefined ? [] : value;
        if (!Array.isArray(next) || next.some(d => !d || typeof d.id !== 'string' || !Array.isArray(d.plants) || !d.plants.length || d.plants.some(p => !p || !Array.isArray(p.parts) || !p.parts.length || p.parts.some(s => !s || !Array.isArray(s.items))))) {
          throw Error('Die gespeicherten Offerten konnten nicht vollständig gelesen werden. Bestehende Daten bleiben erhalten.');
        }
        documents = next;
        ready = true;
        return documents;
      })();
      try { return await loading; } finally { loading = undefined; }
    },
    add(document) {
      requireReady();
      if (documents.some(d => d.id === document.id)) throw Error('Diese Offerte ist bereits vorhanden.');
      documents.push(document);
    },
    remove(id) {
      requireReady();
      documents = documents.filter(d => d.id !== id);
    },
    save() {
      requireReady();
      const snapshot = structuredClone(documents);
      pending++;
      const saving = queue.catch(() => {}).then(() => write(snapshot));
      queue = saving;
      return saving.finally(() => { pending--; });
    }
  };
}
