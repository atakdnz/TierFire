'use client'

export async function uploadImageFile(file: File, cloudRequired = false): Promise<{ url: string; warning?: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be less than 5MB')
  }

  try {
    const signResponse = await fetch('/api/cloudinary/upload', { method: 'POST' })
    if (!signResponse.ok) throw new Error('Cloudinary signing is not configured')

    const { timestamp, signature, cloudName, apiKey } = await signResponse.json()
    if (!timestamp || !signature || !cloudName || !apiKey) {
      throw new Error('Cloudinary signing response is incomplete')
    }

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
    if (result.secure_url) return { url: result.secure_url }
    throw new Error('Upload failed')
  } catch {
    if (cloudRequired) {
      throw new Error('Cloudinary is required for signed-in lists. Check your Cloudinary environment variables.')
    }

    return {
      url: await readFileAsDataUrl(file),
      warning: 'Using local image preview because Cloudinary is not configured.',
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read image'))
    }
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

export function filenameToLabel(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  return withoutExtension.replace(/[-_]+/g, ' ').trim() || 'Image'
}

export function imageUrlToLabel(url: string) {
  try {
    const pathname = new URL(url).pathname
    const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '')
    return filenameToLabel(filename || 'Image')
  } catch {
    return 'Image'
  }
}
