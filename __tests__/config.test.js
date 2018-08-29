/* eslint-env jest */
'use strict'

const { read, keys } = require('../lib/config')
const AWS = require('aws-sdk')
let ssm = new AWS.SSM()

var ssmPromise = {
  promise: jest.fn().mockImplementation((request) => {
    return new Promise((resolve, reject) => {
      const response = {
        Parameters: [
          {
            Name: 'bar',
            Type: 'String',
            Value: 'barfoorista',
            Version: 1,
            LastModifiedDate: '2018-08-22T13:49:55.717Z',
            ARN: 'arn:aws:ssm:eu-west-1:243341595825:parameter/bar'
          },
          {
            Name: 'foo',
            Type: 'String',
            Value: 'isitbecauseIamblack?',
            Version: 1,
            LastModifiedDate: '2018-08-22T13:49:41.486Z',
            ARN: 'arn:aws:ssm:eu-west-1:243341595825:parameter/foo'
          }
        ],
        InvalidParameters: []
      }
      resolve(response)
    })
  })
}
ssm = { getParameters: () => { return ssmPromise } }

describe('mock AWS.SSM()', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'production'
  })

  it(`throws an error if SSM is not provided`, async () => {
    function throwsErr () {
      read()
    }
    expect(throwsErr).toThrow(new Error(`You need to initialize SSM and provide it as first argument of the function call`))
  })

  it(`throws an error if expiryMs <=0`, async () => {
    function throwsErr () {
      read(ssm, ['foo', 'bar'], 0)
    }
    expect(throwsErr).toThrow(new Error(`You need to specify an expiry (ms) greater than 0, or leave it undefined`))
  })

  it(`throws an error if no keys are providerd`, async () => {
    function throwsErr () {
      read(ssm, [])
    }
    expect(throwsErr).toThrow(new Error(`You need to provide a non-empty array of config keys`))
  })

  it(`throws an error if some keys are missing`, async () => {
    expect(keys(ssm, ['foobar'])).rejects.toEqual(new Error(`Missing SSM Parameter Store keys: foobar`))
  })

  it(`return keys with values`, async () => {
    const envKeys = await keys(ssm, ['foo', 'bar'])
    expect(envKeys).toEqual({
      'bar': 'barfoorista',
      'foo': 'isitbecauseIamblack?'
    })
  })

  it(`throws an error when ssm is throwing one`, async () => {
    ssm = {
      getParameters: () => {
        return {
          promise: jest.fn().mockImplementation((request) => {
            return new Promise((resolve, reject) => {
              return reject(new Error('foobar'))
            })
          })
        }
      }
    }
    expect(keys(ssm, ['foo'])).rejects.toEqual(new Error(`foobar`))
  })

  it(`successfully loads the config`, async () => {
    const configResponse = read(ssm, ['foo', 'bar'])
    const listener = () => {
      return `refresh`
    }
    expect(configResponse.onRefresh(listener)).toHaveProperty('_events')
    expect(configResponse.onRefreshError(listener)).toHaveProperty('_events')
    expect(configResponse).toHaveProperty('onRefresh')
    expect(configResponse).toHaveProperty('onRefreshError')
  })

  it(`uses process.env when not in production`, async () => {
    process.env.NODE_ENV = 'development'
    process.env.foo = 'foodev'
    process.env.bar = 'bardev'
    expect(await keys(ssm, ['foo', 'bar'])).toEqual({
      foo: 'foodev',
      bar: 'bardev'
    })
  })
})
