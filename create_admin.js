require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@tracking.com';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  console.log(`Fetching existing users to check for ${email}...`);
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  
  let user = usersData?.users?.find(u => u.email === email);

  if (!user) {
    console.log('User not found. Creating user in Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }
    user = authData.user;
  } else {
    console.log('User already exists in Auth. Updating password and verifying profile...');
    await supabase.auth.admin.updateUserById(user.id, { password });
  }

  if (!user) {
     console.error('Could not retrieve user data.');
     return;
  }

  console.log(`User ID: ${user.id}`);
  console.log('Inserting into profiles table as admin...');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    user_role: 'admin',
    full_name: 'System Admin'
  });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }

  console.log('\n--- ADMIN CREATED/UPDATED SUCCESSFULLY ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log('You can change these in .env.local and run `node create_admin.js` again.');
}

createAdmin();
