import { usePhotoUrl } from '../../db/photos'

/** A Life log photo from this device's cache or the cloud. */
export function Photo({ id, alt, className = '', onClick }: { id: string; alt: string; className?: string; onClick?: () => void }) {
  const { url, missing } = usePhotoUrl(id)
  const body = url ? (
    <img src={url} alt={alt} loading="lazy" decoding="async" />
  ) : (
    <span className="photo-wait">{missing ? 'Not synced yet' : ''}</span>
  )
  return onClick ? (
    <button className={`photo ${className}`} onClick={onClick} aria-label={`Open ${alt}`}>{body}</button>
  ) : (
    <span className={`photo ${className}`}>{body}</span>
  )
}

/** Full-screen view of one photo. */
export function PhotoViewer({ id, caption, onClose }: { id: string; caption: string; onClose: () => void }) {
  const { url } = usePhotoUrl(id)
  return (
    <div className="overlay photo-viewer" role="dialog" aria-label={caption} onClick={onClose}>
      {url ? <img src={url} alt={caption} /> : <p className="muted">Loading…</p>}
      <p className="photo-caption">{caption}</p>
      <button className="ghost small" onClick={onClose}>Close</button>
    </div>
  )
}
