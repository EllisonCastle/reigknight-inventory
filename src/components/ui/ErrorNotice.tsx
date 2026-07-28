export function ErrorNotice({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</div>
  )
}
