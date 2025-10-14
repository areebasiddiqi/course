'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { put } from '@vercel/blob'

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const testDirectUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing direct upload to Vercel Blob...')
      console.log('File:', { name: file.name, size: file.size, type: file.type })

      // Test direct upload without handleUploadUrl
      const blob = await put(`test-direct/${Date.now()}-${file.name}`, file, {
        access: 'public'
      })

      console.log('Direct upload successful:', blob)
      setResult({ type: 'direct', data: blob })
    } catch (err) {
      console.error('Direct upload failed:', err)
      setError(`Direct upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const testApiUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing upload via API...')
      console.log('File:', { name: file.name, size: file.size, type: file.type })

      // Test upload with handleUploadUrl (using any to bypass TypeScript)
      const blob = await put(`test-api/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload'
      } as any)

      console.log('API upload successful:', blob)
      setResult({ type: 'api', data: blob })
    } catch (err) {
      console.error('API upload failed:', err)
      setError(`API upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const testFormDataUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing FormData upload...')
      
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/test-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('FormData upload successful:', data)
      setResult({ type: 'formdata', data })
    } catch (err) {
      console.error('FormData upload failed:', err)
      setError(`FormData upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Vercel Blob Upload Test</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>File Selection</CardTitle>
          <CardDescription>Choose a file to test different upload methods</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          />
          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <p><strong>Selected:</strong> {file.name}</p>
              <p><strong>Size:</strong> {Math.round(file.size / 1024)} KB</p>
              <p><strong>Type:</strong> {file.type}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Button 
          onClick={testDirectUpload} 
          disabled={!file || uploading}
          className="h-20"
        >
          Test Direct Upload
          <br />
          <small>(No API route)</small>
        </Button>
        
        <Button 
          onClick={testApiUpload} 
          disabled={!file || uploading}
          className="h-20"
        >
          Test API Upload
          <br />
          <small>(With /api/upload)</small>
        </Button>
        
        <Button 
          onClick={testFormDataUpload} 
          disabled={!file || uploading}
          className="h-20"
        >
          Test FormData Upload
          <br />
          <small>(Via /api/test-upload)</small>
        </Button>
      </div>

      {uploading && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-center">Uploading... Please wait.</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h3 className="font-bold text-red-800 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Upload Successful!</CardTitle>
            <CardDescription>Method: {result.type}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>URL:</strong> <a href={result.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{result.data.url}</a></p>
              <p><strong>Size:</strong> {result.data.size} bytes</p>
              {result.data.type && <p><strong>Type:</strong> {result.data.type}</p>}
              {result.data.name && <p><strong>Name:</strong> {result.data.name}</p>}
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Full Response</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={async () => {
              try {
                const response = await fetch('/api/debug-all-courses')
                const data = await response.json()
                console.log('Environment check:', data)
                alert('Environment check logged to console')
              } catch (err) {
                console.error('Environment check failed:', err)
                alert('Environment check failed - see console')
              }
            }}
          >
            Check Environment
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
