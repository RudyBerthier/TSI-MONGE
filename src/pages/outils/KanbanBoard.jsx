import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, BookOpen, Link as LinkIcon, Edit2, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'

const SUBJECT_COLORS = {
  'Maths': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'SI': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  'Physique': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  'Infos': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Français': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
}

function InlineDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  const [viewDate, setViewDate] = useState(new Date(value || new Date()))

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedDate = new Date(value)
  const todayStr = new Date().toISOString().split('T')[0]

  const displayLabel = value === todayStr
    ? "Aujourd'hui"
    : selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startingDay = firstDay.getDay()
  startingDay = startingDay === 0 ? 6 : startingDay - 1

  const daysInMonth = lastDay.getDate()

  const calendarGrid = Array(startingDay).fill(null)
  for (let i = 1; i <= daysInMonth; i++) {
    calendarGrid.push(new Date(year, month, i))
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-indigo-500" />
          <span className="font-semibold text-sm capitalize">{displayLabel}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-4 w-72 left-0 sm:left-auto">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              &larr;
            </button>
            <span className="font-bold text-sm capitalize">
              {viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((d, i) => {
              if (!d) return <div key={i} />

              const y = d.getFullYear()
              const m = (d.getMonth() + 1).toString().padStart(2, '0')
              const day = d.getDate().toString().padStart(2, '0')
              const dateStr = `${y}-${m}-${day}`

              const isSelected = value === dateStr
              const isToday = dateStr === todayStr
              const isPast = dateStr < todayStr

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(dateStr)
                    setIsOpen(false)
                  }}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all mx-auto cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                    ${isSelected ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-600' : ''}
                    ${!isSelected && isToday ? 'text-indigo-500 font-bold border border-indigo-200 dark:border-indigo-800' : ''}
                    ${!isSelected && !isPast && !isToday ? 'text-gray-700 dark:text-gray-300' : ''}
                    ${isPast && !isSelected ? 'opacity-50 text-gray-400' : ''}
                  `}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)

  const { getToken } = useAuth()

  // Form state
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toISOString().split('T')[0]

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Maths')
  const [dueDate, setDueDate] = useState(defaultDate)
  const [link, setLink] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/kanban', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setTasks(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setTitle('')
    setSubject('Maths')
    setDueDate(defaultDate)
    setLink('')
    setShowAddModal(true)
  }

  const handleOpenEdit = (task) => {
    setTitle(task.title)
    setSubject(task.subject)
    setDueDate(task.due_date)
    setLink(task.link || '')
    setShowEditModal(task)
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    const isEdit = !!showEditModal
    const url = isEdit ? `/api/kanban/${showEditModal.id}` : '/api/kanban'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ title, subject, due_date: dueDate, link })
      })
      if (res.ok) {
        const savedTask = await res.json()
        if (isEdit) {
          setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)))
          setShowEditModal(null)
        } else {
          setTasks(prev => [...prev, savedTask].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)))
          setShowAddModal(false)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteTask = async () => {
    if (!showDeleteModal) return
    const taskId = showDeleteModal.id

    try {
      const res = await fetch(`/api/kanban/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setShowDeleteModal(null)
      }
    } catch (err) {
      console.error('Erreur suppression:', err)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const isUrgent = (dateStr) => {
    const diff = new Date(dateStr) - new Date()
    return diff < 48 * 60 * 60 * 1000 && diff > 0 // Moins de 48h
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todoTasks = tasks.filter(t => new Date(t.due_date) >= today)
  const doneTasks = tasks.filter(t => new Date(t.due_date) < today)

  if (loading) return <div className="p-8 text-center animate-pulse text-indigo-500 font-bold">Chargement des devoirs...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-screen pb-24">
      {/* Bouton retour */}
      <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit mb-6" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight" style={{ color: 'var(--text)' }}>
            <div className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30">
              <BookOpen size={24} />
            </div>
            Devoirs de la classe
          </h1>
          <p className="text-base text-gray-500 mt-2 font-medium">Une liste partagée pour toute la promo. Tout le monde peut ajouter, modifier ou supprimer.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="tsi-btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow text-base px-5 py-3"
        >
          <Plus size={20} /> <span className="font-bold">Ajouter un devoir</span>
        </button>
      </div>

      <div className="space-y-12">
        {/* Colonne : À Faire */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>À faire prochainement</h2>
            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold px-3 py-1 rounded-full text-base">
              {todoTasks.length}
            </span>
          </div>

          {todoTasks.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-500 font-medium bg-gray-50/50 dark:bg-slate-800/50">
              Aucun devoir prévu pour le moment. Ne t'inquiète pas, ça arrive 😁.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {todoTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={() => setShowDeleteModal(task)}
                  onEdit={() => handleOpenEdit(task)}
                  formatDate={formatDate}
                  isUrgent={isUrgent(task.due_date)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Colonne : Terminé */}
        {doneTasks.length > 0 && (
          <div className="mt-16 opacity-80">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-400">Devoirs passés</h2>
              <span className="bg-gray-100 text-gray-500 dark:bg-gray-800 font-bold px-3 py-1 rounded-full text-base">
                {doneTasks.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doneTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={() => setShowDeleteModal(task)}
                  onEdit={() => handleOpenEdit(task)}
                  formatDate={formatDate}
                  isUrgent={false}
                  isPast={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajout / Modification */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl transform transition-all">
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text)' }}>
                {showEditModal ? 'Modifier le devoir' : 'Nouveau devoir'}
              </h2>

              <form onSubmit={handleSaveTask} className="space-y-6">

                {/* Matière */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Matière</label>
                  <div className="relative">
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 transition-colors appearance-none font-medium"
                    >
                      <option value="Maths">Mathématiques</option>
                      <option value="SI">Sciences de l'Ingénieur</option>
                      <option value="Physique">Physique-Chimie</option>
                      <option value="Infos">Informatique</option>
                      <option value="Français">Français-Philo</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Titre */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description du devoir</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 transition-colors"
                    placeholder="Ex: DM n°4 sur les suites et séries..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Date (Custom Picker) */}
                  <div className="space-y-2 relative z-10">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Pour le</label>
                    <InlineDatePicker
                      value={dueDate}
                      onChange={val => setDueDate(val)}
                    />
                  </div>

                  {/* Lien */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <LinkIcon size={16} /> Lien (Optionnel)
                    </label>
                    <input
                      type="url"
                      value={link}
                      onChange={e => setLink(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 transition-colors text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="pt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setShowEditModal(null); }}
                    className="flex-1 py-4 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    {showEditModal ? 'Enregistrer' : 'Publier pour la classe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Supprimer ce devoir ?</h2>
            <p className="text-gray-500 mb-8 font-medium">
              Es-tu sûr ? Cette action va supprimer le devoir <strong className="text-gray-700 dark:text-gray-300">{showDeleteModal.title}</strong> pour toute la classe.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function TaskCard({ task, onDelete, onEdit, formatDate, isUrgent, isPast }) {
  return (
    <div className={`p-6 sm:p-7 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-xl group ${isPast ? 'bg-gray-50/50 dark:bg-slate-900/50 grayscale hover:grayscale-0' : 'bg-white dark:bg-slate-800 shadow-sm'} ${isUrgent && !isPast ? 'border-red-300 dark:border-red-800 shadow-red-500/10' : 'border-gray-100 dark:border-slate-700'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`inline-block px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${SUBJECT_COLORS[task.subject] || 'bg-gray-100 text-gray-700'}`}>
          {task.subject}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-indigo-500 transition-colors p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
            title="Modifier"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <h3 className="font-extrabold text-xl mb-6 leading-relaxed" style={{ color: 'var(--text)' }}>
        {task.title}
      </h3>

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-5 mt-auto">
        <div className="flex items-center gap-2 text-base font-bold">
          <Calendar size={18} className={isUrgent ? 'text-red-500' : 'text-gray-400'} />
          <span className={isUrgent ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}>
            {formatDate(task.due_date)}
          </span>
        </div>

        {task.link && (
          <a
            href={task.link.startsWith('http') ? task.link : `https://${task.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 rounded-xl transition-colors"
          >
            <LinkIcon size={14} /> Voir plus
          </a>
        )}
      </div>
    </div>
  )
}
