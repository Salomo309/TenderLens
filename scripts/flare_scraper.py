#!/usr/bin/env python3
"""
FlareScraper v2: Uses FlareSolverr's container Chrome to bypass Cloudflare,
then makes AJAX requests FROM WITHIN the page context to get ALL tender data.
"""
import json
import sys
import time
import re
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('flare_scraper')

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: flare_scraper.py <url> [year] [max_wait]"}))
        sys.exit(1)

    url = sys.argv[1]
    year = sys.argv[2] if len(sys.argv) > 2 else str(time.localtime().tm_year)
    max_wait = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    source_slug = sys.argv[4] if len(sys.argv) > 4 else 'unknown'

    log.info(f"Scraping: {url} (year={year}, slug={source_slug})")

    from xvfbwrapper import Xvfb
    xvfb = Xvfb(width=1920, height=1080, colordepth=24)
    xvfb.start()
    log.info("Xvfb started")

    try:
        sys.path.insert(0, '/app')
        import undetected_chromedriver as uc
        from selenium.webdriver.common.by import By
        from selenium.webdriver.common.keys import Keys
        from selenium.webdriver.common.action_chains import ActionChains

        options = uc.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--no-zygote')
        options.add_argument('--ignore-certificate-errors')
        options.add_argument('--disable-search-engine-choice-screen')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--lang=id-ID')

        log.info("Launching Chrome...")
        driver = uc.Chrome(
            options=options,
            browser_executable_path='/usr/bin/chromium',
            driver_executable_path='/app/chromedriver',
            headless=False,
            use_subprocess=True
        )

        blocked_auto_ajax = False

        log.info(f"Navigating to {url}")
        driver.get(url)

        _wait_for_cloudflare(driver, max_wait)

        title = driver.title
        html = driver.page_source
        log.info(f"Page loaded: title={title}, html={len(html)} bytes")

        if 'authenticityToken' not in html:
            log.error("No authenticityToken found")
            print(json.dumps({"error": "Cloudflare not bypassed", "title": title}))
            driver.quit()
            return

        token_match = re.search(r"authenticityToken\s*=\s*['\"](\S+?)['\"]", html)
        token = token_match.group(1) if token_match else ''
        log.info(f"Token: {token[:20]}...")

        # Wait a bit for the page to stabilize
        time.sleep(5)

        # Make AJAX request from within page context (this bypasses the token issue!)
        log.info("Making AJAX request from page context...")
        all_tenders = _fetch_all_via_ajax(driver, token, year)

        if all_tenders is not None:
            print(json.dumps(all_tenders, ensure_ascii=False))
        else:
            # Fallback 1: read from DataTable memory
            log.warning("AJAX approach failed, falling back to DataTable memory")
            result = _read_datatable_memory(driver)

            if not result.get('data'):
                # Fallback 2: parse HTML table directly
                log.warning("DataTable memory empty, falling back to HTML table parse")
                result = _parse_html_table(driver.page_source)

            print(json.dumps(result, ensure_ascii=False))

        driver.quit()

    except Exception as e:
        log.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        print(json.dumps({"error": str(e)}))
    finally:
        xvfb.stop()


def _fetch_all_via_ajax(driver, token, year):
    """Make paginated AJAX requests from within the page context"""
    PAGE_SIZE = 25
    all_data = []
    start = 0
    total = 0

    for page in range(100):  # max 100 pages = 20000 tenders
        try:
            js_code = """
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', '/pu/dt/lelang?tahun=' + arguments[1], true);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    xhr.timeout = 30000;
                    xhr.onload = function() {
                        resolve(JSON.stringify({
                            status: xhr.status,
                            body: xhr.responseText
                        }));
                    };
                    xhr.onerror = function() {
                        resolve(JSON.stringify({error: 'XHR error', status: xhr.status}));
                    };
                    xhr.ontimeout = function() {
                        resolve(JSON.stringify({error: 'timeout'}));
                    };

                    var pageNum = arguments[0];
                    var startPos = arguments[2];
                    var pageSize = arguments[3];
                    var tokenVal = arguments[4];

                    var params = 'authenticityToken=' + tokenVal + '&draw=' + (pageNum + 1) + '&start=' + startPos + '&length=' + pageSize;
                    for (var c = 0; c < 15; c++) {
                        params += '&columns[' + c + '][data]=' + c;
                        params += '&columns[' + c + '][name]=';
                        params += '&columns[' + c + '][searchable]=true';
                        params += '&columns[' + c + '][orderable]=true';
                        params += '&columns[' + c + '][search][value]=';
                        params += '&columns[' + c + '][search][regex]=false';
                    }
                    params += '&order[0][column]=0&order[0][dir]=asc&search[value]=&search[regex]=false';
                    xhr.send(params);
                });
            """
            result = driver.execute_script(js_code, page, year, start, PAGE_SIZE, token)

            resp = json.loads(result)

            if resp.get('error'):
                log.error(f"Page {page + 1} error: {resp}")
                break

            body = resp.get('body', '')
            log.info(f"Page {page + 1}: status={resp.get('status')}, body_len={len(body)}, first200={body[:200]}")
            if not body.startswith('{'):
                log.warning(f"Page {page + 1}: non-JSON response ({len(body)} bytes)")
                break

            data = json.loads(body)

            if 'data' not in data:
                log.warning(f"Page {page + 1}: no 'data' key in response")
                break

            rows = data['data']
            total = data.get('recordsTotal', total)

            if page == 0:
                log.info(f"First page: {len(rows)} rows, total={total}")

            if len(rows) == 0:
                break

            all_data.extend(rows)
            start += PAGE_SIZE

            if start >= total:
                break

            time.sleep(1)  # Be nice to the server

        except Exception as e:
            log.error(f"Page {page + 1} exception: {e}")
            break

    if all_data:
        log.info(f"AJAX complete: {len(all_data)} tenders of {total} total")
        return {"total": total, "data": all_data, "source": "ajax_paginated", "slug": sys.argv[4] if len(sys.argv) > 4 else "unknown"}

    return None


def _read_datatable_memory(driver):
    """Fallback: read from DataTable memory"""
    try:
        result = driver.execute_script("""
            try {
                if (typeof $ !== 'undefined' && $.fn.DataTable) {
                    var table = $('#tbllelang').DataTable();
                    var info = table.page.info();
                    var data = table.data().toArray();
                    return JSON.stringify({
                        success: true,
                        total: info.recordsTotal,
                        count: data.length,
                        data: data
                    });
                }
                return JSON.stringify({success: false, error: 'No DataTable'});
            } catch(e) {
                return JSON.stringify({success: false, error: e.message});
            }
        """)
        j = json.loads(result)
        if j.get('success'):
            return {"total": j['total'], "data": j['data'], "source": "datatable_memory",
                    "slug": sys.argv[4] if len(sys.argv) > 4 else "unknown"}
    except Exception as e:
        log.error(f"DataTable memory read failed: {e}")

    return {"total": 0, "data": [], "source": "empty", "slug": sys.argv[4] if len(sys.argv) > 4 else "unknown"}


def _parse_html_table(html):
    """Parse HTML table rows directly from page source"""
    import re

    slug = sys.argv[4] if len(sys.argv) > 4 else 'unknown'
    rows = []

    tbody_match = re.search(r'<tbody[^>]*>(.*?)</tbody>', html, re.DOTALL | re.IGNORECASE)
    if not tbody_match:
        log.warning("No tbody found in HTML")
        return {"total": 0, "data": [], "source": "html_parse", "slug": slug}

    tbody = tbody_match.group(1)
    tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody, re.DOTALL | re.IGNORECASE)
    log.info(f"Found {len(tr_matches)} <tr> in HTML tbody")

    for tr in tr_matches:
        td_matches = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)
        cells = [re.sub(r'<[^>]+>', '', td).strip() for td in td_matches]
        if len(cells) >= 5:
            rows.append(cells)

    log.info(f"Parsed {len(rows)} rows from HTML table")
    return {"total": len(rows), "data": rows, "source": "html_parse", "slug": slug}


def _wait_for_cloudflare(driver, max_wait=30):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.action_chains import ActionChains

    challenge_titles = ['Just a moment...', 'DDoS-Guard']
    challenge_selectors = [
        '#cf-challenge-running', '.ray_id', '.attack-box',
        '#cf-please-wait', '#challenge-spinner', '#trk_jschal_js',
        '#turnstile-wrapper', '.lds-ring',
        "input[name='cf-turnstile-response']"
    ]

    start_time = time.time()
    attempt = 0

    while time.time() - start_time < max_wait:
        title = driver.title
        has_challenge = False
        for ct in challenge_titles:
            if ct.lower() in title.lower():
                has_challenge = True
                break
        if not has_challenge:
            for sel in challenge_selectors:
                try:
                    if driver.find_elements(By.CSS_SELECTOR, sel):
                        has_challenge = True
                        break
                except:
                    pass

        if not has_challenge:
            log.info("Cloudflare challenge resolved!")
            return

        attempt += 1
        log.info(f"Challenge detected (attempt {attempt})")

        try:
            actions = ActionChains(driver)
            actions.pause(3)
            for _ in range(3):
                actions.send_keys(Keys.TAB).pause(0.2)
            actions.pause(1)
            actions.send_keys(Keys.SPACE).perform()
        except:
            pass

        try:
            iframes = driver.find_elements(By.CSS_SELECTOR, 'iframe')
            for iframe in iframes:
                src = iframe.get_attribute('src') or ''
                if 'challenges.cloudflare.com' in src or 'turnstile' in src:
                    driver.switch_to.frame(iframe)
                    try:
                        cb = driver.find_element(By.CSS_SELECTOR, 'input[type="checkbox"]')
                        cb.click()
                    except:
                        actions = ActionChains(driver)
                        body = driver.find_element(By.TAG_NAME, 'body')
                        actions.move_to_element_with_offset(body, 25, 25).click().perform()
                    driver.switch_to.default_content()
                    break
                driver.switch_to.default_content()
        except:
            driver.switch_to.default_content()

        try:
            btn = driver.find_element(By.XPATH,
                "//input[@type='button' and @value='Verify you are human']")
            actions = ActionChains(driver)
            actions.move_to_element_with_offset(btn, 5, 7).click().perform()
        except:
            pass

        time.sleep(3)

    log.warning(f"Cloudflare not resolved after {max_wait}s")


if __name__ == '__main__':
    main()
