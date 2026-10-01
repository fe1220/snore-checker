# 근거 자료: 규모·지연·위험·시장

문제 정의(`../01-problem-definition.md`)에서 인용한 수치의 원 출처. 조사일 2026-10-01.
"추정"은 출처 수치를 조합해 직접 계산한 값이다.

## 1. 진료 인원 (심평원 보건의료빅데이터개방시스템, 4단 상병, 심사년도 기준)

출처: https://opendata.hira.or.kr/op/opc/olap4thDsInfoTab1.do (데이터 적재 2026-09-28)

| 코드 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|
| G47.3 수면무호흡 | 101,348 | 113,224 | 153,802 | 184,255 | 196,015 |
| G47.4 기면병 및 탈력발작 | 5,810 | 6,646 | 7,917 | 8,551 | 9,049 |
| G47.8 기타 수면장애 | 42,288 | 46,744 | 50,635 | 52,982 | 55,641 |
| (참고) G47.0 불면증 | 434,538 | 461,420 | 477,870 | 491,702 | 501,603 |

- 60세 이상(2025): G47.3 48,412명, G47.4 554명, G47.8 32,255명(G47.8 전체의 58%). 연령 구간 합산이라 근사치.
- 렘수면행동장애(RBD)는 KCD-8·9 모두 별도 코드가 없다. G47.8에 포함되는 것으로 추정(koicd.kr 색인에서 직접 확인 못 함).

## 2. 유병률

| 질환 | 수치 | 출처 |
|---|---|---|
| 수면무호흡 | 성인 남 약 4%, 여 약 2% (원 연구: 안산 코호트 남 4.5%, 여 3.2%) | 대한의사협회지 2020;63(7) https://jkma.org/journal/view.php?number=3136&viewtype=pubreader / Kim et al., AJRCCM 2004 (원문 미확인) |
| 기면증 | 국내 진단 기준 10만 명당 8.4명(2019) | 대한신경과학회·대한수면연구학회, 의협신문 2023-01-31 https://www.doctorsnews.co.kr/news/articleView.html?idxno=148252 |
| RBD | 60세 이상 2.01% (비디오 수면다원검사 확인) | Kang et al., SLEEP 2013 https://pmc.ncbi.nlm.nih.gov/articles/PMC3700711/ |

## 3. 진료율 추정 (직접 계산)

- **수면무호흡:** 성인 약 4,300만 명 × 유병률 약 3% ≈ 130만 명 vs 2025년 진료 19.6만 명 → **약 15%**.
- **RBD:** 60세 이상 약 1,400만 명(근사) × 2.01% ≈ 28만 명 vs G47.8 60세 이상 진료 3.2만 명 → G47.8 전체를 RBD로 봐도 **최대 약 12%**.
- **기면증:** 해외 유병률(10만 명당 25~50명)은 1차 출처를 확인하지 못해 진료율 계산에 쓰지 않는다. 진단 지연 통계를 근거로 쓴다.

## 4. 진단 지연과 원인

| 질환 | 수치 | 출처 |
|---|---|---|
| 기면증 | 첫 증상 18.2세 → 진단 28.3세, 평균 10.3년(중앙값 7년), 국내 다기관 | Sleep Medicine 2025, PMID 40544786 https://pubmed.ncbi.nlm.nih.gov/40544786 |
| 기면증 | 평균 약 11년 지연, 지연 이유 1위 "질환 인지 부족" 74.6% | J Sleep Med 2024 https://www.e-jsm.org/journal/view.php?doi=10.13078%2Fjsm.240016 |
| RBD | 평균 8.7년(중앙값 4.5년), 이유: "심각하지 않다고 생각" 59% | White et al., JCSM 2012 https://jcsm.aasm.org/doi/10.5664/jcsm.1762 |
| RBD | 환자 44%가 자기 꿈-행동화를 모름, 70%는 "잘 잔다"고 인식, 배우자 관찰이 내원의 핵심 계기 | Fernández-Arcos et al., Sleep 2016 https://pubmed.ncbi.nlm.nih.gov/26940460/ (수치는 해설 논문 https://pmc.ncbi.nlm.nih.gov/articles/PMC4678359/ 에서 확인) |

## 5. 옆 사람(파트너·가족) 관련 근거

| 내용 | 출처 |
|---|---|
| OSA 환자 1,166명 중 파트너 동반 내원 남 83.1%, 여 52.6% (스페인. "발견"이 아니라 "동반") | Respiratory Medicine 2004 "Gender differences in OSA syndrome: a clinical study of 1166 patients" https://www.sciencedirect.com/science/article/pii/S0954611104001064 |
| 20쌍 인터뷰: "파트너의 재촉"이 진단을 이끈 가장 큰 요인 | Ye et al., JCSM 2022 https://pmc.ncbi.nlm.nih.gov/articles/PMC8883110/ |
| RBD 환자 배우자의 62.5%가 수면 중 부상 경험 | Sleep Medicine (연도 미확인) https://www.sciencedirect.com/science/article/abs/pii/S1389945716301265 |
| 한국 OSA 환자 1,224명 중 목격된 무호흡 남 73.9%, 여 46.7% | Pyun et al., Sleep Med Res 2020 https://www.sleepmedres.org/journal/view.php?doi=10.17241%2Fsmr.2020.00556 |
| OSA가 심할수록 본인의 증상 인식이 낮다 (환자·배우자 282명 설문, 수치 미확인) | 이세영·강승걸 외, 수면정신생리 2016 https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002124639 |
| 스스로 "코 안 곤다"고 한 여성의 36.5%가 실제로는 심한 코골이 (n=1,913) | Westreich et al., JCSM 2019 https://jcsm.aasm.org/doi/10.5664/jcsm.7678 |
| 코골이·목격된 무호흡이 있는 사람 중 10년간 실제 의뢰된 건 20% 미만 (스웨덴 n=4,648) | Larsson et al., Chest 2003 https://pubmed.ncbi.nlm.nih.gov/12853524/ |
| 국민 4,000명 중 수면다원검사 필요성 인지 33.0%, 치료 중 0.5% | Kim KT et al., J Sleep Med 2022 https://www.e-jsm.org/journal/view.php?viewtype=pubreader&number=343 |
| 이스라엘 OSA 환자 65명 심층 인터뷰: 기혼 남성은 "건강은 신경 안 쓴다"고 말하지만 아내가 진료 관련 일(illness work)을 상당 부분 대신한다. 기혼 여성은 "남에게 주는 불편", 남성은 "본인 불편"을 진료 동기로 강조 | Zarhin, Health (London) 2018 "Delaying and seeking care for obstructive sleep apnea: The role of gender, family, and morality" https://pubmed.ncbi.nlm.nih.gov/27895102/ |
| 파트너 요청으로 온 군과 자가 의뢰 군을 구분해 비교할 만큼 파트너 경로가 별도로 존재 (비율 미확인) | Hoy et al., AJRCCM 1999 https://pubmed.ncbi.nlm.nih.gov/10194151/ |

**"배우자 권유로 내원한 비율"을 직접 측정한 연구는 국내외 모두 찾지 못했다.**

**반대 근거:**
- 호주 OSA 192명: 진료를 찾을지 예측한 변수는 **본인이 보고한** 코골이·호흡정지·피로 (Munks et al., Sleep Health 2019 https://pubmed.ncbi.nlm.nih.gov/30670173/).
- 자가 의뢰 군이 파트너 요청 군보다 양압기 사용이 더 좋았다 (Hoy 1999). 파트너 권유가 유일한 경로는 아니고, 본인 동기가 치료 지속에 중요하다.
- 중국 OSA 350명: 약 80%가 "스스로 인지한 증상"으로 내원(단, 목격된 무호흡 32.9% 포함) (Li et al., J Thorac Dis 2014 https://jtd.amegroups.org/article/view/2340/html).

## 6. 미치료 시 위험

| 내용 | 출처 |
|---|---|
| OSA 교통사고 위험 약 2.4배 (메타분석) | Tregear et al., JCSM 2009 (2차 확인) https://www.researchgate.net/publication/44594535 |
| 미치료 중증 OSA 치명적 심혈관 사건 OR 2.87, 비치명적 OR 3.17. CPAP 치료군은 위험 감소 | Marin et al., Lancet 2005 https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(05)71141-7/abstract |
| 수면무호흡 환자 급성 심정지 위험 54% 증가 (질병관리청 자료 인용) | 경향신문 2024-11-21 https://www.khan.co.kr/article/202411210600035 |
| RBD → 신경퇴행 질환 연 6.3% 전환, 10년 누적 60.2% | Postuma et al., Brain 2019 https://academic.oup.com/brain/article/142/3/744/5353011 |

## 7. 수면다원검사 급여

- 2018-07-01 건강보험 적용. 대상: 수면무호흡·기면증·특발성 과다수면 의심. 단순 코골이 제외. 의사 판단과 조건(증상·진찰 소견 등) 필요. (대한의사협회지 2020, 위 링크)
- 본인부담 20%, 약 11.6만~14.4만 원. 의협신문 2018-03-20 https://www.doctorsnews.co.kr/news/articleView.html?idxno=122422
- 수가: 의원 578,734원 / 종합병원 638,291원 / 상급종합 717,643원 (복지부 범위 554,870~717,643원).

## 8. 시장·수익 구조

| 내용 | 출처 |
|---|---|
| 수면다원검사 건수 2018 19,067 → 2019 82,198(정점) → 2021 75,591. 2019년 건수의 68%가 의원급(병원 포함) | Kim J. et al., 대한이비인후과학회지 2024;67(4) https://www.kjorl.org/journal/view.php?viewtype=pubreader&number=8780 |
| 수면무호흡 관련 의료비 2017 86억 → 2019 550억 → 2022 657억 원 | 같은 논문 |
| 양압기 처방의 49.9%가 의원급 (2018.7~2020.3) | Kim M. et al., J Sleep Med 2020 https://www.e-jsm.org/journal/view.php?viewtype=pubreader&number=286 |
| 양압기 사용자 2021 81,744 → 2025 190,893명, 공단부담 411억 → 1,251억 원, 5년 이상 장기 사용 34,042명 | 소병훈 의원실·건보공단, CF뉴스 2026-09-28 https://www.cfnews.kr/news/article.html?no=112349 |
| 수면장애 전체(G47+F51) 2023 124만 명, 진료비 3,227억 원 | 2024 국감, 아시아경제 https://www.asiae.co.kr/article/2024100209305946311 |

- 미확인: 수면다원검사 시행기관 수 공식 통계, 수면클리닉 수익률, 키워드 광고 단가.

## 9. 자가진단 척도 라이선스

| 척도 | 사용 조건 |
|---|---|
| ESS (엡워스 졸림 척도) | 기관·상업·디지털 구현은 Mapi Research Trust 라이선스 필요 https://eprovide.mapi-trust.org/instruments/epworth-sleepiness-scale |
| STOP-Bang | 개발자(UHN) 허가 필요 https://site.thoracic.org/assemblies/srn/sleep-related-questionnaires/stop-bang |
| ISI (불면증 심각도) | Mapi Research Trust 라이선스 필요 |

→ 원문 문항을 그대로 쓰지 않고, 판단 기준을 참고한 자체 관찰 문항을 만들고 참고 출처를 밝힌다.

## 10. 수면 잠복기 기준

- 다중수면잠복기검사(MSLT) 평균 8분 이하 = 병적 졸림, 정상 성인 10~20분. ICSD-3-TR https://aasm.org/wp-content/uploads/2022/05/ICSD-3-TR-Hypersomnolence-Draft.pdf
- MSLT는 낮 낮잠 검사라 밤 입면 시간과 같은 기준이 아니다. 카피는 "검사해볼 만한 신호" 수준으로 쓴다.

## 11. 가족 불편이 진료 계기라는 근거

- 칠레 OSA 환자 중 이비인후과 경유 124명의 62.19%가 "가족이 불편해하는 코골이"를 의뢰 사유로 가짐. Salas et al., J Otolaryngol Head Neck Surg 2019 https://pmc.ncbi.nlm.nih.gov/articles/PMC6805651/
- 기혼 여성은 진료 동기로 "남에게 주는 불편"을, 남성은 "본인 불편"을 강조. Zarhin 2018 (§5)
