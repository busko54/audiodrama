'use client'
import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleEmailSubmit = (e) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'Georgia, serif',
      overflowX: 'hidden'
    }}>

      {/* HERO */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #0a0a0a 70%)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,0,0,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <p style={{
          fontSize: '13px', letterSpacing: '4px', color: '#8B0000',
          textTransform: 'uppercase', marginBottom: '1.5rem', fontFamily: 'monospace'
        }}>
          Introducing Narratescape
        </p>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 5rem)',
          fontWeight: 'bold',
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          maxWidth: '800px'
        }}>
          Books that<br />
          <span style={{ color: '#8B0000' }}>come alive.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#999',
          maxWidth: '560px',
          lineHeight: 1.7,
          marginBottom: '3rem'
        }}>
          AI audio dramas with unique character voices, ambient sound, and cinematic music —
          automatically generated from classic books.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
          <a href="/play/pride-and-prejudice" style={{
            background: '#8B0000', color: '#fff', border: 'none',
            padding: '18px 40px', borderRadius: '8px', fontSize: '18px',
            cursor: 'pointer', textDecoration: 'none', fontFamily: 'Georgia, serif',
            display: 'inline-block'
          }}>
            ▶ Listen Free
          </a>
          <button
            onClick={() => document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })}
            style={{
              background: 'transparent', color: '#fff',
              border: '1px solid #333', padding: '18px 40px',
              borderRadius: '8px', fontSize: '18px', cursor: 'pointer',
              fontFamily: 'Georgia, serif'
            }}
          >
            Join Waitlist
          </button>
        </div>

        <p style={{ color: '#555', fontSize: '13px' }}>
          No signup required · Chapter 1 always free
        </p>
      </section>

      {/* DEMO PLAYER PLACEHOLDER */}
      <section style={{
        padding: '5rem 2rem',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '13px', letterSpacing: '4px', color: '#8B0000',
          textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'monospace'
        }}>
          Hear the difference
        </p>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          Not an audiobook. An experience.
        </h2>
        <p style={{ color: '#888', marginBottom: '3rem', lineHeight: 1.7 }}>
          Every character has a unique voice. Every scene has ambient sound. The music shifts with the mood.
          This is what books were always meant to sound like.
        </p>

        <div style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '16px',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '3rem' }}>🎭</div>
          <p style={{ color: '#888', fontSize: '14px' }}>Dracula — Chapter I</p>
          <p style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>
            "3 May. Bistritz. — Left Munich at 8:35 P.M..."
          </p>
          <a href="/play/pride-and-prejudice" style={{
            background: '#8B0000', color: '#fff', border: 'none',
            padding: '14px 32px', borderRadius: '8px', fontSize: '16px',
            cursor: 'pointer', textDecoration: 'none', fontFamily: 'Georgia, serif',
            display: 'inline-block', marginTop: '1rem'
          }}>
            ▶ Play Demo
          </a>
          <p style={{ color: '#444', fontSize: '12px' }}>Full immersive experience — voices, sound, music</p>
        </div>
      </section>

      {/* WHAT MAKES IT DIFFERENT */}
      <section style={{
        padding: '5rem 2rem',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '13px', letterSpacing: '4px', color: '#8B0000',
          textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          What makes it different
        </p>
        <h2 style={{ fontSize: '2rem', marginBottom: '3rem', textAlign: 'center' }}>
          Cinematic. Immersive. Automatic.
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}>
          {[
            { icon: '🎙️', title: 'Unique Character Voices', desc: 'Every character has their own distinct AI voice — consistent across the entire book.' },
            { icon: '🌩️', title: 'Automatic Ambient Sound', desc: 'Thunder when it storms. Wolves when they howl. Horses when carriages pass. All triggered by the text.' },
            { icon: '🎼', title: 'Cinematic Music', desc: 'Period-accurate background music that shifts with the mood of each scene automatically.' },
            { icon: '😱', title: 'Emotional Delivery', desc: 'Whispered lines are whispered. Frantic lines sound frantic. The AI performs, not just reads.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: '#111',
              border: '1px solid #222',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOOK LIBRARY */}
      <section style={{
        padding: '5rem 2rem',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <p style={{
          fontSize: '13px', letterSpacing: '4px', color: '#8B0000',
          textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          The library
        </p>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Classic literature, reimagined.
        </h2>
        <p style={{ color: '#888', textAlign: 'center', marginBottom: '3rem', fontSize: '14px' }}>
          Chapter 1 of every book is always free.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem'
        }}>
          {[
            {
              title: 'Pride and Prejudice',
              author: 'Jane Austen',
              href: '/play/pride-and-prejudice',
              image: 'https://m.media-amazon.com/images/I/518cCpQ5lbL._SY445_SX342_FMwebp_.jpg'
            },
            {
              title: 'Dracula',
              author: 'Bram Stoker',
              href: '/play/dracula',
              image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Dracula_1st_ed_cover_reproduction.jpg/800px-Dracula_1st_ed_cover_reproduction.jpg'
            },
            {
              title: 'Frankenstein',
              author: 'Mary Shelley',
              href: null,
              image: 'https://cloud.firebrandtech.com/api/v2/image/111/9780785839880/CoverArtHigh/XL'
            },
            {
              title: 'Sherlock Holmes',
              author: 'Arthur Conan Doyle',
              href: null,
              image: 'https://m.media-amazon.com/images/I/51ZlozSSZ4L._SY445_SX342_FMwebp_.jpg'
            },
          ].map((book, i) => (
            <div key={i} style={{
              background: '#111',
              border: `1px solid ${book.href ? '#8B0000' : '#222'}`,
              borderRadius: '12px',
              overflow: 'hidden',
              opacity: book.href ? 1 : 0.6,
              position: 'relative'
            }}>
              {!book.href && (
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: '#222', color: '#666', fontSize: '10px',
                  padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
                  letterSpacing: '1px', zIndex: 1
                }}>
                  COMING SOON
                </div>
              )}
              <img
                src={book.image}
                alt={book.title}
                style={{
                  width: '100%',
                  height: '280px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{book.title}</h3>
                <p style={{ color: '#666', fontSize: '13px', marginBottom: '1rem' }}>{book.author}</p>
                {book.href ? (
                  <a href={book.href} style={{
                    background: '#8B0000', color: '#fff',
                    padding: '8px 16px', borderRadius: '6px', fontSize: '13px',
                    textDecoration: 'none', display: 'inline-block', fontFamily: 'Georgia, serif'
                  }}>
                    Listen Free →
                  </a>
                ) : (
                  <span style={{ color: '#444', fontSize: '13px' }}>Available soon</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" style={{
        padding: '5rem 2rem',
        maxWidth: '560px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '13px', letterSpacing: '4px', color: '#8B0000',
          textTransform: 'uppercase', marginBottom: '1rem', fontFamily: 'monospace'
        }}>
          Early access
        </p>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
          Be first to hear what's next.
        </h2>
        <p style={{ color: '#888', marginBottom: '2rem', lineHeight: 1.7 }}>
          New books, new voices, and full chapter access coming soon.
          Join the waitlist and we'll let you know when it's ready.
        </p>

        {submitted ? (
          <div style={{
            background: '#0d2d1a', border: '1px solid #1a5c2e',
            borderRadius: '8px', padding: '1.5rem', color: '#4CAF50'
          }}>
            ✓ You're on the list. We'll be in touch.
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'
          }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                background: '#111', border: '1px solid #333', color: '#fff',
                padding: '14px 20px', borderRadius: '8px', fontSize: '16px',
                fontFamily: 'Georgia, serif', flex: '1', minWidth: '240px', outline: 'none'
              }}
            />
            <button type="submit" style={{
              background: '#8B0000', color: '#fff', border: 'none',
              padding: '14px 28px', borderRadius: '8px', fontSize: '16px',
              cursor: 'pointer', fontFamily: 'Georgia, serif'
            }}>
              Join Waitlist
            </button>
          </form>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #1a1a1a',
        padding: '2rem',
        textAlign: 'center',
        color: '#444',
        fontSize: '13px'
      }}>
        <p>© 2025 Narratescape · All books are public domain</p>
      </footer>

    </main>
  )
}
