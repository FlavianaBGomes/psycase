import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Network, Trash2, Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import sky from '@/assets/psycase-sky.jpg'

export type MapContext = { id: string; label: string; category: string; position_x: number | null; position_y: number | null }
export type MapEdge = { id: string; from_context_id: string; to_context_id: string }
const categories = ['Pessoas', 'Temas', 'Fenômenos', 'Recursos', 'Contextos']
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const position = (c: MapContext, index: number) => ({
  x: c.position_x ?? 50 + Math.cos(index * 2.399 + .4) * (index < 8 ? 33 : 38),
  y: c.position_y ?? 48 + Math.sin(index * 2.399 + .4) * (index < 8 ? 29 : 34),
})

export function ConstellationMap({ name, nodes, edges, onMove, onConnect, onRemove, onDisconnect }: {
  name: string; nodes: MapContext[]; edges: MapEdge[];
  onMove: (id: string, x: number, y: number) => Promise<void>;
  onConnect: (from: string, to: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}) {
  const board = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [source, setSource] = useState<string | null>(null)
  useEffect(() => { setPositions({}); setSource(null) }, [name])
  const getPos = (c: MapContext, index: number) => positions[c.id] ?? position(c, index)
  const points = new Map(nodes.map((c, i) => [c.id, getPos(c, i)]))
  function movePointer(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !board.current) return
    if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > 4) drag.current.moved = true
    if (!drag.current.moved) return
    const rect = board.current.getBoundingClientRect()
    const id = drag.current.id
    setPositions(prev => ({ ...prev, [id]: { x: clamp((e.clientX - rect.left) / rect.width * 100, 11, 89), y: clamp((e.clientY - rect.top) / rect.height * 100, 13, 78) } }))
  }
  function endPointer(e: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    drag.current = null
    if (!current?.moved || !board.current) return
    const rect = board.current.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width * 100, 11, 89)
    const y = clamp((e.clientY - rect.top) / rect.height * 100, 13, 78)
    setPositions(prev => ({ ...prev, [current.id]: { x, y } }))
    void onMove(current.id, x, y)
  }
  return <div ref={board} className="constellation map-board" style={{ backgroundImage: `linear-gradient(var(--constellation-overlay), var(--constellation-overlay)), url(${sky})` }} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={() => { drag.current = null }}>
    <div className="constellation-lines" aria-hidden="true" />
    <svg className="map-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Ligações do mapa">
      {edges.map(edge => { const a = points.get(edge.from_context_id), b = points.get(edge.to_context_id); return a && b ? <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null })}
    </svg>
    <div className="center-node"><span aria-hidden="true">✦</span><strong>{name}</strong></div>
    {nodes.map((c, i) => { const p = getPos(c, i); return <div key={c.id} className={`orbit-node map-node ${source === c.id ? 'map-node-selected' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} onPointerDown={e => { if ((e.target as HTMLElement).closest('button')) return; drag.current = { id: c.id, startX: e.clientX, startY: e.clientY, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}>
      <span className={`node-icon category-${categories.indexOf(c.category)}`}><Network size={19}/></span><strong>{c.label}</strong><small>{c.category}</small>
      <span className="map-node-actions"><Button type="button" size="icon" variant="ghost" title={source && source !== c.id ? `Ligar a ${c.label}` : 'Iniciar ligação'} aria-label={source && source !== c.id ? `Ligar a ${c.label}` : `Conectar ${c.label}`} onClick={() => { if (source && source !== c.id) { void onConnect(source, c.id); setSource(null) } else setSource(source === c.id ? null : c.id) }}><Link2 size={15}/></Button><Button type="button" size="icon" variant="ghost" title="Remover elemento" aria-label={`Remover ${c.label}`} onClick={() => { if (source === c.id) setSource(null); void onRemove(c.id) }}><Trash2 size={14}/></Button></span>
    </div> })}
    {nodes.length === 0 && <p className="constellation-empty">Os elementos que você identificar formarão esta constelação.</p>}
    {source && <div className="map-connection-hint">Selecione outro elemento para ligar <Button type="button" size="icon" variant="ghost" aria-label="Cancelar ligação" onClick={() => setSource(null)}><X size={14}/></Button></div>}
    {edges.length > 0 && <div className="map-edge-list" aria-label="Ligações criadas">{edges.map(edge => { const a = nodes.find(n => n.id === edge.from_context_id), b = nodes.find(n => n.id === edge.to_context_id); return a && b ? <span key={edge.id}>{a.label} — {b.label}<Button type="button" variant="ghost" size="icon" aria-label={`Desfazer ligação entre ${a.label} e ${b.label}`} title="Desfazer ligação" onClick={() => void onDisconnect(edge.id)}><X size={12}/></Button></span> : null })}</div>}
    <div className="legend">{categories.map((c,i) => <span key={c}><i className={`category-${i}`}/>{c}</span>)}</div>
  </div>
}
