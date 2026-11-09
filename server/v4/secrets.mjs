import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
export function secretBox(dir, { publicMode = false } = {}) {
    let value = process.env.PULP_ENCRYPTION_KEY;
    if (!value) {
        if (publicMode)
            throw Error('PULP_ENCRYPTION_KEY es obligatorio en modo público.');
        const f = path.join(dir, 'v4-master.key');
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        if (!fs.existsSync(f))
            fs.writeFileSync(f, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
        value = fs.readFileSync(f, 'utf8').trim();
    }
    if (!/^[a-f0-9]{64}$/i.test(value))
        throw Error('PULP_ENCRYPTION_KEY debe contener 32 bytes hexadecimales.');
    const key = Buffer.from(value, 'hex');
    return { seal(v) { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), enc = Buffer.concat([c.update(JSON.stringify(v), 'utf8'), c.final()]); return { v: 1, iv: iv.toString('hex'), tag: c.getAuthTag().toString('hex'), data: enc.toString('base64') }; }, open(v) {
            if (!v)
                return {};
            const d = createDecipheriv('aes-256-gcm', key, Buffer.from(v.iv, 'hex'));
            d.setAuthTag(Buffer.from(v.tag, 'hex'));
            return JSON.parse(Buffer.concat([d.update(Buffer.from(v.data, 'base64')), d.final()]).toString());
        } };
}
