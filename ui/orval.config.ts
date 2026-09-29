import { defineConfig } from 'orval'

export default defineConfig({
  jot: {
    // Every API build rewrites this file (see OpenApiDocumentsDirectory in Jot.Api.csproj)
    input: '../api/Jot.Api/Jot.Api.json',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated',
      schemas: 'src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        // Every request goes through jotFetch, which adds the API's address and throws on error responses
        mutator: { path: 'src/api/fetcher.ts', name: 'jotFetch' },
        // Hooks return the response body itself, not { data, status, headers }
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
})
