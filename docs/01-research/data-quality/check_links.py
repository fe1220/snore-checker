"""337개 sourceUrl 생존 검사. 순차, 요청 간 2.5초, 병원당 1회.
연결 오류/타임아웃/403/429/5xx 가 1번이라도 나오면 즉시 종료(재시도 없음).
응답은 cache/{id}.html + cache/{id}.meta.json 에 저장, 재실행 시 캐시된 id는 요청하지 않는다.
사용: python3 check_links.py [최대 요청 수]
"""
import json, os, sys, time, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
HOSP = '/Users/skm/dev/subject/frontend/src/data/hospitals.json'
UA = 'SleepCheckCrawler/1.0 (+https://github.com/fe1220/next-django-assignment)'
DELAY = 2.5
STOP = os.path.join(HERE, 'STOPPED.txt')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None   # 리다이렉트를 따라가지 않는다(요청 1회 보장)
opener = urllib.request.build_opener(NoRedirect)

def halt(hid, reason):
    msg = f'{time.strftime("%F %T")} STOP at {hid}: {reason}'
    open(STOP, 'a').write(msg + '\n'); print(msg, flush=True)
    sys.exit(2)                                          # 즉시 종료. 재시도·다음 요청 없음

if os.path.exists(STOP):
    print('STOPPED.txt 가 있다. 이전 실행이 차단/오류로 멈췄다. 요청하지 않는다.'); sys.exit(2)

limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10**9
items = json.load(open(HOSP))['items']
sent = 0
for h in items:
    hid = h['id']
    meta_p = os.path.join(CACHE, hid + '.meta.json')
    if os.path.exists(meta_p): continue                  # 캐시 적중: 요청 안 함
    if sent >= limit: break
    if sent: time.sleep(DELAY)
    sent += 1
    req = urllib.request.Request(h['sourceUrl'], headers={'User-Agent': UA})
    try:
        with opener.open(req, timeout=20) as r:
            status, body, loc = r.status, r.read(), None
    except urllib.error.HTTPError as e:                  # 4xx/5xx/3xx(리다이렉트 미추적)
        status, loc = e.code, e.headers.get('Location')
        if status in (403, 429) or status >= 500:
            halt(hid, f'HTTP {status}')                  # 차단/서버 이상 -> 즉시 종료
        body = e.read()
    except Exception as e:                               # URLError, ConnectionRefused/Reset, timeout 등 전부
        halt(hid, f'{type(e).__name__}: {e}')            # -> 즉시 종료
    open(os.path.join(CACHE, hid + '.html'), 'wb').write(body)
    json.dump({'id': hid, 'status': status, 'location': loc, 'bytes': len(body),
               'fetchedAt': time.strftime('%FT%T'), 'source': 'live'}, open(meta_p, 'w'))
    print(sent, hid, status, len(body), flush=True)
print('done, sent', sent)
