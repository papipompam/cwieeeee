export const maxIssuedLetterNumber = (numbers: Array<string | null>, buddhistYear: number) => numbers.reduce((max, value) => {
  const normalized = value?.replace(/[๐-๙]/g, digit => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(digit)))
  const match = normalized?.match(new RegExp(`(?:^|\\D)(\\d+)/${buddhistYear}$`))
  return match ? Math.max(max, Number(match[1])) : max
}, 0)
