import { supabase } from './supabase'

export async function getCachedChapter(bookId, chapterNumber) {
  const { data, error } = await supabase
    .from('cached_chapters')
    .select('*')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .single()

  if (error || !data) return null
  return data
}

export async function cacheChapter(bookId, chapterNumber, blocks, audioUrl) {
  const { data, error } = await supabase
    .from('cached_chapters')
    .upsert({
      book_id: bookId,
      chapter_number: chapterNumber,
      blocks: blocks,
      audio_url: audioUrl
    })
    .select()
    .single()

  if (error) {
    console.error('Cache error:', error)
    return null
  }
  return data
}

export async function uploadAudio(audioBuffer, bookId, chapterNumber) {
  const filename = `${bookId}/chapter_${chapterNumber}.mp3`
  
  const { data, error } = await supabase.storage
    .from('audio-cache')
    .upload(filename, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('audio-cache')
    .getPublicUrl(filename)

  return urlData.publicUrl
}
