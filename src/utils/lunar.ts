// Utility for Chinese Lunar Calendar and Statutory Holidays (中国农历与法定节假日计算)

export interface LunarInfo {
  lunarYear: number;
  lunarYearName: string; // e.g. "丙午"
  lunarMonthName: string; // e.g. "七月"
  lunarDayName: string;   // e.g. "廿一"
  displayText: string;    // Display text in calendar cell (Festival > Term > Day)
  isFestival: boolean;
  term?: string;          // 24 Solar term, e.g. "白露"
  holidayStatus?: 'rest' | 'work'; // 'rest' = 休, 'work' = 班
  holidayName?: string;   // e.g. "中秋节", "国庆节"
  fullLunarString: string; // e.g. "丙午年七月廿一"
}

// Map day numbers (1-30) to Chinese lunar day names
const LUNAR_DAYS = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

// 24 Solar Terms Century Coefficients for 2000-2099
const SOLAR_TERMS_C: [number, number][] = [
  [5.4055, 0.2422], [20.12, 0.2422], [3.87, 0.2422], [18.73, 0.2422],
  [5.63, 0.2422], [20.646, 0.2422], [4.81, 0.2422], [20.1, 0.2422],
  [5.52, 0.2422], [21.04, 0.2422], [5.678, 0.2422], [21.37, 0.2422],
  [7.108, 0.2422], [22.83, 0.2422], [7.5, 0.2422], [23.13, 0.2422],
  [7.646, 0.2422], [23.042, 0.2422], [8.318, 0.2422], [23.438, 0.2422],
  [7.438, 0.2422], [22.36, 0.2422], [7.18, 0.2422], [21.94, 0.2422]
];

const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

function getSolarTerm(year: number, month: number, day: number): string | undefined {
  if (year < 2000 || year > 2099) return undefined;
  const yOffset = year % 100;
  
  // Each month has 2 solar terms: 2*(month - 1) and 2*(month - 1) + 1
  const i1 = (month - 1) * 2;
  const d1 = Math.floor(yOffset * SOLAR_TERMS_C[i1][1] + SOLAR_TERMS_C[i1][0]) - Math.floor((yOffset - 1) / 4);
  if (day === d1) return SOLAR_TERM_NAMES[i1];

  const i2 = i1 + 1;
  const d2 = Math.floor(yOffset * SOLAR_TERMS_C[i2][1] + SOLAR_TERMS_C[i2][0]) - Math.floor((yOffset - 1) / 4);
  if (day === d2) return SOLAR_TERM_NAMES[i2];

  return undefined;
}

// Statutory Holiday Arrangements (中国法定节假日与调休补班安排)
// 数据来源：国务院办公厅每年11月底发布的《关于XXXX年部分节假日安排的通知》
// 格式：'YYYY-MM-DD': { status: 'rest'(休) | 'work'(班), name: '节日/调休名称' }
export const STATUTORY_HOLIDAYS: Record<string, { status: 'rest' | 'work'; name: string }> = {
  // === 2025年 法定节假日与调休 ===
  '2025-01-01': { status: 'rest', name: '元旦' },
  '2025-01-26': { status: 'work', name: '补班' },
  '2025-01-28': { status: 'rest', name: '除夕' },
  '2025-01-29': { status: 'rest', name: '春节' },
  '2025-01-30': { status: 'rest', name: '初二' },
  '2025-01-31': { status: 'rest', name: '初三' },
  '2025-02-01': { status: 'rest', name: '初四' },
  '2025-02-02': { status: 'rest', name: '初五' },
  '2025-02-03': { status: 'rest', name: '初六' },
  '2025-02-04': { status: 'rest', name: '初七' },
  '2025-02-08': { status: 'work', name: '补班' },
  '2025-04-04': { status: 'rest', name: '清明' },
  '2025-04-05': { status: 'rest', name: '清明' },
  '2025-04-06': { status: 'rest', name: '清明' },
  '2025-04-27': { status: 'work', name: '补班' },
  '2025-05-01': { status: 'rest', name: '劳动节' },
  '2025-05-02': { status: 'rest', name: '劳动节' },
  '2025-05-03': { status: 'rest', name: '劳动节' },
  '2025-05-04': { status: 'rest', name: '劳动节' },
  '2025-05-05': { status: 'rest', name: '劳动节' },
  '2025-05-31': { status: 'rest', name: '端午' },
  '2025-06-01': { status: 'rest', name: '端午' },
  '2025-06-02': { status: 'rest', name: '端午' },
  '2025-09-28': { status: 'work', name: '补班' },
  '2025-10-01': { status: 'rest', name: '国庆中秋' },
  '2025-10-02': { status: 'rest', name: '国庆中秋' },
  '2025-10-03': { status: 'rest', name: '国庆中秋' },
  '2025-10-04': { status: 'rest', name: '国庆中秋' },
  '2025-10-05': { status: 'rest', name: '国庆中秋' },
  '2025-10-06': { status: 'rest', name: '国庆中秋' },
  '2025-10-07': { status: 'rest', name: '国庆中秋' },
  '2025-10-08': { status: 'rest', name: '国庆中秋' },
  '2025-10-11': { status: 'work', name: '补班' },

  // === 2026年 法定节假日与调休 ===
  // 元旦
  '2026-01-01': { status: 'rest', name: '元旦' },
  '2026-01-02': { status: 'rest', name: '元旦' },
  '2026-01-03': { status: 'rest', name: '元旦' },
  '2026-01-04': { status: 'work', name: '补班' },
  // 春节
  '2026-02-15': { status: 'work', name: '补班' },
  '2026-02-16': { status: 'rest', name: '除夕' },
  '2026-02-17': { status: 'rest', name: '春节' },
  '2026-02-18': { status: 'rest', name: '初二' },
  '2026-02-19': { status: 'rest', name: '初三' },
  '2026-02-20': { status: 'rest', name: '初四' },
  '2026-02-21': { status: 'rest', name: '初五' },
  '2026-02-22': { status: 'rest', name: '初六' },
  '2026-02-28': { status: 'work', name: '补班' },
  // 清明节
  '2026-04-04': { status: 'rest', name: '清明' },
  '2026-04-05': { status: 'rest', name: '清明' },
  '2026-04-06': { status: 'rest', name: '清明' },
  // 劳动节
  '2026-04-26': { status: 'work', name: '补班' },
  '2026-05-01': { status: 'rest', name: '劳动节' },
  '2026-05-02': { status: 'rest', name: '劳动节' },
  '2026-05-03': { status: 'rest', name: '劳动节' },
  '2026-05-04': { status: 'rest', name: '劳动节' },
  '2026-05-05': { status: 'rest', name: '劳动节' },
  '2026-05-09': { status: 'work', name: '补班' },
  // 端午节
  '2026-06-19': { status: 'rest', name: '端午' },
  '2026-06-20': { status: 'rest', name: '端午' },
  '2026-06-21': { status: 'rest', name: '端午' },
  // 中秋节
  '2026-09-25': { status: 'rest', name: '中秋' },
  '2026-09-26': { status: 'rest', name: '中秋' },
  '2026-09-27': { status: 'rest', name: '中秋' },
  // 国庆节
  '2026-09-20': { status: 'work', name: '补班' },
  '2026-10-01': { status: 'rest', name: '国庆' },
  '2026-10-02': { status: 'rest', name: '国庆' },
  '2026-10-03': { status: 'rest', name: '国庆' },
  '2026-10-04': { status: 'rest', name: '国庆' },
  '2026-10-05': { status: 'rest', name: '国庆' },
  '2026-10-06': { status: 'rest', name: '国庆' },
  '2026-10-07': { status: 'rest', name: '国庆' },
  '2026-10-10': { status: 'work', name: '补班' },
};

// Fixed Solar Calendar Festivals
const SOLAR_FESTIVALS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
};

// Traditional Lunar Calendar Festivals (Month-Day)
const LUNAR_FESTIVALS: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
};

// Cache formatter
const chineseFormatter = new Intl.DateTimeFormat('zh-u-ca-chinese', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function getLunarInfo(dateStr: string): LunarInfo {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  // Use noon to avoid UTC midnight date shifts
  const targetDate = new Date(year, month - 1, day, 12, 0, 0);

  // Format via Intl
  const parts = chineseFormatter.formatToParts(targetDate);
  let lunarYearName = '';
  let lunarMonthName = '';
  let lunarDayNum = 1;

  for (const p of parts) {
    const pType = p.type as string;
    if (pType === 'yearName') {
      lunarYearName = p.value;
    } else if (pType === 'month') {
      lunarMonthName = p.value;
    } else if (pType === 'day') {
      lunarDayNum = parseInt(p.value, 10) || 1;
    }
  }

  const lunarDayName = LUNAR_DAYS[lunarDayNum] || `${lunarDayNum}`;

  // Solar Term
  const term = getSolarTerm(year, month, day);

  // Statutory Holiday
  const statutory = STATUTORY_HOLIDAYS[dateStr];

  // Traditional Lunar Festival
  const monthMap: Record<string, number> = {
    '正月': 1, '一月': 1, '1月': 1,
    '二月': 2, '2月': 2,
    '三月': 3, '3月': 3,
    '四月': 4, '4月': 4,
    '五月': 5, '5月': 5,
    '六月': 6, '6月': 6,
    '七月': 7, '7月': 7,
    '八月': 8, '8月': 8,
    '九月': 9, '9月': 9,
    '十月': 10, '10月': 10,
    '十一月': 11, '冬月': 11, '11月': 11,
    '十二月': 12, '腊月': 12, '12月': 12,
  };
  const cleanMonthKey = lunarMonthName.replace('闰', '');
  const lunarMonthNum = monthMap[cleanMonthKey] || parseInt(cleanMonthKey, 10) || 1;

  const lunarKey = `${lunarMonthNum}-${lunarDayNum}`;
  const lunarFestival = LUNAR_FESTIVALS[lunarKey];

  // Solar Festival
  const mmDd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const solarFestival = SOLAR_FESTIVALS[mmDd];

  // Determine display text:
  // Priority: Statutory Holiday Name > Lunar Festival > Solar Term > Solar Festival > Day 1 (Month Name) > Lunar Day
  let displayText = lunarDayName;
  let isFestival = false;

  if (statutory && statutory.name !== '补班') {
    displayText = statutory.name;
    isFestival = true;
  } else if (lunarFestival) {
    displayText = lunarFestival;
    isFestival = true;
  } else if (term) {
    displayText = term;
    isFestival = true;
  } else if (solarFestival) {
    displayText = solarFestival;
    isFestival = true;
  } else if (lunarDayNum === 1) {
    displayText = lunarMonthName;
  }

  const fullLunarString = `${lunarYearName}年${lunarMonthName}${lunarDayName}`;

  return {
    lunarYear: year,
    lunarYearName,
    lunarMonthName,
    lunarDayName,
    displayText,
    isFestival,
    term,
    holidayStatus: statutory?.status,
    holidayName: statutory?.name,
    fullLunarString,
  };
}
