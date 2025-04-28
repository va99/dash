// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key';
const supabase = supabaseClient.createClient(supabaseUrl, supabaseKey);

// Login form handler
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        // Store auth data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('session', JSON.stringify(data.session));
        
        window.location.href = 'home.html';
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Signup form handler
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
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
                    username: username
                }
            }
        });

        if (error) throw error;
        
        // Create user credits entry
        if (data.user) {
            const { error: creditsError } = await supabase
                .from('user_credits')
                .insert([{ 
                    user_id: data.user.id,
                    free_calls_remaining: 50
                }]);
                
            if (creditsError) console.error('Error creating credits:', creditsError);
        }
        
        alert('Registration successful! Please check your email for verification.');
    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
});

// Check if user is authenticated on protected pages
function checkAuth() {
    const session = JSON.parse(localStorage.getItem('session'));
    const protectedPages = ['home.html', 'dashboard.html', 'settings.html', 'user.html', 'help.html'];
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && (!session || new Date(session.expires_at) < new Date())) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Update UI with user info if on protected pages
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const userElements = document.querySelectorAll('.pagetop a[href="profile.html"]');
        userElements.forEach(el => {
            el.textContent = user.user_metadata.username || user.email;
        });
    }
    
    // Handle logout links
    const logoutLinks = document.querySelectorAll('a[href="logout.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            localStorage.removeItem('user');
            localStorage.removeItem('session');
            window.location.href = 'index.html';
        });
    });
    
    // Load token data on home page
    if (window.location.pathname.includes('home.html')) {
        loadUserToken();
    }
});

// Function to generate a new API token
async function generateNewToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('You must be logged in to generate a token');
        return;
    }
    
    try {
        // First, deactivate any existing tokens
        const { error: updateError } = await supabase
            .from('api_tokens')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true);
        
        if (updateError) throw updateError;
        
        // Generate a new token
        const tokenPrefix = 'napier_tk_';
        const randomPart = Array(24)
            .fill(0)
            .map(() => Math.random().toString(36).charAt(2))
            .join('');
        const newToken = tokenPrefix + randomPart;
        
        // Save the new token
        const { error } = await supabase
            .from('api_tokens')
            .insert([{ 
                user_id: user.id,
                token: newToken
            }]);
        
        if (error) throw error;
        
        // Update UI
        const tokenContainer = document.querySelector('.token-container code');
        if (tokenContainer) {
            tokenContainer.textContent = newToken;
        }
        
        alert('New token generated successfully!');
    } catch (error) {
        alert('Error generating token: ' + error.message);
    }
}

// Function to load user token on home page
async function loadUserToken() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    try {
        // Get active token
        const { data: tokens, error } = await supabase
            .from('api_tokens')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);
        
        if (error) throw error;
        
        const tokenContainer = document.querySelector('.token-container code');
        if (tokenContainer) {
            if (tokens && tokens.length > 0) {
                tokenContainer.textContent = tokens[0].token;
            } else {
                tokenContainer.textContent = 'No active token. Generate one below.';
            }
        }
        
        // Get remaining free calls
        const { data: credits, error: creditsError } = await supabase
            .from('user_credits')
            .select('free_calls_remaining')
            .eq('user_id', user.id)
            .single();
        
        if (creditsError) throw creditsError;
        
        const remainingCalls = document.getElementById('remaining-calls');
        if (remainingCalls && credits) {
            remainingCalls.textContent = `Remaining free calls: ${credits.free_calls_remaining}/50`;
        }
    } catch (error) {
        console.error('Error loading token data:', error);
    }
}
