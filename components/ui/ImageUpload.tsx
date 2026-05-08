'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  className?: string
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const signResponse = await fetch('/api/cloudinary/upload', { method: 'POST' })
      const { timestamp, signature, cloudName, apiKey } = await signResponse.json()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', apiKey)
      formData.append('timestamp', timestamp.toString())
      formData.append('signature', signature)
      formData.append('folder', 'tierfire')

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )

      const result = await uploadResponse.json()

      if (result.secure_url) {
        onChange(result.secure_url)
      } else {
        throw new Error('Upload failed')
      }
    } catch (err) {
      setError('Failed to upload image')
    } finally {
      setUploading(false)
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
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
              <span className="text-xs text-[#525252] mt-1">PNG, JPG - max 5MB</span>
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