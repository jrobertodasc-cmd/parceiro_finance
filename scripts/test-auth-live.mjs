import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local natively
let env = {}
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=')
      if (key && val) env[key.trim()] = val.join('=').trim()
    }
  })
} catch (e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('❌ ATENÇÃO: As credenciais do Supabase no .env.local ainda estão com os valores de exemplo (placeholder).')
  console.error('Para executar este teste end-to-end real de autenticação (signUp -> signIn -> GET /api/auth/me):')
  console.error('Por favor, informe seu NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY reais no arquivo .env.local.')
  process.exit(1)
}

const testEmail = `test.pfv2.${Date.now()}@example.com`
const testPassword = 'TestPassword123!'

async function runLiveAuthTest() {
  console.log('🚀 Iniciando teste real de integração com Supabase Auth...')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 1. SignUp
  console.log(`1. Criando usuário de teste real: ${testEmail}...`)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { full_name: 'Usuário Teste Real' }
    }
  })

  if (signUpError) {
    console.error('❌ Erro no signUp:', signUpError.message)
    process.exit(1)
  }
  console.log('✅ Usuário criado com sucesso. User ID:', signUpData.user?.id)

  // 2. SignIn
  console.log('2. Realizando login real (signInWithPassword)...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (signInError || !signInData.session) {
    console.error('❌ Erro no signIn:', signInError?.message || 'Sessão não retornada.')
    process.exit(1)
  }

  const realAccessToken = signInData.session.access_token
  console.log('✅ Token real obtido! Truncado:', realAccessToken.substring(0, 25) + '...')

  // 3. Request API /api/auth/me with Bearer real token
  console.log('3. Chamando GET /api/auth/me com o Bearer token real...')
  const response = await fetch('http://127.0.0.1:3005/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${realAccessToken}`
    }
  })

  const status = response.status
  const body = await response.json()

  console.log('\n--- RESULTADO DA REQUISIÇÃO REAL ---')
  console.log('HTTP STATUS:', status)
  console.log('RESPONSE BODY:', JSON.stringify(body, null, 2))

  if (status === 200 && body.user && body.user.email === testEmail) {
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO! Retornou 200 OK com dados reais do usuário autenticado.')
  } else {
    console.error('\n❌ Teste falhou. Resposta inesperada.')
  }
}

runLiveAuthTest()
