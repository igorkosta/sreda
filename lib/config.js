'use strict'

const EventEmitter = require('events')

const DEFAULT_EXPIRY = 3 * 60 * 1000 // default expiry is 3 mins

const read = (ssm, keys, expiryMs = DEFAULT_EXPIRY) => {
  let isRefreshing = false
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    throw new Error('You need to provide a non-empty array of config keys')
  }

  if (expiryMs <= 0) {
    throw new Error(`You need to specify an expiry (ms) greater than 0, or leave it undefined`)
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

      try {
        const { Parameters } = await ssm.getParameters(request).promise()
        for (let p of Parameters) {
          params[p.Name] = p.Value
        }

        return params
      } catch (err) {
        throw err
      }
    } else {
      for (let key of keys) {
        params[key] = process.env[key]
      }
      return params
    }
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
      throw err
    } finally {
      isRefreshing = false
    }
  }

  let getValue = async (key) => {
    let now = new Date()
    if (now >= cache.expiration) {
      await refresh()
    }
    return cache.items[key]
  }

  const config = {
    onRefresh: (listener) => { return eventEmitter.addListener('refresh', listener) },
    onRefreshError: (listener) => { return eventEmitter.addListener('refreshError', listener) },
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

const keys = async (ssm, keys) => {
  let response = {}

  const config = read(ssm, keys)
  for (let key of keys) {
    try {
      response[key] = await config.keys[key]
    } catch (err) {
      throw err
    }
  }
  return response
}

module.exports = {
  read,
  keys
}
