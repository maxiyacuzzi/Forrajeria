"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 5 * 1024 * 1024

export function ImageUpload({
  value,
  onChange,
  bucket = "product-images",
}: {
  value?: string | null
  onChange: (url: string | null) => void
  bucket?: string
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen")
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("La imagen no puede pesar más de 5MB")
      return
    }

    setUploading(true)
    const supabase = createClient()

    const { data: profile } = await supabase.from("profiles").select("org_id").single()
    if (!profile?.org_id) {
      toast.error("No se encontró la organización del usuario")
      setUploading(false)
      return
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg"
    const path = `${profile.org_id}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from(bucket).upload(path, file)
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""

    if (error) {
      toast.error(error.message)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    onChange(data.publicUrl)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {value ? (
          <Image src={value} alt="" width={80} height={80} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="grid gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo..." : value ? "Cambiar foto" : "Subir foto"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Quitar foto
          </Button>
        )}
      </div>
    </div>
  )
}
