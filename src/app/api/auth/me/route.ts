import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'

/**
 * Example Protected API Route
 * 
 * Demonstrates session validation using getAuthenticatedUser(request).
 * If authenticated, returns both `user` and `supabase` client pre-configured with
 * the user's RLS session context for executing database queries.
 */
export async function GET(request: Request) {
  const { user, supabase, response } = await getAuthenticatedUser(request)

  if (!user) {
    // Returns 401 Unauthorized Response automatically
    return response
  }

  // Example database query using the returned authenticated supabase client (RLS enforced):
  // const { data: contas } = await supabase.from('contas').select('*')

  return NextResponse.json({
    success: true,
    message: 'Acesso autorizado à rota protegida de API.',
    user: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
    timestamp: new Date().toISOString(),
  })
}
