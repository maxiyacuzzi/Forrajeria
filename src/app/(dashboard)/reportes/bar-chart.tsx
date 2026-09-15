export function BarChart({
  data,
}: {
  data: { key: string; label: string; value: number }[]
}) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="grid gap-1">
      <div className="flex h-32 items-end gap-px">
        {data.map((d) => (
          <div
            key={d.key}
            className="group flex h-full min-w-[3px] flex-1 items-end"
            title={`${d.label}: $${d.value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
          >
            <div
              className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data[0].label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)].label}</span>}
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  )
}
