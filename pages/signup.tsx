import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

export default function SignupPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)
        try {
            const endpoint = isSignUp
                ? '/auth/v1/signup'
                : '/auth/v1/token?grant_type=password'
            const res = await fetch(supabaseUrl + endpoint, {
                method: 'POST',
                headers: {
                    'apikey': supabaseAnonKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })
            const data = await res.json()
            if (data.error) setError(data.error.message)
            else {
                if (!isSignUp) {
                    localStorage.setItem('qtype_signed_in', '1')
                    router.push('/')
                } else {
                    setMessage('Sign up successful! Check your email.')
                }
            }
        } catch (err) {
            setError('Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Head>
                <title>{isSignUp ? 'Sign Up' : 'Sign In'} | QType</title>
            </Head>
            <div style={{ maxWidth: 500, margin: '100px auto', padding: 32, border: '1.5px solid #bbb', borderRadius: 16, fontSize: '1.5rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 40, fontSize: '2.7rem', fontWeight: 900 }}>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        required
                        style={{ width: '100%', marginBottom: 24, padding: '22px 16px', borderRadius: 8, border: '2px solid #bbb', fontSize: '1.5rem', boxSizing: 'border-box' }}
                    />
                    <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                        required
                        style={{ width: '100%', marginBottom: 24, padding: '22px 16px', borderRadius: 8, border: '2px solid #bbb', fontSize: '1.5rem', boxSizing: 'border-box' }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', marginBottom: 24, padding: '22px 0', borderRadius: 8, background: '#6366f1', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1.4rem', letterSpacing: '0.03em' }}
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <button
                    onClick={() => setIsSignUp(s => !s)}
                    style={{ width: '100%', marginBottom: 16, padding: '18px 0', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
                {error && <div style={{ color: 'red', marginTop: 16, fontSize: '1.2rem' }}>{error}</div>}
                {message && <div style={{ color: 'green', marginTop: 16, fontSize: '1.2rem' }}>{message}</div>}
            </div>
        </>
    )
} 
