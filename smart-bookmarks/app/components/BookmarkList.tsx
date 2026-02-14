'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Bookmark = {
  id: string
  url: string
  title: string
  created_at: string
  user_id: string
}

export default function BookmarkList({
  initialBookmarks,
  userId
}: {
  initialBookmarks: Bookmark[]
  userId: string
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBookmark = payload.new as Bookmark
            setBookmarks((prev) => {
              if (prev.find((b) => b.id === newBookmark.id)) return prev
              return [newBookmark, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsAdding(true)
    const tempId = `temp-${Date.now()}`
    const optimisticBookmark: Bookmark = {
      id: tempId,
      url: url.trim(),
      title: title.trim() || url.trim(),
      created_at: new Date().toISOString(),
      user_id: userId,
    }

    setBookmarks((prev) => [optimisticBookmark, ...prev])
    setUrl('')
    setTitle('')

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        url: optimisticBookmark.url,
        title: optimisticBookmark.title,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      setBookmarks((prev) => prev.filter((b) => b.id !== tempId))
      alert('Failed to add bookmark')
    } else {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === tempId ? data : b))
      )
    }

    setIsAdding(false)
  }

  const deleteBookmark = async (id: string) => {
    const bookmark = bookmarks.find((b) => b.id === id)
    if (!bookmark) return

    setBookmarks((prev) => prev.filter((b) => b.id !== id))

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)

    if (error) {
      setBookmarks((prev) => [bookmark, ...prev])
      alert('Failed to delete bookmark')
    }

    setDeleteId(null)
  }

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return '/favicon.ico'
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addBookmark} className="bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              URL *
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title (optional)
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My bookmark"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add Bookmark'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {bookmarks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No bookmarks yet. Add one above!</p>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={getFaviconUrl(bookmark.url)}
                  alt=""
                  className="w-8 h-8 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{bookmark.title}</h3>
                  <a
                    
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate block"
                  >
                    {bookmark.url}
                  </a>
                </div>
              </div>
              {deleteId === bookmark.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteId(bookmark.id)}
                  className="text-red-600 hover:text-red-800 ml-4"
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
