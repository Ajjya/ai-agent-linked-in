#!/usr/bin/env node
const linkedinService = require('../dist/services/linkedin.js').default;
console.log(linkedinService.getAuthorizationUrl());
