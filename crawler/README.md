# crawler

레즈메드 병원찾기를 긁어 `frontend/src/data/hospitals.json`을 만든다. 좌표는 심평원 공공 데이터 스냅샷(`data/hira-psg.json`)으로 바로잡는다.

```sh
make crawl           # 수집 → 스냅샷과 맞추기 → 검증 → 저장
make crawler-check   # 타입 검사와 테스트
```

## 심평원 스냅샷 갱신 (분기마다, 사람이 한다)

`data/hira-psg.json`은 건강보험심사평가원 "전국 병의원 및 약국 현황"에서 수면다원검사 실시기관(특수진료 코드 `SH`)만 뽑은 것이다. 파일을 올려둔 사이트가 자동 수집을 막고 있어 분기마다 직접 받는다.

1. 공공데이터포털(data.go.kr)에서 "건강보험심사평가원\_전국 병의원 및 약국 현황"의 최신 분기 압축 파일(xlsx 12개, 약 60MB)을 내려받는다.
2. 저장소 밖에 두고 아래를 실행한다. Python 3 표준 라이브러리만 쓴다.

   ```sh
   python3 crawler/scripts/build_hira_snapshot.py "<내려받은 zip 경로>"
   ```

3. 출력된 건수(2026.6 기준 735건)와 `version`을 확인하고 `data/hira-psg.json`만 커밋한다. 원본 zip·xlsx는 저장소에 넣지 않는다.
4. `make crawl`로 좌표를 다시 맞춘다. 로그의 "못 맞춘 병원"과 "1km 넘게 바뀐 병원"을 훑어본다.

출처: 건강보험심사평가원 "전국 병의원 및 약국 현황" — [공공누리 제1유형](https://www.kogl.or.kr/info/license.do)(출처 표시).
