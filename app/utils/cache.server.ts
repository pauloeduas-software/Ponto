import { LRUCache } from "lru-cache";

// Cache global no lado do servidor para manter dados pesados na memória
// Configurado para armazenar no máximo 100 itens (ex: consultas de meses diferentes)
// e cada item expira após 5 minutos.
export const cache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 minutos
});

export async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

export function invalidateCache() {
  cache.clear();
}

