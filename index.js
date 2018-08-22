'use strict'

const config = require('./lib/config')

//module.exports = {
//  config
//}
const sreda = config.load(['foo', 'bar'])

module.exports = async () => {
  let response = [
    await sreda.foo,
    await sreda.bar
  ]
  console.log(sreda)
  return response
}
