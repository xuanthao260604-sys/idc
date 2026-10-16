import { createHmac, randomBytes } from 'node:crypto';

/** Server-owned deterministic stream. Never pass its seed/state to a client. */
export function createRandom(duelId: string, seedHex = randomBytes(32).toString('hex')) {
  if (!/^[a-f0-9]{64}$/.test(seedHex)) throw new Error('Random seed must be 32 bytes of hex');
  let counter = 0;
  const int = (upper: number) => {
    if (!Number.isSafeInteger(upper) || upper < 1 || upper > 0x100000000) throw new Error('Invalid random range');
    const limit = Math.floor(0x100000000 / upper) * upper;
    for (;;) {
      const value = createHmac('sha256', Buffer.from(seedHex, 'hex')).update(`${duelId}:${counter++}`).digest().readUInt32BE(0);
      if (value < limit) return value % upper;
    }
  };
  return {
    int,
    shuffle<T>(items: readonly T[]) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    },
    state: () => ({ algorithm: 'hmac-sha256-counter-v1', privateState: JSON.stringify({ seedHex, counter }) }),
  };
}
