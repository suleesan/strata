export function extractArxivId(input: string): string | null {
  const match = input.match(/(\d{4}\.\d{4,5})(v\d+)?/)
  return match ? match[1] : null
}
