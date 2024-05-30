const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

let db;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SQL Database Connection
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

async function startConnection() {
    try {
        db = await sqlite.open({ 
            filename: 'databaseFile.db', 
            driver: sqlite3.Database 
        });
        console.log("Database connected successfully.");
    } catch (err) {
        console.error("Error connecting to the database:", err);
        process.exit(1);
    }
}

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Seekers of Dao';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Enlightenment';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', async (req, res) => {
    const posts = await getPosts();
    const user = await getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.post('/posts', isAuthenticated, async (req, res) => {
    console.log("Adding post:");
    await addPost(req.body.title, req.body.content, await getCurrentUser(req));
    showDatabaseContents();
    res.redirect('back');
    // TODO: Add a new post and redirect to home
});
app.post('/like/:id', isAuthenticated, async (req, res) => {
    await updatePostLikes(req, res);
});

app.get('/profile', isAuthenticated, async (req, res) => {
    await renderProfile(req, res);
    // TODO: Render profile page
});
app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
    // TODO: Serve the avatar image for the user
});
app.post('/register', async (req, res) => {
    await registerUser(req, res);
    // TODO: Register a new user
});

app.post('/login', async (req, res) => {
    await loginUser(req, res);
    // TODO: Login a user
});
app.get('/logout', isAuthenticated, (req, res) => {
    logoutUser(req, res);
    // TODO: Logout the user
});
app.post('/delete/:id', isAuthenticated, async (req, res) => {
    await deletePost(req, res);
    res.redirect('back');

    // TODO: Delete a post if the current user is the owner
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

startConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users

let avatars = [];

let colors = ["#00A36C", "#87CEEB", "#0F52BA", "#DC143C", "#464344"];

async function generateTimeStamp() {
    try {
        const currentTime = new Date();
        const year = twoDigits(currentTime.getFullYear());
        const month = twoDigits(currentTime.getMonth());
        const day = twoDigits(currentTime.getDate());
        const hours = twoDigits(currentTime.getHours());
        const minutes = twoDigits(currentTime.getMinutes());
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;
        return timestamp;
    } catch(error) {
        console.log("Could not generate TimeStamp", error);
    }
    
}

function twoDigits(number) {
    if (number < 10) {
        number = "0" + number;
    }
    return number;
}

// Function to find a user by username
// Define an async function to find a user by username
async function findUserByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = ?';
  
    try {
      const row = await db.get(query, [username]);
      if (row) {
        console.log(row);
        return row;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error executing query:', error.message);
      throw new Error('Internal Server Error');
    }
  }
  
  

// Function to find a user by user ID
async function findUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = ?';
  
    try {
      const row = await db.get(query, [userId]);
  
      if (row) {
        console.log(row);
        return row;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error executing query:', error.message);
      throw new Error('Internal Server Error');
    }
  }

// Function to add a new user
async function addUser(username) {
    try {
        let hashedGoogleId = '';
        let avatar_url = `/avatar/${username}`;
        let memberSince = await generateTimeStamp();
        return await db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [username, hashedGoogleId, avatar_url, memberSince]
        );
    } catch(error) {
        console.error("Error adding user:", error);
    }
    // TODO: Create a new user object and add to users array
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res) {
    try {
        const { username } = req.body;
        console.log("registering user");
        let user = await findUserByUsername(username);
        if (user) {
            console.log(user);
            res.redirect('/register?error=Username%20Already%20Exists');
        }
        else {
            console.log("User not found");
            let newUser = await addUser(username);
            showDatabaseContents();
            req.session.userId = user.id;
            console.log("Current User ID: ", req.session.userId);
            req.session.loggedIn = true;
            res.redirect('/');
        }
    } catch(error) {
        console.log("Error:", error);
    }
    // TODO: Register a new user and redirect appropriately
}

// Function to login a user
async function loginUser(req, res) {
    try {
        const { username } = req.body;
        let user = await findUserByUsername(username);
        if (!user) {
            res.redirect('/login?error=Username%20Doesn`t%20Exist');
        }
        else {
            console.log(user);
            req.session.userId = user.id;
            console.log("Current User ID: ", req.session.userId);
            req.session.loggedIn = true;
            res.redirect('/');
        }
    } catch(error) {
        console.log("Failed to login user:", error);
    }
    
    
    // TODO: Login a user and redirect appropriately
}

// Function to logout a user
function logoutUser(req, res) {
    req.session.destroy;
    req.session.loggedIn = false;
    req.session.userId = '';
    res.redirect('/');
    // TODO: Destroy session and redirect appropriately
}

// Function to render the profile page
async function renderProfile(req, res) {
    try {
        let allPosts = await getPosts();
        let currentUser = await getCurrentUser(req);
        currentUser.posts = [];
        console.log(currentUser.username, "'s profile");
        let query = "SELECT * FROM posts WHERE username = ?"
        currentUser.posts = await db.all(query, [currentUser.username]);
        res.render('profile', {user : currentUser});
    } catch(error) {
        console.log("Failed to render profile: ", error);
    }
    
    // TODO: Fetch user posts and render the profile page
}

// Function to update post likes
async function updatePostLikes(req, res) {
    try {
        const postId = req.params.id;
        console.log(postId);
        
        let query = "SELECT * FROM posts WHERE id = ?";
        const post = await db.get(query, [postId]);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        post.likes++;
        await db.run('UPDATE posts SET likes = ? WHERE id = ?', [post.likes, postId]);
        
        res.json({ likes: post.likes });
    } catch(error) {
        console.log("Failed to update likes:", error);
    }
    
    // TODO: Increment post likes if conditions are met
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    letter = req.params.username[0];
    username = req.params.username;
    const dataBuffer = generateAvatar(letter);
    res.set('Content-Type', 'image/png');
    res.send(dataBuffer);
    // TODO: Generate and serve the user's avatar image
}

// Function to get the current user from session
async function getCurrentUser(req) {
    try {
        return await findUserById(req.session.userId);
    } catch(error) {
        console.log("Error getting current user:", error);
    }
    // TODO: Return the user object if the session user ID matches
}

// Function to get all posts, sorted by latest first
async function getPosts() {
    try {
        return await db.all('SELECT * FROM posts');
    } catch(error) {
        console.log("Failed to get posts:", error);
    }
    
}

// Function to add a new post
async function addPost(title, content, user) {
    try {
        let timestamp = await generateTimeStamp();
        let username = user.username;
        let likes = 0;
        return await db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [title, content, username, timestamp, likes]
        );
    } catch(error) {
        console.error("Error adding post:", error);
    }
    // TODO: Create a new post object and add to posts array
}

async function deletePost(req, res) {
    try {
        const postId = parseInt(req.params.id);
        let query = "DELETE FROM posts WHERE id = ?"
        await db.all(query, postId);
    } catch(error) {
        console.log("Failed to delete post:", error);
    }
    

}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    const newCanvas = canvas.createCanvas(100, 100);
    const ctx = newCanvas.getContext('2d');
    
    // Choose a random color from the colors array
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Set the background color
    const color = letter.charCodeAt(0) % colors.length;
    ctx.fillStyle = colors[color];
    ctx.fillRect(0, 0, 100, 100);
    
    // Draw the letter in the center
    ctx.font = '40px Arial';
    ctx.fillStyle = '#FFFFFF'; // Text color
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 50, 50);
    
    return newCanvas.toBuffer('image/png');
}

async function showDatabaseContents() {

    // Check if the users table exists
    const usersTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users';`);
    if (usersTableExists) {
        console.log('Users table exists.');
        const users = await db.all('SELECT * FROM users');
        if (users.length > 0) {
            console.log('Users:');
            users.forEach(user => {
                console.log(user);
            });
        } else {
            console.log('No users found.');
        }
    } else {
        console.log('Users table does not exist.');
    }

    // Check if the posts table exists
    const postsTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='posts';`);
    if (postsTableExists) {
        console.log('Posts table exists.');
        const posts = await db.all('SELECT * FROM posts');
        if (posts.length > 0) {
            console.log('Posts:');
            posts.forEach(post => {
                console.log(post);
            });
        } else {
            console.log('No posts found.');
        }
    } else {
        console.log('Posts table does not exist.');
    }

}