import { setupServer } from 'msw/node'
import { fixtureUpstream } from './fixtureUpstream'
import { createHandlers } from './handlers'

export const server = setupServer(...createHandlers(fixtureUpstream))
