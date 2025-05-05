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
            <div style={{ maxWidth: 400, margin: '100px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
                <h2 style={{ textAlign: 'center', marginBottom: 16 }}>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        required
                        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                    />
                    <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                        required
                        style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 4, background: '#6366f1', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>
                <button
                    onClick={() => setIsSignUp(s => !s)}
                    style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 4, background: '#f3f4f6', color: '#374151', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
                {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
                {message && <div style={{ color: 'green', marginTop: 8 }}>{message}</div>}
            </div>
        </>
    )
} 
