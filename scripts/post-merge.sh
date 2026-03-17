#!/bin/bash
set -e
npm install
node scripts/migrate.mjs
