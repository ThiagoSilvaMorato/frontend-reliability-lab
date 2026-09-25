import axios from 'axios'
import { POKEAPI_BASE_URL, REQUEST_TIMEOUT_MS } from './config'
import { attachInterceptors } from './interceptors'

/**
 * The only HTTP client in the app. Rejects exclusively with `ApiError`; components and hooks
 * never see Axios types. In Lab mode MSW intercepts these same requests.
 */
export const httpClient = axios.create({
  baseURL: POKEAPI_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // The fetch adapter enforces the timeout inside Axios, so timeout behavior is identical in the
  // browser, under MSW in tests, and in the Lab (MSW's simulated XHR ignores `timeout`).
  adapter: 'fetch',
  transitional: { clarifyTimeoutError: true },
  headers: { Accept: 'application/json' },
})

attachInterceptors(httpClient)
