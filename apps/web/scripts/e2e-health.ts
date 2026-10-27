// One-off health-check E2E probe (reuses the driver's callServerFn).
import { fromCrossJSON } from 'seroval'
import { createDefaultSerovalPlugins } from '@tanstack/router-core/ssr/client'
import { callServerFn } from './e2e-submit'

const res = await callServerFn('getHealth', 'GET', undefined)
console.log('getHealth status:', res.status)
console.log('raw:', res.body.slice(0, 300))
try {
	const plugins = createDefaultSerovalPlugins()
	console.log('parsed:', JSON.stringify(fromCrossJSON(JSON.parse(res.body), { plugins })))
} catch (e) {
	console.log('decode failed (response present, see raw):', String(e))
}
