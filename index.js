'use strict'

const { keys } = require('./lib/config')

const envs = ['foo', 'bar']

module.exports = keys(envs)
