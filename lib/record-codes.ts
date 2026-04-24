type RecordCodeCategory =
  | "out"
  | "groundout"
  | "double_play"
  | "strikeout"
  | "strikeout_reached"
  | "walk"
  | "intentional_walk"
  | "hit_by_pitch"
  | "single"
  | "double"
  | "triple"
  | "home_run"
  | "sac_bunt"
  | "sac_fly"
  | "error"
  | "fielders_choice"
  | "steal"
  | "caught_stealing"
  | "pickoff"
  | "baserunning_out"
  | "wild_pitch"
  | "passed_ball"
  | "balk"
  | "run_scored"
  | "rbi"
  | "batted_ball_miss"
  | "interference"
  | "advancing"
  | "other_play";

export const recordCodeCategoryLabel: Record<RecordCodeCategory, string> = {
  out: "아웃",
  groundout: "아웃",
  double_play: "아웃",
  strikeout: "아웃",
  strikeout_reached: "출루/안타",
  walk: "출루/안타",
  intentional_walk: "출루/안타",
  hit_by_pitch: "출루/안타",
  single: "출루/안타",
  double: "장타",
  triple: "장타",
  home_run: "장타",
  sac_bunt: "특수기록",
  sac_fly: "특수기록",
  error: "특수기록",
  fielders_choice: "주루",
  steal: "주루",
  caught_stealing: "주루",
  pickoff: "주루",
  baserunning_out: "주루",
  wild_pitch: "특수기록",
  passed_ball: "특수기록",
  balk: "특수기록",
  run_scored: "기본",
  rbi: "기본",
  batted_ball_miss: "특수기록",
  interference: "특수기록",
  advancing: "주루",
  other_play: "기본",
};

export type RecordCodeDefinition = {
  code: string;
  label: string;
  aliases: string[];
  initials?: string;
  category: RecordCodeCategory;
};

const initialConsonants = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

function createDefinition(
  code: string,
  category: RecordCodeCategory,
  aliases: string[] = [],
): RecordCodeDefinition {
  return {
    code,
    label: code,
    aliases,
    initials: getInitialConsonants(code),
    category,
  };
}

function defineBatch(
  codes: string[],
  category: RecordCodeCategory,
  aliases: Record<string, string[]> = {},
) {
  return codes.map((code) =>
    createDefinition(code, category, aliases[code] ?? [code]),
  );
}

const outCodes = [
  "삼진",
  "투땅",
  "포땅",
  "1땅",
  "2땅",
  "3땅",
  "유땅",
  "좌땅",
  "중땅",
  "우땅",
  "투플",
  "포플",
  "1플",
  "2플",
  "3플",
  "유플",
  "좌플",
  "중플",
  "우플",
  "투파플",
  "포파플",
  "1파플",
  "2파플",
  "3파플",
  "유파플",
  "좌파플",
  "중파플",
  "우파플",
  "투직",
  "1직",
  "2직",
  "3직",
  "유직",
  "투인플",
  "포인플",
  "1인플",
  "2인플",
  "3인플",
  "유인플",
  "좌인플",
  "중인플",
  "우인플",
  "투병",
  "포병",
  "1병",
  "2병",
  "3병",
  "유병",
  "좌병",
  "중병",
  "우병",
  "투직병",
  "1직병",
  "2직병",
  "3직병",
  "유직병",
  "투희번",
  "포희번",
  "희번",
  "2희번",
  "3희번",
  "유희번",
  "투희플",
  "포희플",
  "1희플",
  "2희플",
  "3희플",
  "유희플",
  "좌희플",
  "중희플",
  "우희플",
  "투삼중살",
  "포삼중살",
  "1삼중살",
  "2삼중살",
  "3삼중살",
  "유삼중살",
  "좌삼중살",
  "중삼중살",
  "우삼중살",
];

const outAliasMap: Record<string, string[]> = {
  삼진: ["ㅅㅈ", "k"],
};

const hitSafeCodes = [
  "투안",
  "포안",
  "1안",
  "2안",
  "3안",
  "유안",
  "좌안",
  "중안",
  "우안",
  "투번안",
  "포번안",
  "1번안",
  "2번안",
  "3번안",
  "유번안",
  "좌번안",
  "중번안",
  "우번안",
  "투실",
  "포실",
  "1실",
  "2실",
  "3실",
  "유실",
  "좌실",
  "중실",
  "우실",
  "투야선",
  "포야선",
  "1야선",
  "2야선",
  "3야선",
  "유야선",
  "투희플출",
  "포희플출",
  "1희플출",
  "2희플출",
  "3희플출",
  "유희플출",
  "좌희플출",
  "중희플출",
  "우희플출",
  "좌안R",
  "중안R",
  "우안R",
];

const doubleCodes = [
  "좌2",
  "중2",
  "우2",
  "좌전2",
  "중전2",
  "우전2",
  "좌월2",
  "중월2",
  "우월2",
  "좌중2",
  "우중2",
  "인좌2",
  "인우2",
  "인좌중2",
  "인우중2",
  "인중2",
];

const tripleCodes = [
  "좌3",
  "중3",
  "우3",
  "좌전3",
  "중전3",
  "우전3",
  "좌월3",
  "중월3",
  "우월3",
  "좌중3",
  "우중3",
  "인좌3",
  "인우3",
  "인좌중3",
  "인우중3",
  "인중3",
];

const homeRunCodes = [
  "좌월홈",
  "중월홈",
  "우월홈",
  "좌그홈",
  "중그홈",
  "우그홈",
  "좌전그홈",
  "중전그홈",
  "우전그홈",
  "좌중월홈",
  "우중월홈",
  "좌중그홈",
  "우중그홈",
];

const miscHitAliasCodes = ["좌중안", "우중안"];

export const recordCodeDefinitions: RecordCodeDefinition[] = [
  ...defineBatch(
    outCodes,
    "out",
    outAliasMap,
  ),
  createDefinition("낫아웃-", "strikeout", ["ㄴㅇㅇ-", "낫아웃 아웃"]),
  createDefinition("낫아웃+", "strikeout_reached", ["ㄴㅇㅇ+", "낫아웃 출루"]),
  ...defineBatch(["투땅", "포땅"], "groundout", {}),
  ...defineBatch(["1땅", "2땅", "3땅", "유땅", "좌땅", "중땅", "우땅"], "groundout", {}),
  createDefinition("병살", "double_play", ["ㅂㅅ", "dp"]),
  createDefinition("실책", "error", ["ㅅㅊ", "e"]),
  createDefinition("야수선택", "fielders_choice", ["ㅅㅅㅌ", "fc"]),
  createDefinition("희번", "sac_bunt", ["ㅎㅂ", "sac bunt"]),
  createDefinition("희플", "sac_fly", ["ㅎㅍ", "sac fly"]),
  ...defineBatch(
    ["실책"],
    "error",
  ),
  ...defineBatch(
    [
      ...hitSafeCodes,
      ...doubleCodes,
      ...tripleCodes,
      ...homeRunCodes,
      ...miscHitAliasCodes,
    ],
    "single",
  ),
  ...defineBatch(doubleCodes, "double"),
  ...defineBatch(tripleCodes, "triple"),
  ...defineBatch(homeRunCodes, "home_run"),
  ...defineBatch(
    ["좌중안", "우중안"],
    "single",
    {
      좌중안: ["ㅈㅇㅈ", "좌중안"],
      우중안: ["ㅇㅈㅈ", "우중안"],
    },
  ),
  ...defineBatch(
    [
      "볼넷",
      "고의4구",
      "사구",
      "폭투",
      "포일",
      "보크",
      "도루",
      "도루자",
      "견제사",
      "주루사",
      "주자아웃",
      "타구맞음",
      "수비방해",
      "타격방해",
      "주루방해",
      "런다운",
      "포구실책",
      "송구실책",
      "승부주자",
      "타점",
    ],
    "other_play",
    {
      볼넷: ["ㅂㄴ", "bb"],
      고의4구: ["ㄱㅇ4ㄱ", "ibb"],
      사구: ["ㅅㄱ", "hbp"],
      폭투: ["ㅍㅌ", "wp"],
      포일: ["ㅍㅇ", "pb"],
      보크: ["ㅂㅋ", "bk"],
      도루: ["ㄷㄹ", "sb"],
      도루자: ["ㄷㄹㅈ", "cs"],
      견제사: ["ㄱㅈㅅ"],
      주루사: ["ㅈㄹㅅ"],
      주자아웃: ["ㅈㅈㅇ", "ao"],
      타구맞음: ["ㅌㄱㅁㅇ"],
      수비방해: ["ㅅㄸㅂㅎ"],
      타격방해: ["ㅌㄱㅂㅎ"],
      주루방해: ["ㅈㄹㅂㅎ"],
      런다운: ["ㄹㄷ"],
      포구실책: ["ㅍㄱㅅㅈ"],
      송구실책: ["ㅅㄱㅅㅈ"],
      승부주자: ["ㅅㅂㅈㅈ"],
      타점: ["ㅌㅈ", "rbi"],
    },
  ),
  createDefinition("볼넷", "walk", ["ㅂㄴ", "bb"]),
  createDefinition("고의4구", "intentional_walk", ["ㄱㅇ4ㄱ", "ibb"]),
  createDefinition("사구", "hit_by_pitch", ["ㅅㄱ", "hbp"]),
  createDefinition("도루", "steal", ["ㄷㄹ", "sb"]),
  createDefinition("도루자", "caught_stealing", ["ㄷㄹㅈ", "cs"]),
  createDefinition("견제사", "pickoff", ["ㄱㅈㅅ"]),
  createDefinition("주루사", "baserunning_out", ["ㅈㄹㅅ"]),
  createDefinition("주자아웃", "baserunning_out", ["ㅈㅈㅇ", "ao"]),
  ...defineBatch(
    ["타구맞음", "수비방해", "타격방해", "주루방해", "런다운", "포구실책", "송구실책", "승부주자"],
    "other_play",
    {
      타구맞음: ["ㅌㄱㅁ"],
      수비방해: ["ㅅㄸㅂㅎ"],
      타격방해: ["ㅌㄱㅂㅎ"],
      주루방해: ["ㅈㄹㅂㅎ"],
      런다운: ["ㄹㄷ"],
      포구실책: ["ㅍㄱㅅㅈ"],
      송구실책: ["ㅅㄱㅅㅈ"],
      승부주자: ["ㅅㅂㅈㅈ"],
    },
  ),
  ...defineBatch(["타점"], "rbi", {
    타점: ["ㅌㅈ", "rbi"],
  }),
  createDefinition("득점", "run_scored", ["ㄷㅈ", "run"]),
];

const uniqueDefinitions = new Map<string, RecordCodeDefinition>();

for (const definition of recordCodeDefinitions) {
  uniqueDefinitions.set(definition.code, definition);
}

const finalDefinitions = [...uniqueDefinitions.values()];
const normalizedRecordCodeDefinitions = finalizeRecordCodes(finalDefinitions);

const categoryOrder: RecordCodeCategory[] = [
  "strikeout",
  "strikeout_reached",
  "out",
  "groundout",
  "double_play",
  "single",
  "double",
  "triple",
  "home_run",
  "walk",
  "intentional_walk",
  "hit_by_pitch",
  "steal",
  "caught_stealing",
  "pickoff",
  "baserunning_out",
  "fielders_choice",
  "error",
  "sac_bunt",
  "sac_fly",
  "wild_pitch",
  "passed_ball",
  "balk",
  "run_scored",
  "rbi",
  "batted_ball_miss",
  "interference",
  "advancing",
  "other_play",
];

export const recordCodeDefinitionsSorted = [...normalizedRecordCodeDefinitions].sort((a, b) => {
  const orderA = categoryOrder.indexOf(a.category);
  const orderB = categoryOrder.indexOf(b.category);
  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.code.localeCompare(b.code, "ko");
});

function finalizeRecordCodes(
  definitions: RecordCodeDefinition[],
): RecordCodeDefinition[] {
  return definitions.map((item) => ({
    ...item,
    aliases: Array.from(new Set([item.code, ...item.aliases, ...(item.initials ? [item.initials] : [])])),
  }));
}

export const recordCodeMap = new Map(
  recordCodeDefinitionsSorted.map((item) => [item.code, item] as const),
);

const legacyDroppedThirdStrike = recordCodeMap.get("낫아웃-");
if (legacyDroppedThirdStrike) {
  recordCodeMap.set("낫아웃", {
    ...legacyDroppedThirdStrike,
    code: "낫아웃",
    aliases: Array.from(new Set(["낫아웃", ...legacyDroppedThirdStrike.aliases])),
  });
}

export function searchRecordCodes(query: string) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return recordCodeDefinitionsSorted;
  }

  return recordCodeDefinitionsSorted
    .map((item) => {
      const haystacks = [item.code, item.label, ...(item.aliases ?? []), item.initials ?? ""]
      .filter(Boolean)
      .map((value) => normalizeSearch(value));

      if (haystacks.some((value) => value === normalizedQuery)) {
        return { item, score: 0 };
      }

      if (haystacks.some((value) => value.startsWith(normalizedQuery))) {
        return { item, score: 1 };
      }

      if (haystacks.some((value) => value.includes(normalizedQuery))) {
        return { item, score: 2 };
      }

      return { item, score: 999 };
    })
    .filter((entry) => entry.score < 999)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return a.item.code.localeCompare(b.item.code, "ko");
    })
    .map((entry) => entry.item);
}

function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function getInitialConsonants(value: string) {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0) - 44032;
      if (code < 0 || code > 11171) {
        return character;
      }

      return initialConsonants[Math.floor(code / 588)] ?? character;
    })
    .join("");
}
