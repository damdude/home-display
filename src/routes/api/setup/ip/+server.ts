import { json } from '@sveltejs/kit';
import { getLocalIp } from '$lib/server/network.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  return json({ ip: getLocalIp() });
};
