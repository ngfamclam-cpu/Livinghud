import { useEffect, useState } from 'react'
import { pendingUploads, photoUsage, uploadPending } from '../../db/photos'
import { SystemWindow } from '../SystemWindow'

/** Vercel's free (Hobby) plan includes 1 GB of Blob storage. */
const FREE_BYTES = 1_000_000_000

/** Settings panel: how much cloud space Life log photos use, and uploads still waiting. */
export function PhotoStorage() {
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null | 'checking'>(null)
  const [waiting, setWaiting] = useState(0)
  useEffect(() => {
    void pendingUploads().then(setWaiting)
  }, [])

  const check = async () => {
    setUsage('checking')
    await uploadPending()
    setWaiting(await pendingUploads())
    setUsage((await photoUsage()) ?? null)
  }
  const mb = (n: number) => `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)} MB`

  return (
    <SystemWindow title="Life log photos">
      <p className="muted">
        Photos are shrunk to about 300 KB and kept privately in this app's Vercel storage under your sync code, so every linked device can see them.
        {waiting > 0 && ` ${waiting} photo${waiting === 1 ? ' is' : 's are'} waiting to upload.`}
      </p>
      {usage && usage !== 'checking' && (
        <p>
          <b>{usage.count}</b> photos · <b>{mb(usage.bytes)}</b> of the free plan's 1 GB ({Math.round((100 * usage.bytes) / FREE_BYTES)}%)
        </p>
      )}
      <div className="row end">
        <button className="ghost small" disabled={usage === 'checking'} onClick={check}>{usage === 'checking' ? 'Checking…' : 'Check storage'}</button>
      </div>
    </SystemWindow>
  )
}
