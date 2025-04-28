const AUTH_KEY = process.env.AUTH_KEY || "default-fallback-token";

if (!AUTH_KEY) {
  console.error("❌ No AUTH_KEY provided.");
  process.exit(1);
}

// Then use it to authenticate or authorize
console.log("🔐 Authenticated using token:", AUTH_KEY);
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        window.location.href = 'home.html';
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Signup form handler
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('signup-username').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    free_calls_remaining: 50
                }
            }
        });

        if (error) throw error;
        alert('Registration successful! Please check your email for verification.');
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
});
