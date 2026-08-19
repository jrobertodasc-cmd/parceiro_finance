import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { User, SupabaseClient } from '@supabase/supabase-js'

export type AuthSuccessResult = {
  user: User
  supabase: SupabaseClient
  error: null
  response: null
}

export type AuthFailureResult = {
  user: null
  supabase: null
  error: string
  response: NextResponse
}

export type AuthValidationResult = AuthSuccessResult | AuthFailureResult

/**
 * Helper lib/auth.ts - getAuthenticatedUser(request)
 * 
 * Validates session/token on incoming requests in API routes AND returns the
 * authenticated Supabase client configured with the user's session context (Bearer or Cookies).
 * 
 * Subsequent database queries (e.g. `supabase.from('transactions').select('*')`)
 * will execute under the authenticated user's RLS role (`auth.uid()`).
 * 
 * Example usage in any app/api/route.ts:
 * ```ts
 * export async function GET(request: Request) {
 *   const { user, supabase, response } = await getAuthenticatedUser(request)
 *   if (!user) return response // Returns 401 JSON error
 * 
 *   // Database queries run automatically with RLS context:
 *   const { data } = await supabase.from('contas').select('*')
 *   return NextResponse.json({ data })
 * }
 * ```
 */
export async function getAuthenticatedUser(
  request: Request | NextRequest
): Promise<AuthValidationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return {
      user: null,
      supabase: null,
      error: 'Supabase credentials not configured',
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Supabase environment variables are missing or set to placeholder values.',
        },
        { status: 401 }
      ),
    }
  }

  // 1. Check Authorization Bearer Token
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim()

    // Create Supabase client explicitly bound with the Bearer token for RLS queries
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (!error && user) {
      return { user, supabase, error: null, response: null }
    }
  }

  // 2. Check Cookie Session
  const rawCookie = request.headers.get('cookie') || ''
  const parsedCookies = rawCookie
    ? rawCookie.split(';').map((c) => {
        const [name, ...val] = c.trim().split('=')
        return { name, value: val.join('=') }
      })
    : []

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parsedCookies
      },
      setAll() {},
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: 'Sessão inválida ou não autenticada',
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Usuário não autenticado. Faça login para continuar.',
        },
        { status: 401 }
      ),
    }
  }

  return { user, supabase, error: null, response: null }
}
