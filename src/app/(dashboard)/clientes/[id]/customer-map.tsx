export function CustomerMap({ address }: { address: string }) {
  if (!address.trim()) return null

  return (
    <div className="max-w-lg overflow-hidden rounded-lg border">
      <iframe
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        width="100%"
        height="220"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Mapa de ${address}`}
      />
    </div>
  )
}
