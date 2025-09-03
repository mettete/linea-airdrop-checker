import { NextRequest } from "next/server";
import {
  createPublicClient, http,
  encodeAbiParameters, decodeAbiParameters, concatHex,
  isAddress, getAddress, formatUnits,
} from "viem";

const LINEA_RPC = `https://linea-mainnet.g.alchemy.com/v2/${process.env.INFURA_KEY}` as const;
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

// ✅ Linea sitesindeki doğru target (senin logundan)
const TARGET = "0x87bAa1694381aE3eCaE2660d97fe60404080Eb64" as const;

// aggregate3 selector
const AGGREGATE3_SELECTOR = "0x82ad56cb" as const;
// view fonksiyon selector (addr -> uint256)
const TARGET_SELECTOR = "0x7debb959" as const;

const CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const decimals = typeof body.decimals === "number" ? body.decimals : 18;

    const rawAddrs: string[] = Array.isArray(body.addresses) ? body.addresses : [];
    if (!rawAddrs.length) {
      return Response.json({ error: "addresses is required (array of 0x...)" }, { status: 400 });
    }

    // 1) Temizle + doğrula + normalize + DUPLICATE SAYIMI
    const dupCount: Record<string, number> = {};
    const unique: `0x${string}`[] = [];

    for (const r of rawAddrs) {
      const s = String(r).trim();
      if (!isAddress(s)) return Response.json({ error: `Invalid address: ${s}` }, { status: 400 });
      const a = getAddress(s);
      dupCount[a] = (dupCount[a] ?? 0) + 1;
      if (dupCount[a] === 1) unique.push(a); // sadece ilk kez göründüğünde ekle
    }

    const client = createPublicClient({ transport: http(LINEA_RPC) });

    let total = 0n;
    const perWallet: Record<string, { raw: string; formatted: string; ok: boolean; duplicates: number }> = {};

    // 2) Sadece UNIQUE adreslere çağrı yap → toplam **artmaz**
    for (const group of chunk(unique, CHUNK_SIZE)) {
      const calls = group.map((addr) => {
        const encodedArg = encodeAbiParameters([{ type: "address" }], [addr]);
        const callData = concatHex([TARGET_SELECTOR, encodedArg]);
        return { target: TARGET, allowFailure: true, callData };
      });

      const params = encodeAbiParameters(
        [{
          name: "calls",
          type: "tuple[]",
          components: [
            { name: "target", type: "address" },
            { name: "allowFailure", type: "bool" },
            { name: "callData", type: "bytes"  },
          ],
        }],
        [calls],
      );

      const data = concatHex([AGGREGATE3_SELECTOR, params]);

      const result: `0x${string}` = await client.request({
        method: "eth_call",
        params: [{ to: MULTICALL3, data }, "latest"],
      });

      const [tuples] = decodeAbiParameters(
        [{
          name: "returnData",
          type: "tuple[]",
          components: [
            { name: "success", type: "bool" },
            { name: "returnData", type: "bytes" },
          ],
        }],
        result
      ) as [{ success: boolean; returnData: `0x${string}` }[]];

      tuples.forEach((t, i) => {
        const addr = group[i];
        let amount = 0n;
        if (t.success && t.returnData !== "0x") {
          const [u256] = decodeAbiParameters([{ type: "uint256" }], t.returnData) as [bigint];
          amount = u256 ?? 0n;
        }
        total += amount; // yalnızca unique’lerin toplamı
        perWallet[addr] = {
          raw: amount.toString(),
          formatted: formatUnits(amount, decimals),
          ok: amount > 0n,
          duplicates: dupCount[addr] ?? 1,
        };
      });
    }

    return Response.json({
      decimals,
      symbol: "LINEA",
      totalRaw: total.toString(),
      total: formatUnits(total, decimals),
      perWallet,                   // yalnızca UNIQUE adresler var
      uniqueCount: unique.length,  // kaç unique adres sorgulandı
      submittedCount: rawAddrs.length, // kullanıcı kaç satır gönderdi
    });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
