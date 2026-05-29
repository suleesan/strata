import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import type { Paper, PaperNode, PaperEdge, NodeType, EdgeRelationship } from '../lib/types'
import { NODE_COLORS, EDGE_COLORS } from '../lib/types'

interface Props {
  paper: Paper
  activeFilters: Set<NodeType>
  onNodeClick: (node: PaperNode) => void
}

export interface GraphHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}

export const Graph = forwardRef<GraphHandle, Props>(function Graph(
  { paper, activeFilters, onNodeClick },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const simulationRef = useRef<d3.Simulation<PaperNode, PaperEdge> | null>(null)

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4)
    },
    zoomOut: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.4)
    },
    reset: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity)
    },
  }))
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  const buildGraph = useCallback(() => {
    if (!svgRef.current || !paper.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    // Filter nodes
    const visibleNodes = paper.nodes.filter((n) => activeFilters.has(n.type))
    const visibleIds = new Set(visibleNodes.map((n) => n.id))

    // Filter edges to only those between visible nodes
    const visibleEdges = paper.edges.filter((e) => {
      const src = typeof e.source === 'string' ? e.source : (e.source as PaperNode).id
      const tgt = typeof e.target === 'string' ? e.target : (e.target as PaperNode).id
      return visibleIds.has(src) && visibleIds.has(tgt)
    })

    // Clone nodes for d3 simulation
    const nodes: PaperNode[] = visibleNodes.map((n) => ({ ...n }))
    const edges: PaperEdge[] = visibleEdges.map((e) => ({
      ...e,
      source: typeof e.source === 'string' ? e.source : (e.source as PaperNode).id,
      target: typeof e.target === 'string' ? e.target : (e.target as PaperNode).id,
    }))

    // Degree map for node sizing
    const degreeMap = new Map<string, number>()
    nodes.forEach((n) => degreeMap.set(n.id, 0))
    edges.forEach((e) => {
      const src = e.source as string
      const tgt = e.target as string
      degreeMap.set(src, (degreeMap.get(src) ?? 0) + 1)
      degreeMap.set(tgt, (degreeMap.get(tgt) ?? 0) + 1)
    })

    const nodeRadius = (n: PaperNode) => {
      const deg = degreeMap.get(n.id) ?? 0
      return Math.max(10, Math.min(20, 10 + deg * 1.5))
    }

    // Arrow markers
    const defs = svg.append('defs')
    const relationships: EdgeRelationship[] = ['supports', 'contradicts', 'requires', 'produces']
    relationships.forEach((rel) => {
      defs
        .append('marker')
        .attr('id', `arrow-${rel}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', EDGE_COLORS[rel])
        .attr('opacity', 0.7)
    })

    // Zoom
    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)
    zoomRef.current = zoom

    // Simulation
    const simulation = d3
      .forceSimulation<PaperNode>(nodes)
      .force('link', d3.forceLink<PaperNode, PaperEdge>(edges).id((d) => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<PaperNode>().radius((d) => nodeRadius(d) + 6))

    // Edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', (d) => EDGE_COLORS[d.relationship])
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', (d) => `url(#arrow-${d.relationship})`)

    // Node groups
    const node = g
      .append('g')
      .selectAll<SVGGElement, PaperNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, PaperNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on('click', (_event, d) => onNodeClickRef.current(d))

    node
      .append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d) => NODE_COLORS[d.type])
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d) => NODE_COLORS[d.type])
      .attr('stroke-width', 2)

    // Hover: show label
    const tooltip = svg
      .append('text')
      .attr('fill', '#e2e8f0')
      .attr('font-size', 12)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)

    node
      .on('mouseenter', function (_event, d) {
        d3.select(this).select('circle').attr('stroke-width', 3).attr('fill-opacity', 1)
        tooltip.text(d.label).attr('opacity', 1)
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, svgRef.current)
        tooltip.attr('x', mx + 12).attr('y', my - 8)
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('stroke-width', 2).attr('fill-opacity', 0.85)
        tooltip.attr('opacity', 0)
      })

    // High-degree node labels (always visible)
    node
      .filter((d) => (degreeMap.get(d.id) ?? 0) >= 4)
      .append('text')
      .text((d) => d.label.slice(0, 30) + (d.label.length > 30 ? '…' : ''))
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => nodeRadius(d) + 14)
      .attr('fill', '#94a3b8')
      .attr('font-size', 10)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as PaperNode).x ?? 0)
        .attr('y1', (d) => (d.source as PaperNode).y ?? 0)
        .attr('x2', (d) => (d.target as PaperNode).x ?? 0)
        .attr('y2', (d) => (d.target as PaperNode).y ?? 0)

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    simulationRef.current = simulation
  }, [paper, activeFilters])

  useEffect(() => {
    buildGraph()
    return () => {
      simulationRef.current?.stop()
      simulationRef.current = null
    }
  }, [buildGraph])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
})
