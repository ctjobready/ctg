import { resolve } from 'node:path';

/**
 * Shared environment for the browser QA suite (config + specs).
 *
 *   BASE_PATH      path prefix the site was BUILT with   (default /ctg; "/" for root hosting)
 *   PORT           preview server port                    (default 4341)
 *   DIST_DIR       build output to walk for pages         (default ./dist)
 *   QA_DIR         where reports and screenshots go       (default ./.work/qa, git-ignored)
 */
const rawBase = process.env.BASE_PATH ?? '/ctg';
const trimmed = rawBase.replace(/^\/+|\/+$/g, '');

/** Base path with leading and trailing slash: "/ctg/" or "/". */
export const BASE = trimmed === '' ? '/' : `/${trimmed}/`;
export const PORT = Number(process.env.PORT ?? 4341);
export const ORIGIN = `http://127.0.0.1:${PORT}`;
/** Playwright baseURL: origin plus base path (trailing slash so relative page paths resolve under it). */
export const BASE_URL = `${ORIGIN}${BASE}`;
export const DIST_DIR = resolve(process.env.DIST_DIR ?? 'dist');
export const QA_DIR = resolve(process.env.QA_DIR ?? '.work/qa');
