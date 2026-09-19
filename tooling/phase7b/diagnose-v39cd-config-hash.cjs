'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'site/config.js'), 'utf8').replace(/\r\n/g, '\n');
console.log('PHASE7BL_CONFIG_SHA256 ' + createHash('sha256').update(source).digest('hex'));
