import Anthropic from '@anthropic-ai/sdk'

type NodeType = 'claim' | 'evidence' | 'method' | 'result' | 'limitation' | 'assumption'
type EdgeRelationship = 'supports' | 'contradicts' | 'requires' | 'produces'

interface PaperNode {
  id: string
  type: NodeType
  label: string
  body: string
  section: string
  confidence?: number
}

interface PaperEdge {
  source: string | PaperNode
  target: string | PaperNode
  relationship: EdgeRelationship
}

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

type ExtractedPaper = {
  title: string
  authors: string[]
  abstract?: string
  nodes: PaperNode[]
  edges: PaperEdge[]
}

const NODE_TYPES: NodeType[] = ['claim', 'evidence', 'method', 'result', 'limitation', 'assumption']
const EDGE_RELATIONSHIPS: EdgeRelationship[] = ['supports', 'contradicts', 'requires', 'produces']
const MAX_CHUNK_CHARS = 60000
const MAX_CHUNKS = 4

function parseJsonObject(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    throw new Error('Response did not contain a JSON object')
  }
}

function assertString(value: unknown, name: string) {
  if (typeof value !== 'string') throw new Error(`${name} must be a string`)
  return value.trim()
}

function assertStringArray(value: unknown, name: string) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`)
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}

function validateExtraction(value: unknown): ExtractedPaper {
  if (!value || typeof value !== 'object') throw new Error('Extraction must be an object')
  const data = value as Record<string, unknown>

  const nodesRaw = data.nodes
  if (!Array.isArray(nodesRaw)) throw new Error('nodes must be an array')

  const seen = new Set<string>()
  const nodes: PaperNode[] = nodesRaw.map((nodeRaw, index) => {
    if (!nodeRaw || typeof nodeRaw !== 'object') throw new Error(`nodes[${index}] must be an object`)
    const node = nodeRaw as Record<string, unknown>
    const id = assertString(node.id, `nodes[${index}].id`) || `node-${index + 1}`
    const type = assertString(node.type, `nodes[${index}].type`) as NodeType
    if (!NODE_TYPES.includes(type)) throw new Error(`nodes[${index}].type is invalid`)
    if (seen.has(id)) throw new Error(`Duplicate node id: ${id}`)
    seen.add(id)

    return {
      id,
      type,
      label: assertString(node.label, `nodes[${index}].label`),
      body: assertString(node.body, `nodes[${index}].body`),
      section: typeof node.section === 'string' ? node.section.trim() : '',
      confidence: typeof node.confidence === 'number' ? node.confidence : undefined,
    }
  })

  if (nodes.length === 0) throw new Error('Extraction must contain at least one node')

  const edgesRaw = data.edges
  if (!Array.isArray(edgesRaw)) throw new Error('edges must be an array')

  const edges: PaperEdge[] = edgesRaw.map((edgeRaw, index) => {
    if (!edgeRaw || typeof edgeRaw !== 'object') throw new Error(`edges[${index}] must be an object`)
    const edge = edgeRaw as Record<string, unknown>
    const source = assertString(edge.source, `edges[${index}].source`)
    const target = assertString(edge.target, `edges[${index}].target`)
    const relationship = assertString(edge.relationship, `edges[${index}].relationship`) as EdgeRelationship

    if (!seen.has(source)) throw new Error(`edges[${index}].source references unknown node: ${source}`)
    if (!seen.has(target)) throw new Error(`edges[${index}].target references unknown node: ${target}`)
    if (!EDGE_RELATIONSHIPS.includes(relationship)) throw new Error(`edges[${index}].relationship is invalid`)

    return { source, target, relationship }
  })

  return {
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled Paper',
    authors: assertStringArray(data.authors ?? [], 'authors'),
    abstract: typeof data.abstract === 'string' ? data.abstract.trim() : undefined,
    nodes,
    edges,
  }
}

function splitIntoChunks(text: string) {
  const chunks: string[] = []
  let remaining = text.trim()

  while (remaining.length > 0 && chunks.length < MAX_CHUNKS) {
    if (remaining.length <= MAX_CHUNK_CHARS) {
      chunks.push(remaining)
      break
    }

    const boundary = remaining.lastIndexOf('\n\n', MAX_CHUNK_CHARS)
    const splitAt = boundary > MAX_CHUNK_CHARS * 0.6 ? boundary : MAX_CHUNK_CHARS
    chunks.push(remaining.slice(0, splitAt).trim())
    remaining = remaining.slice(splitAt).trim()
  }

  return chunks
}

function mergeExtractions(parts: ExtractedPaper[]): ExtractedPaper {
  if (parts.length === 1) return parts[0]

  const nodes: PaperNode[] = []
  const edges: PaperEdge[] = []

  parts.forEach((part, partIndex) => {
    const idMap = new Map<string, string>()
    part.nodes.forEach((node, nodeIndex) => {
      const nextId = `p${partIndex + 1}-${node.id || nodeIndex + 1}`
      idMap.set(node.id, nextId)
      nodes.push({
        ...node,
        id: nextId,
        section: node.section ? `${node.section} (part ${partIndex + 1})` : `Part ${partIndex + 1}`,
      })
    })

    part.edges.forEach((edge) => {
      const source = typeof edge.source === 'string' ? edge.source : edge.source.id
      const target = typeof edge.target === 'string' ? edge.target : edge.target.id
      const mappedSource = idMap.get(source)
      const mappedTarget = idMap.get(target)
      if (mappedSource && mappedTarget) edges.push({ source: mappedSource, target: mappedTarget, relationship: edge.relationship })
    })
  })

  const first = parts[0]
  return {
    title: first.title,
    authors: first.authors,
    abstract: first.abstract,
    nodes,
    edges,
  }
}

async function extractChunk(client: Anthropic, text: string, context: string) {
  let validationError: string | null = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${context}${validationError ? `\n\nPrevious JSON failed validation: ${validationError}. Return corrected JSON only.` : ''}\n\nExtract the knowledge graph from this paper text:\n\n${text}`,
        },
      ],
    })

    const message = await stream.finalMessage()
    const raw = message.content.find((b) => b.type === 'text')?.text ?? ''

    try {
      return validateExtraction(parseJsonObject(raw))
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Invalid extraction JSON'
    }
  }

  throw new Error(`Failed to produce valid extraction JSON: ${validationError}`)
}

export async function extractPaper(text: string) {
  const client = new Anthropic()
  const chunks = splitIntoChunks(text)
  const parts = []

  for (let index = 0; index < chunks.length; index += 1) {
    const context =
      chunks.length === 1
        ? 'This is the complete paper text.'
        : `This is part ${index + 1} of ${chunks.length} from a long paper. Extract only the graph supported by this part.`
    parts.push(await extractChunk(client, chunks[index], context))
  }

  return mergeExtractions(parts)
}
