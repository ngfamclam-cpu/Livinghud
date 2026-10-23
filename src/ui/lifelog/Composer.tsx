import { useEffect, useRef, useState } from 'react'
import type { Memory, MemoryPhoto, Place } from '../../engine'
import { addMemory, locate, locationAllowed, placeAt, updateMemory } from '../../db/memories'
import { addPhoto, deletePhotos } from '../../db/photos'
import { SystemWindow } from '../SystemWindow'
import { Photo } from './Photo'

/** Add (or edit) a Life log entry: photos, a note and where you are. */
export function Composer({
  places,
  editing,
  startWithCamera,
  onDone,
}: {
  places: Place[]
  editing?: Memory
  startWithCamera?: boolean
  onDone: () => void
}) {
  const [note, setNote] = useState(editing?.note ?? '')
  const [photos, setPhotos] = useState<MemoryPhoto[]>(editing?.photos ?? [])
  const [placeId, setPlaceId] = useState<string | null>(editing?.placeId ?? null)
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  // Photos added in this form but not saved, so Cancel can clean them up.
  const added = useRef<string[]>([])
  const place = places.find(p => p.id === placeId)

  const findPlace = async () => {
    setLocating(true)
    setError('')
    const pos = await locate()
    if (!pos) {
      setError('Location is off or was refused. You can still save without it.')
    } else {
      const p = await placeAt(pos)
      setPlaceId(p.id)
    }
    setLocating(false)
  }

  useEffect(() => {
    // New entries tag your location by themselves once you've allowed it.
    if (editing) return
    void locationAllowed().then(ok => {
      if (ok) void findPlace()
    })
    if (startWithCamera) camera.current?.click()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    for (const file of [...files]) {
      setBusy(b => b + 1)
      try {
        const photo = await addPhoto(file)
        added.current.push(photo.id)
        setPhotos(p => [...p, photo])
      } catch {
        setError('One photo could not be read.')
      } finally {
        setBusy(b => b - 1)
      }
    }
  }

  const removePhoto = (id: string) => {
    setPhotos(p => p.filter(x => x.id !== id))
    if (added.current.includes(id)) void deletePhotos([id])
  }

  const save = async () => {
    if (editing) await updateMemory(editing.id, { note, photos, placeId })
    else await addMemory({ note, photos, placeId })
    added.current = []
    onDone()
  }

  const cancel = () => {
    if (added.current.length) void deletePhotos(added.current)
    onDone()
  }

  return (
    <SystemWindow title={editing ? 'Edit memory' : 'New memory'} className="composer">
      <div className="composer-photos">
        {photos.map(p => (
          <span key={p.id} className="composer-photo">
            <Photo id={p.id} alt="Photo to save" />
            <button className="ghost small icon" aria-label="Remove photo" onClick={() => removePhoto(p.id)}>×</button>
          </span>
        ))}
        {busy > 0 && <span className="composer-photo busy">Shrinking…</span>}
      </div>
      <div className="row">
        <button className="small" onClick={() => camera.current?.click()}>📷 Take photo</button>
        <button className="ghost small" onClick={() => gallery.current?.click()}>Choose photos</button>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => { void onFiles(e.target.files); e.target.value = '' }} />
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={e => { void onFiles(e.target.files); e.target.value = '' }} />
      </div>
      <label>
        Note
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What happened, who you were with, how it felt…" maxLength={2000} />
      </label>
      <div className="row place-line">
        {place ? (
          <span className="grow">📍 <b>{place.name}</b>{place.city && place.city !== place.name ? <span className="muted"> · {place.city}</span> : null}</span>
        ) : (
          <span className="grow muted">{locating ? 'Finding where you are…' : 'No place tagged'}</span>
        )}
        {place ? (
          <button className="ghost small" onClick={() => setPlaceId(null)}>Remove place</button>
        ) : (
          <button className="ghost small" disabled={locating} onClick={findPlace}>Add where I am</button>
        )}
      </div>
      {error && <p className="muted error">{error}</p>}
      <p className="muted">A photo clears "Photo of the day"; a note on its own counts as the minimum.</p>
      <div className="row end">
        <button className="ghost" onClick={cancel}>Cancel</button>
        <button disabled={busy > 0 || (!note.trim() && photos.length === 0)} onClick={save}>{editing ? 'Save changes' : 'Save memory'}</button>
      </div>
    </SystemWindow>
  )
}
