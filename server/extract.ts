import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const EXTRACTION_SYSTEM_PROMPT = `
You are a research paper analyst. Your job is to decompose a research paper into a structured knowledge graph — not a summary, but a map of the paper's intellectual architecture.

You will extract:
- CLAIMS: Assertions the paper makes (what it argues to be true)
- EVIDENCE: Data, experiments, or citations that support a claim
- METHODS: Techniques, algorithms, or approaches used
- RESULTS: Measured outcomes or findings
- LIMITATIONS: Constraints, failure modes, or scope boundaries
- ASSUMPTIONS: Premises taken for granted that the argument depends on

Rules:
- Each node must be self-contained (understandable without context)
- Labels must be one short sentence (under 15 words)
- Body must be a direct paraphrase from the paper (not invented)
- Edges must reflect actual logical relationships, not just proximity
- Aim for 15–30 nodes for a typical paper. More is not better.
- Be precise about relationships: "supports" means A is evidence for B, "requires" means A cannot exist without B, "produces" means A leads to B, "contradicts" means A and B are in tension.

Return ONLY valid JSON, no prose, no markdown fences. Schema:

{
  "title": string,
  "authors": string[],
  "abstract": string,
  "nodes": [
    {
      "id": string,
      "type": "claim" | "evidence" | "method" | "result" | "limitation" | "assumption",
      "label": string,
      "body": string,
      "section": string
    }
  ],
  "edges": [
    {
      "source": string,
      "target": string,
      "relationship": "supports" | "contradicts" | "requires" | "produces"
    }
  ]
}
`.trim()

export async function extractPaper(text: string) {
  // Truncate to ~80k chars to stay within context limits
  const truncated = text.slice(0, 80000)

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8096,
    thinking: { type: 'adaptive' },
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract the knowledge graph from this paper:\n\n${truncated}`,
      },
    ],
  })

  const message = await stream.finalMessage()
  const raw = message.content.find((b) => b.type === 'text')?.text ?? ''

  try {
    return JSON.parse(raw)
  } catch {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('Failed to parse extraction JSON')
  }
}
