# sreda [ ![Codeship Status for igorkosta/sreda](https://app.codeship.com/projects/1be41bd0-8dc9-0136-e9f8-06d455009a92/status?branch=master)](https://app.codeship.com/projects/303735) [![npm version](https://badge.fury.io/js/sreda.svg)](https://badge.fury.io/js/sreda)
What would you use `sreda` for?

There is a very nice article by [Yan Cui](https://theburningmonk.com/) that
explains very well, why you should use `AWS SSM/KMS` and also why you should
build your own client to do so.

There is a couple of reasons for your own implementation:
* caching
* hot-swapping of configurations

You can find more about it in Yan's [article](https://hackernoon.com/you-should-use-ssm-parameter-store-over-lambda-env-variables-5197fc6ea45b) on medium.

`sreda` takes the inspiration from the Yan's medium article and this [gist](https://gist.github.com/aackerman/93d86b780ef7e951b59351dcc99af1b1) from [Aaron Ackerman](https://github.com/aackerman), which was probably also inspired by Yan Cui and packs it all into an `npm` package.

# How to use?
`sreda` exposes two functions:
* `load` - loads the configuration
* `keys` - returns a `json` object with your `key/value` pairs

# Load the configuration
If you want to load the configuration for certain keys from SSM, you have to:

```js
const { read } = require('sreda')
const AWS = require('aws-sdk')
const ssm = new AWS.SSM({
  region: 'us-west-1'
})

const config = read(
  ssm,
  ['foo', 'bar'],
  30000) // cache configuration for 30 seconds

const anotherConfig = read(
  ssm,
  ['fizz', 'buzz']) // default cache expiration is 3 minutes

exports.handler = async (event, context, callback) => {
  let keys = {
    foo: await config.keys.foo,
    bar: await config.keys.bar,
    fizz: await anotherConfig.keys.fizz,
    buzz: await anotherConfig.keys.buzz
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `SSM Keys`,
      keys
    })
  }
  callback(null, response)
}
```

Alternatively you can make use of the `keys` function that return a `json`
object with `key/value` pairs of your `ssm` keys, e.g.

```js
const { keys } = require('sreda')
const AWS = require('aws-sdk')
const ssm = new AWS.SSM({
  region: 'us-west-1'
})

exports.handler = async (event, context, callback) => {
  let keys = await keys(ssm, ['foo', 'bar'])

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `SSM Keys`,
      keys
    })
  }
  callback(null, response)
}
```

# SSM and iamRoleStatements
In order for your lambda function to access the `SSM` it has to:
* have access to the internet
* have rights to get the parameters from `SSM`

To allow your lambda function to access `SSM` you have to put similar
`iamRoleStatements` section into your `provider` block

Please note, in order to be able to use CloudFormation Pseudo Parameters, like
${AWS::Region} and ${AWS::AccountId} you have to use a `variableSyntax`
parameter with the value you see in the example below and you should use
`'Fn::Sub'` when assembling your `Resource`

```yaml
provider:
  name: aws
  runtime: nodejs8.10
  variableSyntax: "\\${((?!AWS)[ ~:a-zA-Z0-9._'\",\\-\\/\\(\\)]+?)}"
  iamRoleStatements:
    - Effect: 'Allow'
      Action: 'ssm:GetParameters'
      Resource:
        - 'Fn::Sub': 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/*'
    - Effect: 'Allow'
      Action: 'kms:Decrypt'
      Resource:
        - 'Fn::Sub': 'arn:aws:kms:us-east-1:${AWS::AccountId}:key/<your-kms-key>'
```

Through the `iamRoleStatements` you can also granulary manage the access of
your lambda function to `SSM`

```yaml
provider:
  name: aws
  runtime: nodejs8.10
  variableSyntax: "\\${((?!AWS)[ ~:a-zA-Z0-9._'\",\\-\\/\\(\\)]+?)}"
  iamRoleStatements:
    - Effect: 'Allow'
      Action: 'ssm:GetParameters'
      Resource:
        - 'Fn::Sub':
          'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/foo'
        - 'Fn::Sub':
          'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/bar'
    - Effect: 'Allow'
      Action: 'kms:Decrypt'
      Resource:
        - 'Fn::Sub': 'arn:aws:kms:us-east-1:${AWS::AccountId}:key/<your-kms-key>'
```
