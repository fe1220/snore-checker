"""hospitals.json 337곳 데이터 품질 검사 (읽기 전용). 결과: results_*.csv, summary.json
링크 검사는 cache/ (check_links.py 산출)를 읽는다."""
import json, os, re, csv, math, html as H, collections
HERE = os.path.dirname(os.path.abspath(__file__))
HOSP = '/Users/skm/dev/subject/frontend/src/data/hospitals.json'
SGG = os.path.join(HERE, '..', 'supply-gap', 'raw', 'sgg.json')
items = json.load(open(HOSP))['items']
S = {}
def out(name, hdr, rows):
    with open(os.path.join(HERE, name), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); w.writerow(hdr); w.writerows(rows)
def km(a, b, c, d):
    p = math.pi/180; x = (d-b)*p*math.cos((a+c)/2*p); y = (c-a)*p
    return 6371*math.hypot(x, y)

# ---------- 1. 링크 ----------
rows = []; cnt = collections.Counter()
detail = {}
for h in items:
    mp = os.path.join(HERE, 'cache', h['id']+'.meta.json')
    if not os.path.exists(mp):
        cnt['미검사'] += 1; rows.append([h['id'], h['name'], h['sourceUrl'], '', '', '', '', '', '미검사']); continue
    m = json.load(open(mp)); body = open(os.path.join(HERE, 'cache', h['id']+'.html'), encoding='utf-8', errors='replace').read()
    text = H.unescape(body)
    title = (re.search(r'<title>([^<]*)', body) or [None, ''])[1].strip()
    name_in = h['name'] in text
    name_in_title = h['name'] in H.unescape(title)
    q = re.search(r'maps\?q=(-?[\d.]+),(-?[\d.]+)', body)
    dkm = ''
    if q:
        detail[h['id']] = (float(q[1]), float(q[2])); dkm = round(km(h['lat'], h['lng'], *detail[h['id']]), 2)
    ok = m['status'] == 200 and name_in
    verdict = '통과' if ok else '실패'
    cnt[verdict] += 1
    rows.append([h['id'], h['name'], h['sourceUrl'], m['status'], m.get('location') or '', name_in, name_in_title, dkm, verdict, m['source'][:4]])
out('results_links.csv', ['id', 'name', 'sourceUrl', 'status', 'location', 'name_in_html', 'name_in_title', 'km_json_vs_detail_coord', 'verdict', 'source'], rows)
S['links'] = dict(cnt); S['links_fail'] = [r for r in rows if r[8] == '실패']
S['links_seeded'] = sum(1 for r in rows if len(r) > 9 and r[9] == 'seed')

# ---------- 2. 전화 ----------
AREA = {'서울': '02', '경기': '031', '인천': '032', '부산': '051', '대구': '053', '광주': '062', '대전': '042', '울산': '052', '세종': '044',
        '강원': '033', '충북': '043', '충남': '041', '전북': '063', '전남': '061', '경북': '054', '경남': '055', '제주': '064'}
rows = []; cnt = collections.Counter(); by = collections.defaultdict(list)
for h in items:
    p = h['phone']
    if p is None: kind = 'null'
    elif re.fullmatch(r'02-\d{3,4}-\d{4}', p) or re.fullmatch(r'0[3-6][1-5]-\d{3,4}-\d{4}', p):
        ac = p.split('-')[0]
        kind = '지역번호_정상' if ac == AREA[h['region']] else '지역번호_시도불일치'
    elif re.fullmatch(r'1[5-8]\d{2}-\d{4}', p): kind = '대표번호(15xx/16xx/18xx)'
    elif re.fullmatch(r'0(70|50\d)-\d{3,4}-\d{4}', p): kind = '070/050x'
    elif re.fullmatch(r'01\d-\d{3,4}-\d{4}', p): kind = '휴대폰'
    else: kind = '형식이상'
    cnt[kind] += 1
    if p: by[re.sub(r'\D', '', p)].append(h)
    rows.append([h['id'], h['name'], h['region'], p, kind])
dups = {k: v for k, v in by.items() if len(v) > 1}
dupids = {h['id'] for v in dups.values() for h in v}
for r in rows: r.append('중복' if r[0] in dupids else '')
out('results_phone.csv', ['id', 'name', 'region', 'phone', 'kind', 'dup'], rows)
S['phone'] = dict(cnt); S['phone_bad'] = [r for r in rows if r[4] not in ('지역번호_정상', '대표번호(15xx/16xx/18xx)')]
S['phone_dups'] = [[k, [(h['id'], h['name'], h['address']) for h in v]] for k, v in dups.items()]

# ---------- 3. 좌표 ----------
KS = {'11': '서울', '21': '부산', '22': '대구', '23': '인천', '24': '광주', '25': '대전', '26': '울산', '29': '세종', '31': '경기', '32': '강원',
      '33': '충북', '34': '충남', '35': '전북', '36': '전남', '37': '경북', '38': '경남', '39': '제주'}
SIDO = {'서울특별시': '서울', '서울': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천', '인천': '인천', '광주광역시': '광주', '대전광역시': '대전',
        '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기', '강원도': '강원', '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남', '충남': '충남',
        '전라북도': '전북', '전북특별자치도': '전북', '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주'}
polys = []   # (sido, name, [rings...]) per polygon, bbox
for f in json.load(open(SGG))['features']:
    p = f['properties']; g = f['geometry']
    name = p['name']; sido = KS[p['code'][:2]]
    if name == '군위군': sido = '대구'
    if name == '남구' and sido == '인천': name = '미추홀구'
    for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
        xs = [x for x, y in poly[0]]; ys = [y for x, y in poly[0]]
        polys.append((sido, name, poly, (min(xs), min(ys), max(xs), max(ys))))
def in_ring(x, y, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2-x1)*(y-y1)/(y2-y1)+x1: c = not c
    return c
def locate(lat, lng):
    for sido, name, poly, (a, b, c, d) in polys:
        if a <= lng <= c and b <= lat <= d and in_ring(lng, lat, poly[0]) and not any(in_ring(lng, lat, r) for r in poly[1:]):
            return sido, name
    return None, None
def dist_to_unit(lat, lng, sido, name):   # 주소상 시군구 경계까지 최소 거리(km), 꼭짓점 기준 근사
    best = None
    for s, n, poly, _ in polys:
        if s == sido and n == name:
            for x, y in poly[0]:
                dd = km(lat, lng, y, x); best = dd if best is None or dd < best else best
    return best
names_by_sido = collections.defaultdict(set)
for s, n, _, _ in polys: names_by_sido[s].add(n)
def addr_unit(h):
    t = h['address'].split()
    if t[0] == '대한민국': t = t[1:]
    sido = SIDO.get(t[0])
    if sido is None: return None, None
    if sido == '세종': return sido, '세종시'
    for cand in (t[1]+t[2] if len(t) > 2 else None, t[1]):
        if cand and cand in names_by_sido[sido]: return sido, cand
    return sido, None
rows = []; cnt = collections.Counter(); cdup = collections.defaultdict(list)
for h in items:
    lat, lng = h['lat'], h['lng']
    inkr = 33.0 <= lat <= 38.7 and 124.5 <= lng <= 131.9
    cdup[(lat, lng)].append(h)
    asido, asgg = addr_unit(h); psido, psgg = locate(lat, lng)
    d = ''
    if asgg is None: v = '주소_시군구_미해석'
    elif (asido, asgg) == (psido, psgg): v = '일치'
    else:
        d = dist_to_unit(lat, lng, asido, asgg); d = round(d, 2)
        v = '불일치_경계근처(<1km)' if d < 1 else '불일치_1~5km' if d < 5 else '불일치_5km이상'
    if not inkr: v = '한국범위밖'
    cnt[v] += 1
    dk = detail.get(h['id']); dd = round(km(lat, lng, *dk), 2) if dk else ''
    rows.append([h['id'], h['name'], h['address'], lat, lng, f'{asido} {asgg}', f'{psido} {psgg}', d, v, dk[0] if dk else '', dk[1] if dk else '', dd])
cd = {k: v for k, v in cdup.items() if len(v) > 1}
out('results_coords.csv', ['id', 'name', 'address', 'lat', 'lng', 'addr_unit', 'coord_unit(2018경계)', 'km_to_addr_unit', 'verdict', 'detail_lat', 'detail_lng', 'km_json_vs_detail'], rows)
S['coords'] = dict(cnt); S['coords_bad'] = [r for r in rows if r[8] != '일치']
S['coord_dups'] = [[k, [(h['id'], h['name'], h['address']) for h in v]] for k, v in cd.items()]
S['coord_vs_detail_over_1km'] = [r for r in rows if r[11] != '' and r[11] > 1]
S['coord_vs_detail_n'] = sum(1 for r in rows if r[11] != '')
S['coord_sigfig'] = dict(collections.Counter(len(str(h['lat']).split('.')[-1]) for h in items))

# ---------- 4. 이름·주소 ----------
rows = []; cnt = collections.Counter()
idc = collections.Counter(h['id'] for h in items); nc = collections.Counter(h['name'] for h in items)
for h in items:
    flags = []
    if idc[h['id']] > 1: flags.append('중복id')
    if nc[h['name']] > 1: flags.append('동명')
    if len(h['name']) > 30: flags.append(f'긴이름({len(h["name"])}자)')
    for k in ('id', 'name', 'region', 'address', 'sourceUrl'):
        if not str(h.get(k) or '').strip(): flags.append('빈값:'+k)
    if h['name'] != h['name'].strip() or '  ' in h['name'] or re.search(r'[<>&;]|\\', h['name']): flags.append('이름_특수문자/공백')
    t = h['address'].split()
    if t[0] == '대한민국': flags.append('주소_대한민국접두'); t = t[1:]
    s = SIDO.get(t[0])
    if s is None: flags.append('주소_시도미해석')
    elif s != h['region']: flags.append(f'region불일치(주소 {s})')
    if t[0] in ('서울', '인천', '충남'): flags.append('주소_시도약칭')
    if re.search(r'\b\d{5}\b\s*$', h['address']): flags.append('주소_우편번호잔존')
    if re.search(r'[<>]|&[a-z]+;|\\', h['address']): flags.append('주소_특수문자')
    if h['sourceUrl'] != 'https://www.resmed.kr/psg-finder/'+h['id']: flags.append('sourceUrl형식')
    if not re.fullmatch(r'[a-z0-9-]+', h['id']): flags.append('id형식')
    for f in flags: cnt[re.sub(r'\(.*', '', f)] += 1
    if not flags: cnt['이상없음'] += 1
    rows.append([h['id'], h['name'], len(h['name']), h['region'], h['address'], '|'.join(flags)])
out('results_name_addr.csv', ['id', 'name', 'name_len', 'region', 'address', 'flags'], rows)
S['name'] = dict(cnt); S['name_flagged'] = [r for r in rows if r[5] and r[5] != '동명']
S['same_name'] = {n: [(h['id'], h['address']) for h in items if h['name'] == n] for n, c in nc.items() if c > 1}
json.dump(S, open(os.path.join(HERE, 'summary.json'), 'w'), ensure_ascii=False, indent=1, default=str)
for k in ('links', 'phone', 'coords', 'name', 'coord_sigfig', 'coord_vs_detail_n'): print(k, S[k])
print('phone_bad', *S['phone_bad'], sep='\n ')
print('phone_dups', *S['phone_dups'], sep='\n ')
print('coords_bad', *S['coords_bad'], sep='\n ')
print('coord_dups', *S['coord_dups'], sep='\n ')
print('detail>1km', *S['coord_vs_detail_over_1km'], sep='\n ')
print('name_flagged', *S['name_flagged'], sep='\n ')
print('same_name', len(S['same_name']), sum(len(v) for v in S['same_name'].values()))
print('links_fail', *S['links_fail'], sep='\n ')
