'use strict'

const EventEmitter = require('events')
const AWS = require('aws-sdk')
const ssm = new AWS.SSM({
  region: 'eu-west-1'
})

const DEFAULT_EXPIRY = 3 * 60 * 1000 // default expiry is 3 mins

const load = (ssm, keys, expiryMs = DEFAULT_EXPIRY) => {
  let isRefreshing = false
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('you need to provide a non-empty array of config keys')
  }

  if (expiryMs <= 0) {
    throw new Error('you need to specify an expiry (ms) greater than 0, or leave it undefined')
  }

  let cache = {
    expiration: new Date(0),
    items: {}
  }

  const eventEmitter = new EventEmitter()

  const validate = (keys, params) => {
    let missing = keys.filter(k => params[k] === undefined)
    if (missing.length > 0) {
      throw new Error(`Missing SSM Parameter Store keys: ${missing}`)
    }
  }

  const fetchParams = async () => {
    let params = {}

    if (process.env.NODE_ENV === 'production') {
      const request = {
        Names: keys,
        WithDecryption: true
      }

      const {
        Parameters
      } = await ssm.getParameters(request).promise()

      for (let p of Parameters) {
        params[p.Name] = p.Value
      }

      return params
    }

    for (let key of keys) {
      params[key] = process.env[key]
    }
    return params
  }

  const refresh = async () => {
    if (isRefreshing) { return }

    isRefreshing = true
    console.log(`Refreshing SSM Parameter Store keys: ${keys}`)

    try {
      const params = await fetchParams()
      validate(keys, params)
      console.log(`Successfully refreshed SSM Parameter Store keys: ${keys}`)
      let now = new Date()
      cache.expiration = new Date(now.getTime() + expiryMs)
      cache.items = params
      eventEmitter.emit('refresh')
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      isRefreshing = false
    }
  }

  let getValue = async (key) => {
    let now = new Date()
    if (now <= cache.expiration) {
      return cache.items[key]
    }

    try {
      await refresh()
      return cache.items[key]
    } catch (err) {
      if (cache.items && cache.items.length > 0) {
        // swallow exception if cache is stale, as we'll just try again next time
        console.log('[WARN] swallowing error from SSM Parameter Store:\n', err)

        eventEmitter.emit('refreshError', err)

        return cache.items[key]
      }

      console.log(`[ERROR] couldn't fetch the initial configs : ${keys}`)
      console.error(err)

      throw err
    }
  }

  const config = {
    onRefresh: listener => eventEmitter.addListener('refresh', listener),
    onRefreshError: listener => eventEmitter.addListener('refreshError', listener),
    keys: {}
  }

  for (let key of keys) {
    Object.defineProperty(config.keys, key, {
      get: () => { return getValue(key) },
      enumerable: true,
      configurable: false
    })
  }

  return config
}

const keys = async (keys) => {
  let response = {}

  const config = load(keys)
  for (let key of keys) {
    response[key] = await config.keys[key]
  }
  console.log(response)
  return response
}

module.exports = {
  load,
  keys
}
