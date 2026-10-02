"""심평원 "전국 병의원 및 약국 현황" 압축 파일에서 수면다원검사 실시기관만 뽑아 crawler/data/hira-psg.json을 만든다.

실행: python3 crawler/scripts/build_hira_snapshot.py "<압축 파일 경로>"
"""
import io
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "hira-psg.json"

# 특수진료정보서비스에서 수면다원검사 실시기관을 가리키는 코드
PSG_CODE = "SH"
# 건수가 이보다 적으면 파일 형식이 바뀐 것으로 보고 이전 스냅샷을 지킨다
MIN_ITEMS = 600


def column_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_xlsx(data):
    """첫 시트의 값을 행 목록으로 읽는다. 빈 셀은 파일에 없어서 셀 주소로 자리를 맞춘다."""
    book = zipfile.ZipFile(io.BytesIO(data))
    strings = []
    if "xl/sharedStrings.xml" in book.namelist():
        for si in ET.parse(book.open("xl/sharedStrings.xml")).getroot().findall(NS + "si"):
            strings.append("".join(t.text or "" for t in si.iter(NS + "t")))
    rows = []
    for _, el in ET.iterparse(book.open("xl/worksheets/sheet1.xml")):
        if el.tag != NS + "row":
            continue
        row = []
        for c in el.findall(NS + "c"):
            i = column_index(c.get("r")) if c.get("r") else len(row)
            while len(row) < i:
                row.append("")
            v = c.find(NS + "v")
            kind = c.get("t")
            if kind == "s":
                value = strings[int(v.text)]
            elif kind == "inlineStr":
                value = "".join(t.text or "" for t in c.iter(NS + "t"))
            else:
                value = v.text if v is not None else ""
            row.append((value or "").strip())
        rows.append(row)
        el.clear()
    return rows


def find_member(archive, number):
    """압축 파일 안 한글 파일명은 인코딩이 깨져 보일 수 있어 앞의 번호로 찾는다."""
    found = [n for n in archive.namelist() if n.rsplit("/", 1)[-1].startswith(f"{number}.") and n.endswith(".xlsx")]
    if len(found) != 1:
        raise SystemExit(f"{number}번 파일을 찾지 못했습니다: {found}")
    return found[0]


def table(rows):
    """머리글 이름으로 값을 꺼낼 수 있게 dict 목록으로 바꾼다."""
    header = rows[0]
    return [dict(zip(header, row + [""] * (len(header) - len(row)))) for row in rows[1:]]


def require_columns(records, columns, label):
    missing = [c for c in columns if c not in records[0]]
    if missing:
        raise SystemExit(f"{label}에 열이 없습니다: {missing} (있는 열: {list(records[0])})")


def in_korea(lat, lng):
    return 33.0 <= lat <= 38.7 and 124.5 <= lng <= 131.9


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    path = sys.argv[1]
    archive = zipfile.ZipFile(path)

    hospital_file = find_member(archive, 1)
    special_file = find_member(archive, 10)
    version = re.search(r"\((\d{4}\.\d{1,2})\.?\)", hospital_file)
    if not version:
        raise SystemExit(f"파일명에서 기준 시점을 읽지 못했습니다: {hospital_file!r}")

    special = table(read_xlsx(archive.read(special_file)))
    require_columns(special, ["암호화요양기호", "검색코드"], "10번 파일")
    psg = {r["암호화요양기호"] for r in special if r["검색코드"] == PSG_CODE}
    print(f"수면다원검사 실시기관(코드 {PSG_CODE}): {len(psg)}곳")

    hospitals = table(read_xlsx(archive.read(hospital_file)))
    columns = ["암호화요양기호", "요양기관명", "종별코드명", "주소", "전화번호", "병원홈페이지", "좌표(X)", "좌표(Y)"]
    require_columns(hospitals, columns, "1번 파일")

    items = []
    skipped = []
    seen = set()
    for r in hospitals:
        ykiho = r["암호화요양기호"]
        if ykiho not in psg:
            continue
        seen.add(ykiho)
        try:
            # 원본에 128.69189449999999처럼 부동소수 꼬리가 붙어 있다. 7자리면 1cm 단위다
            lng, lat = round(float(r["좌표(X)"]), 7), round(float(r["좌표(Y)"]), 7)
        except ValueError:
            skipped.append(f"{r['요양기관명']} (좌표 없음)")
            continue
        if not in_korea(lat, lng):
            skipped.append(f"{r['요양기관명']} (한국 범위 밖: {lat}, {lng})")
            continue
        if not r["요양기관명"] or not r["주소"]:
            skipped.append(f"{ykiho[:12]}… (이름이나 주소 없음)")
            continue
        items.append(
            {
                "ykiho": ykiho,
                "name": r["요양기관명"],
                "kind": r["종별코드명"],
                "address": r["주소"],
                "phone": r["전화번호"] or None,
                "homepage": r["병원홈페이지"] or None,
                "lat": lat,
                "lng": lng,
            }
        )

    print(f"병원정보에 없는 실시기관: {len(psg - seen)}곳")
    print(f"뺀 기관: {len(skipped)}곳")
    for line in skipped:
        print(f"  - {line}")

    if len(items) < MIN_ITEMS:
        raise SystemExit(f"{len(items)}건으로 {MIN_ITEMS}건보다 적어 저장하지 않습니다")

    # 분기마다 다시 만들 때 바뀐 기관만 diff에 보이도록 정렬하고 한 줄에 한 기관씩 쓴다
    items.sort(key=lambda item: item["ykiho"])
    lines = ",\n".join("    " + json.dumps(item, ensure_ascii=False) for item in items)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(f'{{\n  "version": {json.dumps(version.group(1))},\n  "items": [\n{lines}\n  ]\n}}\n', encoding="utf-8")
    print(f"저장: {OUTPUT} ({len(items)}건, 기준 {version.group(1)})")


if __name__ == "__main__":
    main()
