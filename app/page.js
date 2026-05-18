export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🎭 AudioDrama
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '2rem' }}>
        Classic books as immersive AI audio dramas
      </p>
      <div style={{
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Coming Soon</h2>
        <p style={{ color: '#888' }}>
          Dracula, Sherlock Holmes, Frankenstein — 
          with real character voices, whispers, and ambient sound.
        </p>
      </div>
    </main>
  )
}
