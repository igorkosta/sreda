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

module.exports = async () => {
  return {
    foo: await config.keys.foo,
    bar: await config.keys.bar,
    fizz: await anotherConfig.keys.fizz,
    buzz: await anotherConfig.keys.buzz
  }
}
```
