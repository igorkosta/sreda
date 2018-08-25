/* eslint-env jest */
'use strict'

const { load } = require('../lib/config')
const AWS = require('aws-sdk')
let ssm = new AWS.SSM()

const ssmPromise = {
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

  it('getParameters', async () => {
    const configResponse = load(ssm, ['foo', 'bar'])
    // const params = await ssm.getParameters()
    const r = await configResponse.keys.foo
    console.log(r)
  })
})
