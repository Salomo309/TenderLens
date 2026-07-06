#!/usr/bin/env python3
"""Quick test: verify FlareSolverr + hybrid scraper works for a source."""
import json, urllib.request, re, sys

def test(source_slug, year="2027"):
    url = f"https://spse.inaproc.id/{source_slug}/lelang"
    payload = {"cmd": "request.get", "url": url, "maxTimeout": 30000}
    data = json.dumps(payload).encode()
    req = urllib.request.Request("http://localhost:8191/v1", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=60)
    j = json.loads(resp.read())
    sol = j.get("solution", {})
    html = sol.get("response", "")
    token = "authenticityToken" in html
    dt = "tbllelang" in html
    if token and dt:
        print(f"OK: {source_slug} - DataTable source ({len(html)} bytes)")
    elif "_next/static" in html:
        print(f"REACT: {source_slug} - Next.js source ({len(html)} bytes)")
    else:
        print(f"UNKNOWN: {source_slug} - {len(html)} bytes, token={token}, dt={dt}")

if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "pu"
    year = sys.argv[2] if len(sys.argv) > 2 else "2027"
    test(slug, year)
