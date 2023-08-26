/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { URL } from 'node:url'
import { Plugin } from 'vite'
import proxy from 'http2-proxy'

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

type Protocol = 'https' | 'http'

function shouldProxy(context: string, url: string): boolean {
  return (
    (context[0] === '^' && new RegExp(context).test(url)) ||
    url.startsWith(context)
  )
}

const createPlugin = (
  proxies: { [x: string]: ProxyOptions },
  debug = false
): Plugin => {
  const handleDebug = (...args: any) => debug && console.log.call(null, args)

  const handleError = (path: string, opts: any) => (error: Error) => {
    if (error) {
      opts.onError && opts.onError(error)
      handleDebug(`[h2-proxy] error:`, `${path}\n`, error)
    }
  }

  return {
    name: 'vite-plugin-h2-proxy',
    configureServer(server) {
      server.httpServer?.on('upgrade', async (req: any, socket: any, head) => {
        const path = req.url!
        for (const context in proxies) {
          if (shouldProxy(context, path)) {
            let opts = proxies[context]
            if (typeof opts === 'string') {
              opts = { target: opts }
            }
            const url = new URL(opts.target)
            const { hostname, port, protocol } = url
            if (
              opts.ws ||
              opts.target?.toString().startsWith('ws:') ||
              opts.target?.toString().startsWith('wss:')
            ) {
              if (opts.rewrite) {
                req.url = opts.rewrite(path)
              }
              handleDebug(`${req.url} -> ws ${opts.target}`)
              return await proxy.ws(
                req,
                socket,
                head,
                {
                  hostname,
                  port: Number(port),
                  protocol: protocol as Protocol,
                  ...opts
                },
                handleError(path, opts)
              )
            }
          }
        }
      })
      server.middlewares.use(async (req, res, next) => {
        const path = req.url!
        for (const context in proxies) {
          if (shouldProxy(context, path)) {
            let opts = proxies[context]
            if (typeof opts === 'string') {
              opts = { target: opts }
            }
            const url = new URL(opts.target)
            const { hostname, port, protocol } = url
            if (opts.bypass) {
              const bypassResult = opts.bypass(req, res, opts)
              if (typeof bypassResult === 'string') {
                req.url = bypassResult
                handleDebug(`[h2-proxy] bypass: ${path} -> ${bypassResult}`)
                return next()
              } else if (bypassResult === false) {
                handleDebug(`[h2-proxy] bypass: ${path} -> 404`)
                return res.end(404)
              }
            }
            if (opts.rewrite) {
              req.url = opts.rewrite(path)
            }
            handleDebug(`[h2-proxy] proxy: ${path} -> ${opts.target}`)
            return await proxy.web(
              req,
              res,
              {
                hostname,
                port: Number(port),
                protocol: protocol as Protocol,
                rejectUnauthorized: true,
                ...opts
              } as any,
              handleError(path, opts)
            )
          }
        }
        next()
      })
    }
  }
}

export const vitePluginH2Proxy = createPlugin

export default createPlugin
