export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-slate-800">
      <div className="h-2 rounded-full bg-sky-400" style={{ width: `${value}%` }} />
    </div>
  )
}
