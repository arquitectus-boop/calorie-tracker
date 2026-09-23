import { useMemo, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { DayView } from './components/DayView'
import { EntryForm } from './components/EntryForm'
import { History } from './components/History'
import { ImportKeep } from './components/ImportKeep'
import { QuickAdd } from './components/QuickAdd'
import { Settings } from './components/Settings'
import { useEntries } from './hooks/useEntries'
import { todayISO } from './lib/dates'
import type { FoodEntry, View } from './types'
import './App.css'

function App() {
  const {
    days,
    today,
    loading,
    addEntry,
    updateEntry,
    removeEntry,
    importEntries,
    exportBackup,
    importBackup,
    frequentFoods,
    recentFoods,
    setDayBurned,
    settings,
    updateSettings,
  } = useEntries()

  const [view, setView] = useState<View>('hoje')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [quickPrefill, setQuickPrefill] = useState<{
    name: string
    kcal: number
  } | null>(null)
  const [toast, setToast] = useState('')

  const activeDay = useMemo(() => {
    if (view === 'hoje' && !selectedDate) return today
    const date = selectedDate ?? todayISO()
    return (
      days.find((d) => d.date === date) ?? {
        date,
        total: 0,
        watchBurned: 0,
        burned: 0,
        entries: [] as FoodEntry[],
      }
    )
  }, [view, selectedDate, today, days])

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  async function handleExportBackup() {
    try {
      await exportBackup()
      showToast('Cópia exportada — guarda-a em Ficheiros')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast(error instanceof Error ? error.message : 'Não foi possível exportar')
    }
  }

  async function handleImportBackup(file: File) {
    try {
      const restored = await importBackup(file)
      if (restored) {
        setSelectedDate(null)
        setView('hoje')
        showToast('Cópia restaurada')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível importar')
    }
  }

  async function handleDelete(entry: FoodEntry) {
    const ok = window.confirm(`Apagar «${entry.name}»?`)
    if (!ok) return
    await removeEntry(entry.id)
    showToast('Registo apagado')
  }

  function goAdd(prefill?: { name: string; kcal: number }) {
    setEditing(null)
    setQuickPrefill(prefill ?? null)
    setView('adicionar')
  }

  function goEdit(entry: FoodEntry) {
    setQuickPrefill(null)
    setEditing(entry)
    setView('adicionar')
  }

  function selectHistoryDay(date: string) {
    setSelectedDate(date)
    setView('hoje')
  }

  if (loading) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p className="empty-state">A carregar…</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {view === 'hoje' && (
          <DayView
            day={activeDay}
            onEdit={goEdit}
            onDelete={handleDelete}
            onAdd={() => goAdd()}
            onSaveBurned={async (date, kcal) => {
              await setDayBurned(date, kcal)
              showToast('Calorias gastas guardadas')
            }}
          />
        )}

        {view === 'historico' && (
          <History days={days} onSelectDay={selectHistoryDay} />
        )}

        {view === 'adicionar' && (
          <div className="add-view">
            <h1 className="page-title">
              {editing ? 'Editar registo' : 'Adicionar'}
            </h1>
            <EntryForm
              key={editing?.id ?? `new-${quickPrefill?.name ?? 'blank'}`}
              initial={
                editing ?? {
                  date: selectedDate ?? todayISO(),
                  name: quickPrefill?.name,
                  kcal: quickPrefill?.kcal,
                  quantity: 1,
                }
              }
              submitLabel={editing ? 'Guardar' : 'Adicionar'}
              onCancel={() => {
                setEditing(null)
                setQuickPrefill(null)
                setView('hoje')
              }}
              onSubmit={async (data) => {
                if (editing) {
                  await updateEntry({ ...editing, ...data })
                  showToast('Registo atualizado')
                } else {
                  await addEntry(data)
                  showToast('Registo adicionado')
                }
                setEditing(null)
                setQuickPrefill(null)
                setSelectedDate(data.date === todayISO() ? null : data.date)
                setView('hoje')
              }}
            />
            {!editing && (
              <QuickAdd
                recent={recentFoods}
                frequent={frequentFoods}
                onPick={(f) => setQuickPrefill(f)}
              />
            )}
          </div>
        )}

        {view === 'importar' && (
          <ImportKeep
            onImport={importEntries}
            onDone={() => {
              showToast('Importação concluída')
              setView('hoje')
            }}
          />
        )}

        {view === 'definicoes' && (
          <Settings
            settings={settings}
            onSave={(next) => {
              updateSettings(next)
              showToast('Definições guardadas')
            }}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}
      </main>

      <BottomNav
        view={view === 'hoje' && selectedDate && selectedDate !== todayISO() ? 'hoje' : view}
        onChange={(v) => {
          if (v === 'hoje') setSelectedDate(null)
          if (v !== 'adicionar') {
            setEditing(null)
            setQuickPrefill(null)
          }
          setView(v)
        }}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default App
