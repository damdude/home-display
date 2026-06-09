import os from 'os';

/** Return the primary non-loopback IPv4 address of this machine. */
export function getLocalIp(): string {
  const ifaces = os.networkInterfaces();

  for (const [name, addrs] of Object.entries(ifaces)) {
    // Skip virtual / container interfaces
    if (/docker|veth|br-|virbr|lo/i.test(name)) continue;

    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) {
        console.log(`[Network] Local IP: ${a.address} (${name})`);
        return a.address;
      }
    }
  }

  console.warn('[Network] No non-loopback IPv4 found — defaulting to 127.0.0.1');
  return '127.0.0.1';
}
