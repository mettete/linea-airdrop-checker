import { NextRequest } from "next/server";
import {
  createPublicClient,
  http,
  encodeAbiParameters,
  decodeAbiParameters,
  concatHex,
  isAddress,
  getAddress,
  formatUnits,
} from "viem";


const LINEA_RPC = `https://linea-mainnet.g.alchemy.com/v2/${process.env.INFURA_KEY}` as const;
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;
const TARGET = "0x87bAa1694381aE3eCaE2660d97fe60404080Eb64" as const; // doğru target

const AGGREGATE3_SELECTOR = "0x82ad56cb" as const; // aggregate3
const TARGET_SELECTOR = "0x7debb959" as const;     // view(address)->uint256

const CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type WalletRow = { raw: string; formatted: string; ok: boolean; duplicates: number };
type ApiOut = {
  decimals: number;
  symbol: string;
  totalRaw: string;
  total: string;
  perWallet: Record<string, WalletRow>;
  uniqueCount: number;
  submittedCount: number;
};

type Aggregate3Tuple = { success: boolean; returnData: `0x${string}` };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<{
      addresses: string[];
      decimals: number;
    }>;

    const decimals = typeof body.decimals === "number" ? body.decimals : 18;
    const rawAddrs = Array.isArray(body.addresses) ? body.addresses : [];
    if (rawAddrs.length === 0) {
      return Response.json({ error: "addresses is required (array of 0x...)" }, { status: 400 });
    }

    // normalize + duplicate count
    const dupCount: Record<string, number> = {};
    const unique: `0x${string}`[] = [];
    for (const r of rawAddrs) {
      const s = String(r).trim();
      if (!isAddress(s)) {
        return Response.json({ error: `Invalid address: ${s}` }, { status: 400 });
      }
      const a = getAddress(s);
      dupCount[a] = (dupCount[a] ?? 0) + 1;
      if (dupCount[a] === 1) unique.push(a);
    }

    const client = createPublicClient({ transport: http(LINEA_RPC) });

    let total = 0n;
    const perWallet: Record<string, WalletRow> = {};

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
            { name: "callData", type: "bytes" },
          ],
        }],
        [calls],
      );

      const data = concatHex([AGGREGATE3_SELECTOR, params]);

      const result = await client.request({
        method: "eth_call",
        params: [{ to: MULTICALL3, data }, "latest"],
      }) as `0x${string}`;

      // (bool success, bytes returnData)[]
      const decoded = decodeAbiParameters(
        [{
          name: "returnData",
          type: "tuple[]",
          components: [
            { name: "success", type: "bool" },
            { name: "returnData", type: "bytes" },
          ],
        }],
        result
      );
      const tuples = decoded[0] as Aggregate3Tuple[];

      tuples.forEach((t, i) => {
        const addr = group[i];
        let amount = 0n;
        if (t.success && t.returnData !== "0x") {
          const u = decodeAbiParameters([{ type: "uint256" }], t.returnData)[0] as bigint;
          amount = u ?? 0n;
        }
        total += amount;
        perWallet[addr] = {
          raw: amount.toString(),
          formatted: formatUnits(amount, decimals),
          ok: amount > 0n,
          duplicates: dupCount[addr] ?? 1,
        };
      });
    }

    const payload: ApiOut = {
      decimals,
      symbol: "LINEA",
      totalRaw: total.toString(),
      total: formatUnits(total, decimals),
      perWallet,
      uniqueCount: unique.length,
      submittedCount: rawAddrs.length,
    };

    return Response.json(payload);
  } catch (err: unknown) {
    return Response.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}