/* eslint-env jest */
'use strict'

// const AWS = require('aws-sdk')
const AWS = require('aws-sdk-mock')

const { load, ssm } = require('../lib/config')
ssm.getParameters = jest.fn()

describe('mock AWS.SSM()', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'production'
  })

  it('getParameters', async () => {
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

    AWS.mock('SSM', 'getParameters', function (params, callback) {
      callback(null, response)
    })

    const configResponse = load(['foo', 'bar'])
    // const params = await ssm.getParameters()
    const r = await configResponse.keys.foo
    console.log(r)
  })
})
