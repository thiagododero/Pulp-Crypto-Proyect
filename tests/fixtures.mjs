/** Deterministic remote-service fixtures for tests ONLY. Never imported by the production server. */
import { generateKeyPairSync, sign } from 'node:crypto';
import { PROGRAM, MINT, GENESIS, b58encode, b58decode, compileLegacy, withSignature, parseTransaction, from64, to64, concat, u64 } from '../shared/solana.mjs';
import { ata, transferSol } from '../server/builders.mjs';
import { EARN_PROGRAM } from '../server/validate-earn.mjs';
export function identity() { const { publicKey, privateKey } = generateKeyPairSync('ed25519'); return { owner: b58encode(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)), privateKey, sign: bytes => new Uint8Array(sign(null, bytes, privateKey)) }; }
export const TEST_MINT = b58encode(Uint8Array.from({ length: 32 }, (_, i) => i + 12));
export const BLOCKHASH = b58encode(Uint8Array.from({ length: 32 }, (_, i) => i + 1));
export const ROUTER = b58encode(Uint8Array.from({ length: 32 }, (_, i) => i + 50));
export function makeFixtures({ owner = identity().owner } = {}) {
    const calls = [];
    const control = { owner, sol: 10000000000, usdc: '250000000', genesis: GENESIS.mainnet, network: 'mainnet', simulateError: null, sendError: false, txStatus: 'confirmed', blockValid: true, quotePatch: {}, rateLimit: false, missingPrice: false, badJupiter: false, lookup: false };
    const result = v => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
    const mintInfo = (mint) => ({ value: { owner: PROGRAM.token, lamports: 1461600, data: { parsed: { type: 'mint', info: { decimals: mint === MINT.SOL ? 9 : 6, supply: '1000000000000', mintAuthority: null, freezeAuthority: null } } } } });
    function earnBytes(owner, action, amount) {
        const deposit = action === 'deposit';
        const underlying = ata(owner, MINT.USDC), shares = ata(owner, TEST_MINT);
        const program = 'jupeiUmn818Jg1ekPURTpr4mFo29p46vygyykFJ3wZC';
        const keys = deposit ? [owner, underlying, shares, MINT.USDC, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, program, TEST_MINT, PROGRAM.token, PROGRAM.ata, PROGRAM.system] : [owner, shares, underlying, TEST_MINT, TEST_MINT, MINT.USDC, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, TEST_MINT, EARN_PROGRAM, TEST_MINT, program, TEST_MINT, PROGRAM.token, PROGRAM.ata, PROGRAM.system];
        const ix = { program: EARN_PROGRAM, keys: keys.map((key, i) => ({ key, signer: i === 0, writable: i < 3 })), data: concat(Uint8Array.from(deposit ? [242, 35, 198, 137, 82, 225, 242, 182] : [183, 18, 70, 156, 148, 109, 161, 34]), u64(amount)) };
        return compileLegacy({ payer: owner, blockhash: BLOCKHASH, instructions: [ix] });
    }
    const fetchImpl = async (url, options = {}) => {
        const u = new URL(url), body = options.body ? JSON.parse(options.body) : {};
        calls.push({ url: u.href, method: options.method || 'GET', body, headers: options.headers });
        if (u.hostname === 'api.jup.ag') {
            if (control.rateLimit)
                return new Response('{}', { status: 429 });
            if (control.badJupiter)
                return new Response('{}', { status: 401 });
            if (u.pathname === '/price/v3')
                return result(control.missingPrice ? {} : Object.fromEntries((u.searchParams.get('ids') || '').split(',').map(m => [m, { usdPrice: m === MINT.SOL ? 150 : 1, decimals: m === MINT.SOL ? 9 : 6, blockId: 100 }])));
            if (u.pathname === '/tokens/v2/search')
                return result([{ id: MINT.SOL, symbol: 'SOL', name: 'Solana', decimals: 9, isVerified: true }, { id: MINT.USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6, isVerified: true }]);
            if (u.pathname === '/swap/v2/order') {
                const wallet = u.searchParams.get('taker'), inputMint = u.searchParams.get('inputMint'), outputMint = u.searchParams.get('outputMint'), amount = u.searchParams.get('amount');
                const raw = compileLegacy({ payer: wallet, blockhash: BLOCKHASH, instructions: [{ program: ROUTER, keys: [{ key: wallet, signer: true, writable: true }, { key: inputMint, signer: false, writable: false }, { key: outputMint, signer: false, writable: false }], data: u64(amount) }] });
                return result({ inputMint, outputMint, inAmount: amount, outAmount: outputMint === MINT.USDC ? '15000000' : '100000000', otherAmountThreshold: outputMint === MINT.USDC ? '14925000' : '99500000', swapMode: 'ExactIn', slippageBps: Number(u.searchParams.get('slippageBps')), priceImpact: .01, routePlan: [{ swapInfo: { label: 'TEST FIXTURE' } }], feeBps: 0, signatureFeeLamports: 5000, prioritizationFeeLamports: 0, rentFeeLamports: 0, router: 'test-only', transaction: to64(raw), taker: wallet, requestId: 'test-order', lastValidBlockHeight: '1150', ...control.quotePatch });
            }
            if (u.pathname === '/swap/v2/execute') {
                if (control.sendError)
                    throw Error('test timeout');
                return result({ status: 'Success', signature: b58encode(parseTransaction(from64(body.signedTransaction)).signatures[0]), slot: '1000' });
            }
            if (u.pathname === '/lend/v1/earn/tokens')
                return result([{ id: TEST_MINT, address: TEST_MINT, assetAddress: MINT.USDC, name: 'USDC Earn', symbol: 'fUSDC', decimals: 6, asset: { address: MINT.USDC, symbol: 'USDC', name: 'USD Coin', decimals: 6 }, totalRate: '350', supplyRate: '300', rewardsRate: '50', totalAssets: '5000000000' }]);
            if (u.pathname === '/lend/v1/earn/positions')
                return result([{ ownerAddress: u.searchParams.get('users'), token: { id: TEST_MINT, address: TEST_MINT, symbol: 'fUSDC', decimals: 6 }, shares: '10000000', underlyingAssets: '10500000' }]);
            if (u.pathname.match(/\/lend\/v1\/earn\/(deposit|withdraw)$/))
                return result({ transaction: to64(earnBytes(body.signer, u.pathname.split('/').at(-1), body.amount)) });
            throw Error('Unexpected Jupiter path ' + u.pathname);
        }
        if (u.hostname === 'api.dexscreener.com')
            return result(u.pathname.includes('token-profiles') ? [{ chainId: 'solana', tokenAddress: TEST_MINT, description: 'TEST FIXTURE, not a real project.', url: 'https://dexscreener.com/solana/' + TEST_MINT }] : []);
        const params = body.params || [];
        let value;
        switch (body.method) {
            case 'getGenesisHash':
                value = control.network === 'devnet' ? GENESIS.devnet : control.genesis;
                break;
            case 'getBalance':
                value = { value: control.sol, context: { slot: 1000 } };
                break;
            case 'getTokenAccountsByOwner':
                value = { context: { slot: 1000 }, value: params[1]?.programId === PROGRAM.token ? [{ pubkey: ata(params[0], MINT.USDC), account: { owner: PROGRAM.token, data: { parsed: { type: 'account', info: { owner: params[0], mint: MINT.USDC, state: 'initialized', tokenAmount: { amount: control.usdc, decimals: 6 } } } } } }] : [] };
                break;
            case 'getAccountInfo':
                value = params[1]?.encoding === 'jsonParsed' ? mintInfo(params[0]) : { value: null };
                break;
            case 'getLatestBlockhash':
                value = { context: { slot: 1000 }, value: { blockhash: BLOCKHASH, lastValidBlockHeight: 1150 } };
                break;
            case 'getBlockHeight':
                value = 1000;
                break;
            case 'isBlockhashValid':
                value = { value: control.blockValid, context: { slot: 1000 } };
                break;
            case 'getMinimumBalanceForRentExemption':
                value = params[0] === 82 ? 1461600 : params[0] === 165 ? 2039280 : 5616720;
                break;
            case 'simulateTransaction':
                value = { context: { slot: 1000 }, value: { err: control.simulateError, unitsConsumed: 50000, logs: ['TEST ONLY'] } };
                break;
            case 'getFeeForMessage':
                value = { context: { slot: 1000 }, value: 5000 };
                break;
            case 'sendTransaction':
                if (control.sendError)
                    throw Error('test timeout');
                value = b58encode(parseTransaction(from64(params[0])).signatures[0]);
                break;
            case 'getSignatureStatuses':
                value = { context: { slot: 1000 }, value: [control.txStatus === null ? null : { confirmationStatus: control.txStatus, slot: 1000, err: control.txStatus === 'failed' ? { InstructionError: [0, 'Custom'] } : null }] };
                break;
            case 'getSignaturesForAddress':
                value = [];
                break;
            case 'getTransaction':
                value = null;
                break;
            default: throw Error('Unexpected RPC ' + body.method);
        }
        return result({ jsonrpc: '2.0', id: body.id, result: value });
    };
    return { fetchImpl, control, calls, earnBytes };
}
