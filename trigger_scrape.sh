#!/bin/bash
curl -s -X POST "http://localhost:3000/api/scraper-monitor/scrape" -H "Content-Type: application/json" -d "{\"slug\":\"pu\"}"
echo ""