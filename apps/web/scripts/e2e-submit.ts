/**
 * E2E driver for the MVP spike — replicates the exact browser RPC flow against
 * the production build (`bun run build` && `bunx vite preview`):
 * seroval-serialize the payload, POST /_serverFn/<buildId> with CSRF headers,
 * deserialize the response.
 *
 * Function IDs are content hashes from the compiled server bundle
 * (dist/server/assets/routes-*.js). Rebuild + re-extract after changing
 * src/server/functions.ts.
 *
 * Usage: bun scripts/e2e-submit.ts [validPrompt] | [invalid]
 */

const PROD_FN_IDS = {
	submitAgentRun: '8c9b3fd2f93a2f164d1a7fa94e3aa87e93950c678f810836817a6e6133f66930',
	getRecentRuns: 'f62463a5c11349a4172cf5d3966c311e0204b3d97742ba424a250a6ce4d75041',
	getHealth: '43ec55023cae03c27d9922997cd76aeb4394c28f9697e5e680aae2bada58325d',
} as const

import { fromCrossJSON, toJSONAsync } from 'seroval'
import { createDefaultSerovalPlugins } from '@tanstack/router-core/ssr/client'

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

export { PROD_FN_IDS } // keep TS from eliding the const in this script module

export async function callServerFn<T>(
	exportName: keyof typeof PROD_FN_IDS,
	method: 'GET' | 'POST',
	data: unknown,
): Promise<{ status: number; body: string; parsed: T | null; raw: string }> {
	const fnId = PROD_FN_IDS[exportName]
	const url = `${BASE_URL}/_serverFn/${fnId}`
	const headers: Record<string, string> = {
		Origin: BASE_URL,
		'x-tsr-serverFn': 'true',
	}
	const plugins = createDefaultSerovalPlugins()
	let body: string | undefined
	if (method === 'POST') {
		const value = await toJSONAsync({ data }, { plugins })
		body = JSON.stringify(value)
		headers['content-type'] = 'application/json'
	}
	const res = await fetch(url, { method, headers, body })
	const raw = await res.text()
	let parsed: T | null = null
	let raw2 = raw
	try {
		if (
			res.headers.get('x-tss-serialized') &&
			(res.headers.get('content-type') || '').includes('application/json')
		) {
			parsed = fromCrossJSON(JSON.parse(raw), { plugins }) as T
		}
	} catch (e) {
		raw2 = `serialize decode failed: ${String(e)}`
	}
	return { status: res.status, body: raw.slice(0, 600), parsed, raw: raw2 }
}

type RunResponse = { ok: boolean; run?: unknown; code?: string; message?: string }

async function main() {
	const prompt = process.argv[2]
	const mode = process.argv[3] || 'valid'

	console.log('== E2E: submitAgentRun ==')
	if (mode === 'invalid') {
		const res = await callServerFn<RunResponse>(
			'submitAgentRun',
			'POST',
			{ prompt: 'x'.repeat(2500) },
		)
		console.log('oversized prompt → status', res.status)
		console.log('raw:', res.body)
		console.log('parsed:', JSON.stringify(res.parsed ?? res.body))
	} else if (prompt) {
		const res = await callServerFn<RunResponse>(
			'submitAgentRun',
			'POST',
			{ prompt },
		)
		console.log('status', res.status)
		console.log('raw:', res.body.slice(0, 400))
		console.log('parsed:', JSON.stringify(res.parsed ?? res.body).slice(0, 1200))
	}

	console.log('== E2E: getRecentRuns ==')
	const recent = await callServerFn<unknown>('getRecentRuns', 'GET', undefined)
	console.log('status', recent.status)
	console.log('parsed:', JSON.stringify(recent.parsed ?? recent.body).slice(0, 1200))
}
	if (import.meta.main) {
		main()
	}
