export type Place = { name: string; address: string; phone: string | null }

export function normalizePhone(phone: string | null): string {
  return (phone ?? "").replace(/\D/g, "")
}

// 같은 병원이 "의료법인 길의료재단 길병원"과 "길병원"처럼 법인명이 붙거나 빠진 채로 적혀 있다.
export function normalizeName(name: string): string {
  const bare = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\s/g, "")
    .replace(/^(의료|학교|재단|사회복지|사단)법인/, "")
  return /^.*?(?:의료재단|재단|학원)(.+)$/.exec(bare)?.[1] ?? bare
}

// 진료과와 기관 종류는 서로 다른 병원끼리도 겹쳐서, 남겨 두면 "참이비인후과의원"과 "제일이비인후과의원"이 비슷하게 나온다.
// "종합"·"요양"은 같은 법인의 다른 기관을 가르는 말이라 지우지 않는다.
const GENERIC_WORDS = /이비인후과|정신건강의학과|소아청소년과|가정의학과|성형외과|신경외과|신경과|내과|외과|의원|병원/g

function bigrams(text: string): string[] {
  if (text.length < 2) return [text]
  return Array.from({ length: text.length - 1 }, (_, i) => text.slice(i, i + 2))
}

const SIMILARITY_THRESHOLD = 0.6

// 겹치는 두 글자 묶음의 비율(Dice 계수)로 본다. "두리이비인후과의원 남동탄점"과 "남동탄두리이비인후과의원"처럼 순서가 바뀐 이름을 잡는다.
export function isSimilarName(a: string, b: string): boolean {
  const [nameA, nameB] = [normalizeName(a), normalizeName(b)]
  if (nameA === nameB) return nameA !== ""

  const [coreA, coreB] = [nameA.replace(GENERIC_WORDS, ""), nameB.replace(GENERIC_WORDS, "")]
  if (coreA === "" || coreB === "") return false

  const [gramsA, rest] = [bigrams(coreA), bigrams(coreB)]
  let shared = 0
  for (const gram of gramsA) {
    const index = rest.indexOf(gram)
    if (index === -1) continue
    rest.splice(index, 1)
    shared += 1
  }
  return (2 * shared) / (gramsA.length + bigrams(coreB).length) >= SIMILARITY_THRESHOLD
}

// 층·호수·동 이름 표기는 출처마다 달라서 도로명과 건물번호만 쓴다.
// 같은 도로명이 여러 도시에 있어 시·군·구를 함께 넣는다. 시·도는 "강원도"·"강원특별자치도"처럼 표기가 갈려 넣지 않는다.
export function addressKey(address: string): string | null {
  const tokens = address.replace(/\([^)]*\)/g, " ").replaceAll(",", " ").split(/\s+/).filter(Boolean)
  if (tokens[0] === "대한민국") tokens.shift()

  for (let i = 1; i < tokens.length - 1; i++) {
    if (!/(로|길)$/.test(tokens[i])) continue
    let road = tokens[i]
    let next = i + 1
    // "마상로 154번길 68"처럼 띄어 쓴 표기
    if (/^\d+번?길$/.test(tokens[next])) {
      road += tokens[next]
      next += 1
    }
    const number = /^(\d+)(?:-(\d+))?(?:번지)?$/.exec(tokens[next] ?? "")
    if (!number) continue
    const sub = number[2] && Number(number[2]) !== 0 ? `-${number[2]}` : ""
    // 세종시는 시·군·구가 없어 시·도가 그 자리에 온다
    const district = i === 1 ? tokens[0] : tokens[1]
    return `${district} ${road} ${number[1]}${sub}`
  }
  return null
}

// 하나의 신호만으로는 맞추지 않는다. 같은 전화번호를 쓰는 다른 기관과 동명 병원이 실제로 있다.
// 강한 조건부터 보고, 그 조건의 후보가 하나일 때만 맞춘다.
export function findMatch<T extends Place>(target: Place, candidates: T[]): T | null {
  const phone = normalizePhone(target.phone)
  const address = addressKey(target.address)

  const samePhone = (c: T) => phone !== "" && normalizePhone(c.phone) === phone
  const sameAddress = (c: T) => address !== null && addressKey(c.address) === address
  const similarName = (c: T) => isSimilarName(c.name, target.name)

  const rules = [
    (c: T) => samePhone(c) && sameAddress(c),
    (c: T) => samePhone(c) && similarName(c),
    (c: T) => sameAddress(c) && similarName(c),
  ]

  for (const rule of rules) {
    const found = candidates.filter(rule)
    if (found.length === 1) return found[0]
    if (found.length > 1) return null
  }
  return null
}
