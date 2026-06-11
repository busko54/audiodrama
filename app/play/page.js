export const dynamic = 'force-dynamic'

const books = [
  {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    chapter: 'Chapter I',
    href: '/play/pride-and-prejudice',
    image: 'https://m.media-amazon.com/images/I/518cCpQ5lbL._SY445_SX342_FMwebp_.jpg',
    color: '#c47c7c',
  },
  {
    title: 'Dracula',
    author: 'Bram Stoker',
    chapter: 'Chapter I',
    href: '/play/dracula',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Dracula_1st_ed_cover_reproduction.jpg/800px-Dracula_1st_ed_cover_reproduction.jpg',
    color: '#8b0000',
  },
]

export default function BookSelect() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#080604',
      color: '#e8dcc8',
      fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      boxSizing: 'border-box',
    }}>
      <a href="/" style={{
        fontSize: '10px', letterSpacing: '5px', color: '#8a7050',
        textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block',
        textDecoration: 'none', textAlign: 'center',
      }}>
        ✦ Narratescape ✦
      </a>
      <p style={{ fontSize: '12px', letterSpacing: '3px', color: '#6a5035', textTransform: 'uppercase', marginBottom: '3rem', textAlign: 'center' }}>
        Choose your story
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '2rem',
        width: '100%',
        maxWidth: '520px',
      }}>
        {books.map((book) => (
          <a key={book.href} href={book.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#0f0c08',
              border: `1px solid ${book.color}44`,
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'border-color 0.3s, transform 0.2s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = book.color; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${book.color}44`; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <img
                src={book.image}
                alt={book.title}
                style={{ width: '100%', height: '280px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '10px', letterSpacing: '3px', color: book.color, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  {book.chapter}
                </div>
                <h3 style={{ fontSize: '1rem', color: '#e8dcc8', margin: '0 0 0.25rem' }}>{book.title}</h3>
                <p style={{ color: '#6a5035', fontSize: '13px', margin: '0 0 1rem' }}>{book.author}</p>
                <span style={{
                  fontSize: '12px', letterSpacing: '2px', color: book.color,
                  textTransform: 'uppercase',
                }}>
                  Listen Free →
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: '3rem', color: '#3a2010', fontSize: '14px', letterSpacing: '8px' }}>❧ ✦ ❧</div>
    </main>
  )
}
