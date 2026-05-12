import { supabaseAdmin } from './supabase'

async function testConnection() {
  console.log('Testing Supabase connection...')
  const { data, error } = await supabaseAdmin.from('organizations').select('count').limit(1)

  if (error && error.code !== 'PGRST116') {
    console.error('Connection failed:', error.message)
    process.exit(1)
  }

  console.log('Supabase connection OK')
}

testConnection()
