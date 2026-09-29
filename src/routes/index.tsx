import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Home, Orbit, NotebookPen, Users, Telescope, LibraryBig, Settings, HelpCircle, Search, Bell, ChevronDown, Plus, ArrowLeft, ArrowRight, Sparkles, LogOut, CalendarDays, Network, Target, BookOpen, Menu, X, Trash2 } from 'lucide-react'
import sky from '@/assets/psycase-sky.jpg'
import { ConstellationMap, type MapEdge } from '@/components/ConstellationMap'
import type { User } from '@supabase/supabase-js'

type Case = { id: string; name: string; patient_identifier: string; start_date: string; summary: string; created_at: string }
type Note = { id: string; case_id: string; session_date: string; content: string; created_at: string }
type Context = { id: string; case_id: string; label: string; category: string; created_at: string; position_x: number | null; position_y: number | null }
type Section = 'Início' | 'Estudo do Caso' | 'Constelação' | 'Prontuário' | 'Pacientes' | 'Observatório' | 'Recursos' | 'Minha Biblioteca'
type CaseTab = 'Visão Geral' | 'Constelação' | 'Prontuário' | 'Ecos' | 'Fenômenos' | 'Objetivos' | 'Intervenções' | 'Minha Percepção'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'PsyCase | Constelações da prática clínica' },
    { name: 'description', content: 'Organize casos, registros de sessão e contextos da prática clínica em um espaço reservado para psicólogos.' },
    { property: 'og:title', content: 'PsyCase | Constelações da prática clínica' },
    { property: 'og:description', content: 'Um espaço para organizar casos, registros de sessão e contextos da prática clínica.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: PsyCase,
})

const nav: { label: Section; icon: typeof Home }[] = [
  { label: 'Início', icon: Home }, { label: 'Estudo do Caso', icon: Orbit }, { label: 'Constelação', icon: Network },
  { label: 'Prontuário', icon: NotebookPen }, { label: 'Pacientes', icon: Users }, { label: 'Observatório', icon: Telescope },
  { label: 'Recursos', icon: BookOpen }, { label: 'Minha Biblioteca', icon: LibraryBig },
]
const tabs: CaseTab[] = ['Visão Geral', 'Constelação', 'Prontuário', 'Ecos', 'Fenômenos', 'Objetivos', 'Intervenções', 'Minha Percepção']
const categories = ['Pessoas', 'Temas', 'Fenômenos', 'Recursos', 'Contextos']
const formatDate = (date: string) => { const [y = 2026, m = 1, d = 1] = date.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d)) }

function PsyCase() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [cases, setCases] = useState<Case[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [contexts, setContexts] = useState<Context[]>([])
  const [edges, setEdges] = useState<(MapEdge & { case_id: string })[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('Início')
  const [tab, setTab] = useState<CaseTab>('Visão Geral')
  const [caseOpen, setCaseOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [caseName, setCaseName] = useState('')
  const [patientId, setPatientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [noteText, setNoteText] = useState('')
  const [contextLabel, setContextLabel] = useState('')
  const [contextCategory, setContextCategory] = useState('Pessoas')
  const selected = cases.find(c => c.id === selectedId) ?? null
  const filtered = useMemo(() => cases.filter(c => `${c.name} ${c.patient_identifier}`.toLowerCase().includes(search.toLowerCase())), [cases, search])
  const caseNotes = notes.filter(n => n.case_id === selectedId)
  const caseContexts = contexts.filter(c => c.case_id === selectedId)
  const caseEdges = edges.filter(e => e.case_id === selectedId)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setChecking(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setChecking(false) })
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!user) { setCases([]); setNotes([]); setContexts([]); setEdges([]); return }
    let active = true
    Promise.all([
      supabase.from('cases').select('id,name,patient_identifier,start_date,summary,created_at').order('created_at', { ascending: false }),
      supabase.from('case_notes').select('id,case_id,session_date,content,created_at').order('session_date', { ascending: false }),
      supabase.from('case_contexts').select('id,case_id,label,category,created_at,position_x,position_y').order('created_at', { ascending: true }),
      supabase.from('case_map_edges').select('id,case_id,from_context_id,to_context_id'),
    ]).then(([a,b,c,d]) => {
      if (!active) return
      if (a.error || b.error || c.error || d.error) { setError('Não foi possível carregar seus dados. Tente atualizar a página.'); return }
      setCases(a.data ?? []); setNotes(b.data ?? []); setContexts(c.data ?? []); setEdges(d.data ?? [])
    })
    return () => { active = false }
  }, [user])

  async function authSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true)
    if (authMode === 'reset') {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (err) setError(err.message); else setNotice('Enviamos um link de recuperação para seu e-mail.')
    } else if (authMode === 'signup') {
      const { error: err, data } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message); else if (!data.session) setNotice('Verifique seu e-mail para confirmar a conta.'); else setNotice('Conta criada com sucesso.')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError('Não foi possível entrar. Confira seu e-mail e senha.')
    }
    setBusy(false)
  }
  async function googleSignIn() {
    setError(''); setBusy(true)
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })
    if (result.error) setError('Não foi possível entrar com Google. Tente novamente.')
    setBusy(false)
  }
  async function addCase(e: FormEvent) {
    e.preventDefault(); if (!user) return
    setBusy(true); setError('')
    const { data, error: err } = await supabase.from('cases').insert({ owner_id: user.id, name: caseName.trim(), patient_identifier: patientId.trim(), start_date: startDate }).select('id,name,patient_identifier,start_date,summary,created_at').single()
    if (err || !data) setError('Não foi possível criar o caso. Verifique os campos e tente novamente.')
    else { setCases(prev => [data, ...prev]); setSelectedId(data.id); setSection('Estudo do Caso'); setTab('Visão Geral'); setCaseOpen(false); setCaseName(''); setPatientId(''); setStartDate('') }
    setBusy(false)
  }
  async function addNote(e: FormEvent) {
    e.preventDefault(); if (!user || !selectedId) return
    setBusy(true); setError('')
    const { data, error: err } = await supabase.from('case_notes').insert({ owner_id: user.id, case_id: selectedId, session_date: noteDate, content: noteText.trim() }).select('id,case_id,session_date,content,created_at').single()
    if (err || !data) setError('Não foi possível salvar o registro. Tente novamente.')
    else { setNotes(prev => [data, ...prev].sort((a,b) => b.session_date.localeCompare(a.session_date))); setNoteOpen(false); setNoteText(''); setTab('Prontuário'); setSection('Prontuário') }
    setBusy(false)
  }
  async function addContext(e: FormEvent) {
    e.preventDefault(); if (!user || !selectedId) return
    setBusy(true); setError('')
    const { data, error: err } = await supabase.from('case_contexts').insert({ owner_id: user.id, case_id: selectedId, label: contextLabel.trim(), category: contextCategory }).select('id,case_id,label,category,created_at,position_x,position_y').single()
    if (err || !data) setError('Não foi possível adicionar o contexto. Tente novamente.')
    else { setContexts(prev => [...prev, data]); setContextOpen(false); setContextLabel(''); setTab('Constelação'); setSection('Constelação') }
    setBusy(false)
  }
  async function removeContext(id: string) {
    const { error: err } = await supabase.from('case_contexts').delete().eq('id', id)
    if (err) setError('Não foi possível remover o contexto.'); else setContexts(prev => prev.filter(c => c.id !== id))
  }
  async function moveContext(id: string, x: number, y: number) {
    const previous = contexts.find(c => c.id === id)
    if (!previous) return
    setContexts(prev => prev.map(c => c.id === id ? { ...c, position_x: x, position_y: y } : c))
    const { error: err } = await supabase.from('case_contexts').update({ position_x: x, position_y: y }).eq('id', id)
    if (err) { setContexts(prev => prev.map(c => c.id === id ? previous : c)); setError('Não foi possível salvar a posição.') }
  }
  async function connectContexts(from: string, to: string) {
    if (!user || !selectedId || from === to || edges.some(e => e.case_id === selectedId && ((e.from_context_id === from && e.to_context_id === to) || (e.from_context_id === to && e.to_context_id === from)))) return
    const { data, error: err } = await supabase.from('case_map_edges').insert({ case_id: selectedId, owner_id: user.id, from_context_id: from, to_context_id: to }).select('id,case_id,from_context_id,to_context_id').single()
    if (err || !data) setError('Não foi possível salvar a ligação.'); else setEdges(prev => [...prev, data])
  }
  async function disconnectContexts(id: string) {
    const { error: err } = await supabase.from('case_map_edges').delete().eq('id', id)
    if (err) setError('Não foi possível desfazer a ligação.'); else setEdges(prev => prev.filter(e => e.id !== id))
  }
  function selectCase(c: Case, destination: Section = 'Estudo do Caso') { setSelectedId(c.id); setSection(destination); setTab(destination === 'Prontuário' ? 'Prontuário' : destination === 'Constelação' ? 'Constelação' : 'Visão Geral'); setSidebarOpen(false) }
  function navigate(s: Section) { setSection(s); setSidebarOpen(false); if (s === 'Prontuário' || s === 'Constelação') setTab(s) }

  if (checking) return <div className="loading-screen"><span className="brand-mark">✦</span><span>PsyCase</span></div>
  if (!user) return <main className="auth-page" style={{ backgroundImage: `url(${sky})` }}>
    <div className="auth-shade" />
    <section className="auth-intro"><div className="auth-orbit"><h1>Psy<span>Case</span></h1><p>Constelações da prática clínica</p><em>Um espaço para organizar, integrar<br />e aprofundar a compreensão dos seus casos.</em></div><blockquote>“A complexidade humana também pode ser um lugar de beleza.”</blockquote></section>
    <div className="auth-side"><div className="auth-panel"><div className="auth-icon">✦</div><h2>{authMode === 'login' ? 'Bem-vinda de volta' : authMode === 'signup' ? 'Crie seu espaço' : 'Recupere seu acesso'}</h2><p>{authMode === 'login' ? 'Continue sua jornada clínica com o PsyCase.' : authMode === 'signup' ? 'Um lugar reservado para sua prática clínica.' : 'Enviaremos um link para o seu e-mail.'}</p>
      <form onSubmit={authSubmit} className="auth-form"><label>E-mail<Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>{authMode !== 'reset' && <label>Senha<Input type="password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} /></label>}
      {authMode === 'login' && <div className="auth-options"><span /> <Button type="button" variant="link" onClick={() => { setAuthMode('reset'); setError(''); setNotice('') }}>Esqueci minha senha</Button></div>}
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
      <Button className="pink-button w-full" disabled={busy} type="submit">{busy ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : authMode === 'signup' ? 'Criar conta' : 'Enviar link'}</Button></form>
      {authMode !== 'reset' && <><div className="auth-divider">ou</div><Button variant="outline" className="google-button w-full" onClick={googleSignIn} disabled={busy}><span className="google-g">G</span> Entrar com Google</Button></>}
      <p className="auth-switch">{authMode === 'login' ? 'Ainda não tem uma conta?' : authMode === 'signup' ? 'Já tem uma conta?' : 'Lembrou sua senha?'} <Button type="button" variant="link" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setNotice('') }}>{authMode === 'login' ? 'Criar conta' : 'Entrar'}</Button></p>
    </div></div>
  </main>

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}><div className="sidebar-top"><div className="logo"><span className="logo-glyph">✦</span> Psy<span>Case</span></div><Button size="icon" variant="ghost" className="mobile-close" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}><X /></Button></div>
      <nav aria-label="Navegação principal">{nav.map(item => <Button key={item.label} variant="ghost" className={`nav-item ${section === item.label ? 'active' : ''}`} onClick={() => navigate(item.label)}><item.icon /> <span>{item.label}</span></Button>)}</nav>
      <div className="sidebar-bottom"><Button variant="ghost" className="nav-item" onClick={() => setNotice('Configurações estarão disponíveis em breve.')}><Settings /> <span>Configurações</span></Button><Button variant="ghost" className="nav-item" onClick={() => setNotice('Ajuda estará disponível em breve.')}><HelpCircle /> <span>Ajuda</span></Button></div>
    </aside>
    {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
    <div className="app-main"><header className="topbar"><Button variant="ghost" size="icon" className="menu-trigger" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}><Menu /></Button><div className="top-search"><Search size={17}/><input aria-label="Buscar casos" value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setSection('Pacientes') }} placeholder="Buscar pacientes, casos..." /></div><div className="top-actions"><Button variant="ghost" size="icon" aria-label="Notificações" title="Notificações" onClick={() => setNotice('Nenhuma notificação por enquanto.')}><Bell size={18}/></Button><div className="user-chip"><span className="user-detail"><strong>{user.user_metadata?.['full_name'] ?? user.email?.split('@')[0]}</strong><small>Psicóloga(o)</small></span><ChevronDown size={14}/><div className="user-menu"><Button variant="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={15}/> Sair da conta</Button></div></div></div></header>
      <div className="content-scroll"><main className="content-area">
        {notice && <div className="notice" role="status">{notice}<Button size="icon" variant="ghost" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={14}/></Button></div>}
        {error && <div className="error-banner" role="alert">{error}<Button size="icon" variant="ghost" aria-label="Fechar erro" onClick={() => setError('')}><X size={14}/></Button></div>}
        {(section === 'Início' || section === 'Pacientes' || (['Estudo do Caso','Constelação','Prontuário'].includes(section) && !selected)) ? <>
          <div className="page-heading"><div><span className="eyebrow">SEU ESPAÇO CLÍNICO</span><h1>{section === 'Pacientes' ? 'Pacientes' : 'Seus casos'}</h1><p>Um lugar para acompanhar cada trajetória com atenção.</p></div><Button className="pink-button" onClick={() => setCaseOpen(true)}><Plus/> Novo caso</Button></div>
          <div className="welcome-banner" style={{ backgroundImage: `linear-gradient(90deg, var(--background) 0%, transparent 100%), url(${sky})` }}><div><span className="eyebrow">PSYCASE</span><h2>Cada história é um universo.</h2><p>Organize seus registros e acompanhe as conexões que surgem ao longo do caminho.</p></div><span className="banner-star">✦</span></div>
          <div className="section-title"><div><h2>{search ? 'Resultados da busca' : 'Casos em acompanhamento'}</h2><p>{filtered.length} {filtered.length === 1 ? 'caso' : 'casos'}</p></div></div>
          {filtered.length ? <div className="case-grid">{filtered.map(c => <button className="case-tile" key={c.id} onClick={() => selectCase(c)}><span className="case-symbol">✧</span><span className="case-tile-info"><strong>{c.name}</strong><small>Identificação: {c.patient_identifier}</small><small>Início em {formatDate(c.start_date)}</small></span><ArrowRight className="tile-arrow" size={18}/></button>)}</div> : <div className="empty-state"><Orbit size={34}/><h3>{search ? 'Nenhum caso encontrado' : 'Seu primeiro caso começa aqui'}</h3><p>{search ? 'Tente buscar por outro nome ou identificação.' : 'Crie um caso para reunir seus registros e contextos em um só lugar.'}</p>{!search && <Button variant="outline" onClick={() => setCaseOpen(true)}><Plus/> Criar caso</Button>}</div>}
        </> : ['Estudo do Caso','Constelação','Prontuário'].includes(section) && selected ? <>
          <div className="case-cover" style={{ backgroundImage: `linear-gradient(90deg, var(--background) 0%, transparent 100%), url(${sky})` }}><Button variant="ghost" className="back-link" onClick={() => { setSection('Pacientes'); setSelectedId(null) }}><ArrowLeft size={16}/> Voltar para pacientes</Button><div className="case-cover-body"><div className="case-monogram" aria-hidden="true">✦</div><div><h1>{selected.name}</h1><p>{selected.patient_identifier} <span className="dot-sep">•</span> Atendimento desde {formatDate(selected.start_date)}</p><div className="case-tags"><span>Em acompanhamento</span><span>{caseNotes.length} {caseNotes.length === 1 ? 'sessão' : 'sessões'}</span><span>{caseContexts.length} {caseContexts.length === 1 ? 'contexto' : 'contextos'}</span></div></div></div></div>
          <div className="tabs" role="tablist" aria-label="Áreas do caso">{tabs.map(t => <Button key={t} variant="ghost" role="tab" aria-selected={tab === t} className={`tab-button ${tab === t ? 'selected' : ''}`} onClick={() => { setTab(t); if (t === 'Prontuário' || t === 'Constelação') setSection(t); else setSection('Estudo do Caso') }}>{t}</Button>)}</div>
          {tab === 'Visão Geral' ? <><div className="overview-grid"><article className="panel"><div className="panel-heading"><h3>Resumo do caso</h3><Sparkles size={15}/></div><p>{selected.summary || 'Os registros deste caso vão formando uma visão mais completa ao longo do acompanhamento.'}</p><Button variant="outline" size="sm" onClick={() => setTab('Prontuário')}>Ver registros <ArrowRight size={13}/></Button></article><article className="panel"><div className="panel-heading"><h3>Contextos identificados</h3><Network size={15}/></div>{caseContexts.length ? <ul className="mini-list">{caseContexts.slice(0, 4).map(c => <li key={c.id}><span className="mini-dot"/>{c.label}<small>{c.category}</small></li>)}</ul> : <p>As relações, temas e recursos identificados por você aparecerão aqui.</p>}<Button variant="outline" size="sm" onClick={() => setContextOpen(true)}><Plus size={13}/> Adicionar contexto</Button></article><article className="panel"><div className="panel-heading"><h3>Prontuário</h3><NotebookPen size={15}/></div><p>{caseNotes.length ? `Última sessão: ${formatDate(caseNotes[0]?.session_date ?? selected.start_date)}.` : 'Ainda não há registros de sessão neste caso.'}</p><Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}><Plus size={13}/> Novo registro</Button></article></div><section className="timeline-section"><div className="section-title"><div><h2>Linha do tempo</h2><p>Os momentos registrados neste acompanhamento</p></div></div><div className="timeline"><div className="timeline-item"><span/><strong>{formatDate(selected.start_date)}</strong><small>Início do processo</small></div>{[...caseNotes].reverse().map(n => <div key={n.id} className="timeline-item"><span/><strong>{formatDate(n.session_date)}</strong><small>Registro de sessão</small></div>)}</div></section></> : tab === 'Constelação' ? <><div className="page-heading sub-heading"><div><h2>Constelação do Caso</h2><p>Organize os elementos e as relações que você identificou neste caso.</p></div><Button className="pink-button" onClick={() => setContextOpen(true)}><Plus/> Adicionar contexto</Button></div><ConstellationMap key={selected.id} name={selected.name} nodes={caseContexts} edges={caseEdges} onMove={moveContext} onConnect={connectContexts} onRemove={removeContext} onDisconnect={disconnectContexts} /></> : tab === 'Prontuário' ? <><div className="page-heading sub-heading"><div><h2>Prontuário</h2><p>Registros das sessões e evolução do processo terapêutico.</p></div><Button className="pink-button" onClick={() => setNoteOpen(true)}><Plus/> Nova sessão</Button></div>{caseNotes.length ? <div className="notes-layout"><div className="session-list"><h3>Sessões</h3>{caseNotes.map(n => <a key={n.id} href={`#nota-${n.id}`} className="session-item"><CalendarDays size={15}/><span><strong>{formatDate(n.session_date)}</strong><small>{n.content.slice(0, 56) || 'Registro sem texto'}{n.content.length > 56 ? '…' : ''}</small></span><ArrowRight size={14}/></a>)}</div><div className="note-content">{caseNotes.map(n => <article className="panel note-panel" key={n.id} id={`nota-${n.id}`}><div className="panel-heading"><div><span className="eyebrow">REGISTRO DE SESSÃO</span><h3>{formatDate(n.session_date)}</h3></div><NotebookPen size={16}/></div><p>{n.content || 'Registro sem texto.'}</p></article>)}</div></div> : <div className="empty-state"><NotebookPen size={34}/><h3>Um espaço para cada sessão</h3><p>Registre suas observações clínicas para acompanhar o percurso do caso.</p><Button variant="outline" onClick={() => setNoteOpen(true)}><Plus/> Criar registro</Button></div>}</> : <div className="feature-state"><div className="feature-symbol">{tab === 'Objetivos' ? <Target/> : tab === 'Minha Percepção' ? <Sparkles/> : <Orbit/>}</div><h2>{tab}</h2><p>Este espaço será construído em uma próxima etapa, com a condução clínica sempre nas mãos do profissional.</p></div>}
        </> : <><div className="page-heading"><div><span className="eyebrow">PSYCASE</span><h1>{section}</h1><p>{section === 'Observatório' ? 'Um espaço para aproximar a prática clínica da pesquisa científica brasileira.' : 'Seu espaço de trabalho clínico.'}</p></div></div><div className="feature-state"><div className="feature-symbol">{section === 'Observatório' ? <Telescope/> : <LibraryBig/>}</div><h2>{section === 'Observatório' ? 'Conhecimento em perspectiva' : section}</h2><p>{section === 'Observatório' ? 'A consulta a estudos e artigos científicos brasileiros, incluindo a SciELO, fará parte de uma próxima etapa. Nenhuma sugestão substitui a avaliação do psicólogo.' : 'Este espaço será desenvolvido em uma próxima etapa.'}</p></div></>}
      </main></div>
    </div>
    <Dialog open={caseOpen} onOpenChange={v => { setCaseOpen(v); setError('') }}><DialogContent className="modal-content"><DialogHeader><DialogTitle>Novo caso</DialogTitle><DialogDescription>Comece com os dados essenciais do acompanhamento.</DialogDescription></DialogHeader><form onSubmit={addCase} className="modal-form"><label>Nome do caso<Input value={caseName} onChange={e => setCaseName(e.target.value)} placeholder="Ex.: Caso Mariana" required maxLength={120}/></label><label>Identificação do paciente <span>*</span><Input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Nome ou código de identificação" required maxLength={120}/></label><label>Data de início <span>*</span><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required/></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setCaseOpen(false)}>Cancelar</Button><Button type="submit" className="pink-button" disabled={busy}>Criar caso</Button></div></form></DialogContent></Dialog>
    <Dialog open={noteOpen} onOpenChange={v => { setNoteOpen(v); setError('') }}><DialogContent className="modal-content"><DialogHeader><DialogTitle>Nova sessão</DialogTitle><DialogDescription>Registro clínico de {selected?.name}.</DialogDescription></DialogHeader><form onSubmit={addNote} className="modal-form"><label>Data da sessão<Input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} required /></label><label>Registro da sessão<Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escreva suas observações da sessão..." rows={8} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setNoteOpen(false)}>Cancelar</Button><Button type="submit" className="pink-button" disabled={busy}>Salvar registro</Button></div></form></DialogContent></Dialog>
    <Dialog open={contextOpen} onOpenChange={v => { setContextOpen(v); setError('') }}><DialogContent className="modal-content"><DialogHeader><DialogTitle>Adicionar contexto</DialogTitle><DialogDescription>Identifique uma relação, tema ou recurso observado por você.</DialogDescription></DialogHeader><form onSubmit={addContext} className="modal-form"><label>Nome do contexto<Input value={contextLabel} onChange={e => setContextLabel(e.target.value)} placeholder="Ex.: Relação com a mãe" required maxLength={100}/></label><label>Categoria<select value={contextCategory} onChange={e => setContextCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setContextOpen(false)}>Cancelar</Button><Button type="submit" className="pink-button" disabled={busy}>Adicionar</Button></div></form></DialogContent></Dialog>
  </div>
}
