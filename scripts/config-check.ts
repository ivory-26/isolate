// Sanitized local config check: prints NO secret values (names/booleans only).
import { loadServerConfig } from '../src/server/env'

const result = loadServerConfig()
if (!result.ok) {
	console.log('CONFIG INVALID (sanitized):', result.message)
} else {
	const c = result.config
	console.log('CONFIG VALID:')
	console.log('  modelProvider :', c.modelProvider)
	console.log('  llmModel      :', c.llmModel)
	console.log('  mastraModelId :', c.mastraModelId)
	console.log('  llmBaseUrl    :', c.llmBaseUrl)
	console.log('  databaseUrlSet:', Boolean(c.databaseUrl))
	console.log('  llmApiKeySet  :', c.llmApiKey.length > 0)
}
