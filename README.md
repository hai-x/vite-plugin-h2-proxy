# vite-plugin-h2-proxy

💥 A vite plugin that resolve the conflict between http2 and proxy

# Installation

```bash
yarn add vite-plugin-h2-proxy -D
# or
npm i vite-plugin-h2-proxy -D
# or
pnpm i vite-plugin-h2-proxy -D
```

# Usage

In your vite.config.ts:

```javascript
import { defineConfig } from 'vite'
import vitePluginH2Proxy from 'vite-plugin-h2-proxy'

const _proxy = {
  target: 'http://localhost:8080',
  proxyTimeout: 5000,
  timeout: 5000,
  rewrite: (path) => path.replace(/^\/fallback/, ''),
  onReq(req, proxyReq) {
    proxyReq.headers.origin = 'http://localhost:8080'
  }
  onRes(req, res, proxyRes){
    res.setHeader('set-cookie', proxyRes.headers['set-cookie'] + '; SameSite=None; Secure')
  }
  onError(error){
    console.log(error)
  }
  bypass() {
    return false
  }
}

export default defineConfig({
  plugins: [vitePluginH2Proxy(_proxy)],
})
```

# Type

```typescript
interface ProxyOptions {
  ws?: boolean
  target: string
  proxyTimeout?: number
  proxyName?: string
  timeout?: number
  bypass?: (...args: any) => boolean
  rewrite?: (path: string) => string
  onReq?: (...args: any) => any
  onRes?: (...args: any) => any
  onError?: (e: Error) => void
}
```

# Features

1. If you want to get proxy log, you can pass the second parameter, like:

```javascript
vitePluginH2Proxy(_proxy, true)
```

2. The configuration of proxy item are highly compatible with vite's built-in
   options of proxy, except `configure` option.

   Extends http2-proxy. Additional options: `onError`
