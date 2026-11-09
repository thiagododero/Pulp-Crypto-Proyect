/** Wallet Standard discovery and signing. No legacy provider guessing, seeds or key storage. */
import { address, b58encode, parseTransaction, assertSignedMatches, same } from '/shared/solana.mjs';
export class Wallets extends EventTarget {
    constructor() {
        super();
        this.registry = new Set();
        this.wallet = null;
        this.account = null;
        this.off = null;
        const register = (...wallets) => {
            const added = [];
            for (const w of wallets) {
                if (!w?.features?.['standard:connect'] || !w.features['solana:signMessage'] || !w.features['solana:signTransaction'])
                    continue;
                if (!this.registry.has(w)) {
                    this.registry.add(w);
                    added.push(w);
                }
            }
            this.dispatchEvent(new Event('list'));
            return () => { for (const w of added)
                this.registry.delete(w); this.dispatchEvent(new Event('list')); };
        };
        const app = Object.freeze({ register });
        window.addEventListener('wallet-standard:register-wallet', event => { try {
            if (typeof event.detail === 'function')
                event.detail(app);
        }
        catch { } });
        window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', { detail: app }));
    }
    list() { return [...this.registry]; }
    async connect(index, network) {
        const wallet = this.list()[index];
        if (!wallet)
            throw Error('Wallet no disponible. Habilitá la extensión y recargá.');
        const result = await wallet.features['standard:connect'].connect();
        const chain = 'solana:' + network;
        const account = (result.accounts || wallet.accounts || []).find(a => (a.chains || []).includes(chain) && a.features.includes('solana:signTransaction') && a.features.includes('solana:signMessage'));
        if (!account)
            throw Error('La wallet no expone una cuenta compatible con ' + chain + '. Seleccioná una cuenta Solana.');
        address(account.address);
        if (b58encode(account.publicKey) !== account.address)
            throw Error('Clave pública de wallet inconsistente.');
        this.off?.();
        this.wallet = wallet;
        this.account = account;
        this.off = wallet.features['standard:events']?.on('change', changes => {
            if (changes.accounts) {
                const still = changes.accounts.find(a => a.address === this.account?.address);
                if (!still) {
                    this.account = null;
                    this.dispatchEvent(new Event('accountchange'));
                }
                else
                    this.account = still;
            }
        });
        return account;
    }
    current(owner, network) {
        if (!this.wallet || !this.account || this.account.address !== owner)
            throw Error('Conectá y verificá la misma wallet que figura en la operación.');
        if (!this.account.chains.includes('solana:' + network))
            throw Error('La wallet no admite la red seleccionada.');
        return this.account;
    }
    async message(text, owner, network) {
        const account = this.current(owner, network), message = new TextEncoder().encode(text);
        const [result] = await this.wallet.features['solana:signMessage'].signMessage({ account, message });
        this.current(owner, network);
        if (!result || !same(result.signedMessage, message) || result.signature?.length !== 64 || (result.signatureType && result.signatureType !== 'ed25519'))
            throw Error('La firma de mensaje no coincide con lo solicitado.');
        return result;
    }
    async sign(bytes, owner, network) {
        const account = this.current(owner, network), parsed = parseTransaction(bytes), feature = this.wallet.features['solana:signTransaction'];
        if (!feature.supportedTransactionVersions.includes(parsed.version))
            throw Error('Esta wallet no admite la versión de transacción solicitada.');
        const [result] = await feature.signTransaction({ account, transaction: bytes, chain: 'solana:' + network, options: { preflightCommitment: 'confirmed' } });
        this.current(owner, network);
        if (!result?.signedTransaction)
            throw Error('La wallet no devolvió una transacción firmada.');
        assertSignedMatches(bytes, result.signedTransaction, owner);
        return result.signedTransaction;
    }
    async disconnect() { const wallet = this.wallet; this.off?.(); this.off = null; this.wallet = null; this.account = null; try {
        await wallet?.features?.['standard:disconnect']?.disconnect();
    }
    finally {
        this.dispatchEvent(new Event('accountchange'));
    } }
}
