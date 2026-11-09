import { randomId } from '../security.mjs';
export class Jobs {
    constructor(store, handlers = {}) { this.store = store; this.handlers = handlers; this.running = false; this.timer = null; }
    async enqueue(type, payload, { id = randomId(), owner = '', due = Date.now() } = {}) {
        let result;
        await this.store.mutate('v4-jobs', q => {
            const found = q.find(j => j.id === id);
            if (found) {
                result = found;
                return q;
            }
            result = { id, type, payload, owner, due, state: 'queued', attempts: 0, createdAt: Date.now() };
            q = q.filter(j => !['done', 'failed'].includes(j.state) || j.createdAt > Date.now() - 86400000);
            if (q.length >= 2000)
                throw Error('Cola completa. No se descartaron tareas activas.');
            q.push(result);
            return q;
        }, []);
        return result;
    }
    async list(owner) { return (await this.store.get('v4-jobs', [])).filter(x => x.owner === owner).map(({ payload, ...j }) => j); }
    async tick() {
        if (this.running)
            return;
        this.running = true;
        try {
            const now = Date.now();
            let job;
            await this.store.mutate('v4-jobs', q => {
                job = q.find(j => (j.state === 'queued' && j.due <= now) || (j.state === 'running' && j.leaseUntil < now));
                if (job) {
                    job.state = 'running';
                    job.leaseUntil = now + 900000;
                    job.attempts++;
                }
                return q;
            }, []);
            if (!job)
                return;
            let outcome;
            try {
                const fn = this.handlers[job.type];
                if (!fn)
                    throw Error('Tipo de tarea desconocido.');
                outcome = { state: 'done', result: await fn(job.payload, job.owner), finishedAt: Date.now() };
            }
            catch (e) {
                outcome = { state: job.attempts < 4 ? 'queued' : 'failed', error: String(e.message).slice(0, 300), due: Date.now() + 30000 * 2 ** job.attempts };
            }
            await this.store.mutate('v4-jobs', q => q.map(j => j.id === job.id ? { ...j, ...outcome } : j), []);
        }
        finally {
            this.running = false;
        }
    }
    async drain() { if (this.draining)
        return; this.draining = true; try {
        for (let i = 0; i < 8 && this.timer; i++)
            await this.tick();
    }
    finally {
        this.draining = false;
    } }
    start() {
        if (!this.timer) {
            this.timer = setInterval(() => this.drain().catch(() => { }), 15000);
            this.timer.unref();
        }
    }
    stop() { clearInterval(this.timer); this.timer = null; }
}
