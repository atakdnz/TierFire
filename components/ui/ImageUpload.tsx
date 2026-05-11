'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadImageFile } from '@/lib/clientImages'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  className?: string
  cloudRequired?: boolean
}

export function ImageUpload({ value, onChange, className, cloudRequired = false }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const result = await uploadImageFile(file, cloudRequired)
      onChange(result.url)
      if (result.warning) setError(result.warning)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm text-[#a1a1a1] mb-1.5">Image</label>
      
      {value ? (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#262626]">
          <img src={value} alt="Upload" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
          }}
          className={cn(
            'w-full aspect-square rounded-lg border-2 border-dashed border-[#262626]',
            'flex flex-col items-center justify-center cursor-pointer',
            'hover:border-[#f97316] transition-colors',
            error && 'border-red-500'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-[#f97316] animate-spin mb-2" />
              <span className="text-sm text-[#a1a1a1]">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-[#525252] mb-2" />
              <span className="text-sm text-[#a1a1a1]">Click to upload</span>
              <span className="text-xs text-[#525252] mt-1">
                {cloudRequired ? 'Cloudinary upload required' : 'PNG, JPG, GIF - max 5MB'}
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
