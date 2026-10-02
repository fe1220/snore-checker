"""수면다원검사 병원 공급 공백 분석 (시·군·구 단위).
입력: 저장소 frontend/src/data/hospitals.json (읽기만), raw/pop_age5.utf8.csv (행안부), raw/sgg.json (2018 경계)
단위: 시/군/자치구. 일반구(수원시 장안구 등)는 시로 합친다. 세종은 1개 단위.
"""
import csv, json, math, re, collections
HOSP = '/Users/skm/dev/subject/frontend/src/data/hospitals.json'
SIDO = {'서울':'서울특별시','서울특별시':'서울특별시','부산':'부산광역시','부산광역시':'부산광역시','대구':'대구광역시','대구광역시':'대구광역시',
 '인천':'인천광역시','인천광역시':'인천광역시','광주':'전남광주통합특별시','광주광역시':'전남광주통합특별시','전남':'전남광주통합특별시','전라남도':'전남광주통합특별시',
 '전남광주통합특별시':'전남광주통합특별시','대전':'대전광역시','대전광역시':'대전광역시','울산':'울산광역시','울산광역시':'울산광역시',
 '세종':'세종특별자치시','세종특별자치시':'세종특별자치시','세종시':'세종특별자치시','경기':'경기도','경기도':'경기도',
 '강원':'강원특별자치도','강원도':'강원특별자치도','강원특별자치도':'강원특별자치도','충북':'충청북도','충청북도':'충청북도','충남':'충청남도','충청남도':'충청남도',
 '전북':'전북특별자치도','전라북도':'전북특별자치도','전북특별자치도':'전북특별자치도','경북':'경상북도','경상북도':'경상북도','경남':'경상남도','경상남도':'경상남도',
 '제주':'제주특별자치도','제주도':'제주특별자치도','제주특별자치도':'제주특별자치도'}
num = lambda s: int(s.replace(',', '') or 0)

# 1) 인구
rows = list(csv.reader(open('raw/pop_age5.utf8.csv', encoding='utf-8')))
hdr = rows[0]
c_tot = hdr.index([h for h in hdr if h.endswith('_계_총인구수')][0])
c_4069 = [i for i, h in enumerate(hdr) if '_계_' in h and re.search(r'_(40~44|45~49|50~54|55~59|60~64|65~69)세$', h)]
assert len(c_4069) == 6
units = {}   # (sido, sgg) -> dict
sido_pop = {}
for r in rows[1:]:
    m = re.match(r'^(\S+)\s+(.*?)\s*\((\d{10})\)$', r[0])
    sido, rest, code = m.group(1), m.group(2).strip(), m.group(3)
    if not code.endswith('00000'): continue          # 읍면동 제외
    toks = rest.split()
    rec = dict(code=code, pop=num(r[c_tot]), pop4069=sum(num(r[i]) for i in c_4069))
    if code.endswith('00000000'): sido_pop[sido] = rec; continue
    if sido == '세종특별자치시': units[(sido, '세종시')] = rec; continue
    if len(toks) == 1: units[(sido, toks[0])] = rec    # 시/군/자치구 (일반구 행은 건너뜀)
units = {k: v for k, v in units.items() if v['pop'] > 0}
assert abs(sum(u['pop'] for u in units.values()) - sum(s['pop'] for s in sido_pop.values())) == 0, 'unit sum != sido sum'

# 2) 병원 -> 시군구
items = json.load(open(HOSP))['items']
INCHEON_2026 = {}
_MAN = {'봉오재3로': '서해구', '심곡로100번길': '서해구', '원적로': '서해구', '이음대로': '검단구', '고산후로': '검단구', '인항로': '제물포구', '하늘중앙로': '영종구'}
for h in items:
    t = h['address'].split()
    if t[0] in ('인천', '인천광역시') and t[1] in ('서구', '중구', '동구'):
        INCHEON_2026[h['id']] = _MAN[t[2]]
failed = []
for h in items:
    t = h['address'].split()
    if t and t[0] == '대한민국': t = t[1:]
    sido = SIDO.get(t[0]) if t else None
    key = None
    h['manual'] = False
    if h['id'] in INCHEON_2026:   # 2026-07 인천 행정체제 개편: 주소는 옛 구(서구/중구) 표기 -> 도로명·법정동으로 수동 배정
        h['unit'] = ('인천광역시', INCHEON_2026[h['id']]); h['manual'] = True; continue
    if sido == '세종특별자치시': key = (sido, '세종시')
    elif sido and len(t) > 1:
        key = (sido, t[1])
        if key not in units:
            key = None
    h['unit'] = key
    if key is None: failed.append(h)
for u in units.values(): u['n'] = 0
for h in items:
    if h['unit']: units[h['unit']]['n'] += 1

# 3) 중심 좌표 (2018 KOSTAT 경계, 면적 가중 기하 중심; 일반구는 시로 합침)
KSIDO = {'11':'서울특별시','21':'부산광역시','22':'대구광역시','23':'인천광역시','24':'전남광주통합특별시','25':'대전광역시','26':'울산광역시','29':'세종특별자치시',
 '31':'경기도','32':'강원특별자치도','33':'충청북도','34':'충청남도','35':'전북특별자치도','36':'전남광주통합특별시','37':'경상북도','38':'경상남도','39':'제주특별자치도'}
def ring_c(ring):
    a = cx = cy = 0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        f = x1*y2 - x2*y1; a += f; cx += (x1+x2)*f; cy += (y1+y2)*f
    return a/2, cx, cy
acc = collections.defaultdict(lambda: [0, 0, 0])
for f in json.load(open('raw/sgg.json'))['features']:
    p = f['properties']; sido = KSIDO[p['code'][:2]]; name = p['name']
    m = re.match(r'^(.+?시)(.+구)$', name)
    if m and sido not in ('서울특별시',) and not sido.endswith('광역시') and (sido, m.group(1)) in units: name = m.group(1)
    if sido == '세종특별자치시': name = '세종시'
    if name == '군위군': sido = '대구광역시'          # 2023 편입
    if name == '남구' and sido == '인천광역시': name = '미추홀구'  # 2018 개칭
    g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        a, cx, cy = ring_c(poly[0]); s = acc[(sido, name)]
        s[0] += abs(a); sgn = 1 if a > 0 else -1; s[1] += sgn*cx; s[2] += sgn*cy
for k, u in units.items():
    if k in acc:
        a, cx, cy = acc[k]; u['clng'] = cx/(6*a); u['clat'] = cy/(6*a)
no_centroid = [k for k, u in units.items() if 'clat' not in u]
def hav(a, b, c, d):
    p = math.pi/180; x = math.sin((c-a)*p/2)**2 + math.cos(a*p)*math.cos(c*p)*math.sin((d-b)*p/2)**2
    return 12742*math.asin(math.sqrt(x))
# 좌표 이상치: 주소상 시군구 중심에서 40km 넘게 떨어진 병원 좌표는 거리 계산에서 제외
bad = []
for h in items:
    u = units.get(h['unit']) if h['unit'] else None
    h['coord_ok'] = True
    if u and 'clat' in u:
        d = hav(u['clat'], u['clng'], h['lat'], h['lng'])
        if d > 40: h['coord_ok'] = False; bad.append((h['name'], h['address'], round(d, 1)))
good = [h for h in items if h['coord_ok']]
for u in units.values():
    if 'clat' in u:
        d, hh = min(((hav(u['clat'], u['clng'], h['lat'], h['lng']), h) for h in good), key=lambda t: t[0])
        u['near_km'] = round(d, 1); u['near_name'] = hh['name']

# 4) 산출
TP = sum(u['pop'] for u in units.values()); T4 = sum(u['pop4069'] for u in units.values())
with open('sigungu.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['sido','sigungu','code','hospitals','pop_total','pop_40_69','per100k_total','per100k_40_69','centroid_lat','centroid_lng','nearest_km','nearest_hospital'])
    for (s, g), u in sorted(units.items(), key=lambda kv: kv[1]['code']):
        w.writerow([s, g, u['code'], u['n'], u['pop'], u['pop4069'], round(u['n']/u['pop']*1e5, 2), round(u['n']/u['pop4069']*1e5, 2),
                    round(u.get('clat', 0), 4) or '', round(u.get('clng', 0), 4) or '', u.get('near_km', ''), u.get('near_name', '')])
# 시도별 (광주/전남은 통합특별시 1개로 집계 + 구 광주 5개 구 별도 표기)
sd = collections.defaultdict(lambda: dict(n=0, pop=0, p4=0, units=0, zero=0, zpop=0))
def sdname(s, g):
    if s == '전남광주통합특별시': return '전남광주(옛 광주)' if g in ('동구','서구','남구','북구','광산구') else '전남광주(옛 전남)'
    return s
for (s, g), u in units.items():
    d = sd[sdname(s, g)]; d['n'] += u['n']; d['pop'] += u['pop']; d['p4'] += u['pop4069']; d['units'] += 1
    if u['n'] == 0: d['zero'] += 1; d['zpop'] += u['pop']
with open('sido.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['sido','hospitals','pop_total','pop_40_69','per100k_total','per100k_40_69','sigungu_count','zero_sigungu','zero_pop','zero_pop_share'])
    for s, d in sorted(sd.items(), key=lambda kv: -kv[1]['n']/kv[1]['pop']):
        w.writerow([s, d['n'], d['pop'], d['p4'], round(d['n']/d['pop']*1e5, 2), round(d['n']/d['p4']*1e5, 2), d['units'], d['zero'], d['zpop'], round(d['zpop']/d['pop'], 3)])
with open('unparsed_or_flagged.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f); w.writerow(['kind','name','address','km_from_own_sigungu_centroid'])
    for h in failed: w.writerow(['unparsed', h['name'], h['address'], ''])
    for b in bad: w.writerow(['coord_outlier', *b])

zero = [u for u in units.values() if u['n'] == 0]
print('manual incheon', len(INCHEON_2026))
print('hospitals', len(items), 'parsed', len(items)-len(failed), 'failed', len(failed), [(h['name'], h['address']) for h in failed])
print('units', len(units), 'pop', TP, 'pop4069', T4)
print('zero units', len(zero), 'pop', sum(u['pop'] for u in zero), round(sum(u['pop'] for u in zero)/TP*100, 1), '% | 4069', sum(u['pop4069'] for u in zero), round(sum(u['pop4069'] for u in zero)/T4*100, 1), '%')
for kind in ('시','군','구'):
    us = [u for (s, g), u in units.items() if g.endswith(kind)]; z = [u for u in us if u['n'] == 0]
    print(kind, len(us), 'zero', len(z), 'zero pop', sum(u['pop'] for u in z))
print('national per100k', round(len(items)/TP*1e5, 2), 'per100k 40-69', round(len(items)/T4*1e5, 2))
for s, d in sorted(sd.items(), key=lambda kv: -kv[1]['n']/kv[1]['pop']):
    print(f"{s}\t{d['n']}\t{d['pop']}\t{d['n']/d['pop']*1e5:.2f}\t{d['n']/d['p4']*1e5:.2f}\tzero {d['zero']}/{d['units']}\t{d['zpop']/d['pop']*100:.0f}%")
L = sorted(units.items(), key=lambda kv: -kv[1]['n']/kv[1]['pop'])
print('TOP'); [print(k, u['n'], u['pop'], round(u['n']/u['pop']*1e5, 2)) for k, u in L[:10]]
nz = [x for x in L if x[1]['n'] > 0]
print('BOTTOM nonzero'); [print(k, u['n'], u['pop'], round(u['n']/u['pop']*1e5, 2)) for k, u in nz[-10:]]
print('BIGGEST ZERO'); [print(k, u['pop'], u.get('near_km')) for k, u in sorted(((k, u) for k, u in units.items() if u['n'] == 0), key=lambda kv: -kv[1]['pop'])[:12]]
vals = sorted(u['n']/u['pop']*1e5 for u in units.values()); print('median per100k', vals[len(vals)//2])
print('no centroid', no_centroid, 'coord outliers', bad)
D = [u for u in units.values() if 'near_km' in u]
for th in (10, 20, 30, 50):
    x = [u for u in D if u['near_km'] > th]; print('>', th, 'km units', len(x), 'pop', sum(u['pop'] for u in x), round(sum(u['pop'] for u in x)/TP*100, 1), '% | 4069', sum(u['pop4069'] for u in x))
print('FARTHEST'); [print(k, u['near_km'], u['near_name'], u['pop']) for k, u in sorted(((k, u) for k, u in units.items() if 'near_km' in u), key=lambda kv: -kv[1]['near_km'])[:12]]
zd = sorted(u['near_km'] for u in zero if 'near_km' in u); print('zero-unit median nearest', zd[len(zd)//2], 'n', len(zd))
