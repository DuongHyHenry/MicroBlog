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
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
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


app.post('/posts', isAuthenticated, (req, res) => {
    addPost(req.body.title, req.body.content, getCurrentUser(req));
    showDatabaseContents();
    res.redirect('back');
    // TODO: Add a new post and redirect to home
});
app.post('/like/:id', isAuthenticated, (req, res) => {
    updatePostLikes(req, res);
});

app.get('/profile', isAuthenticated, (req, res) => {
    renderProfile(req, res);
    // TODO: Render profile page
});
app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
    // TODO: Serve the avatar image for the user
});
app.post('/register', (req, res) => {
    registerUser(req, res);
    // TODO: Register a new user
});
app.post('/login', (req, res) => {
    loginUser(req, res);
    // TODO: Login a user
});
app.get('/logout', isAuthenticated, (req, res) => {
    logoutUser(req, res);
    // TODO: Logout the user
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    deletePost(req, res);
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
let posts = [
    { id: 1, title: 'My Recent Musings', content: 'This Daoist launched a technique at himself and became hurt, does that mean this Daoist is mighty or feeble?', username: 'Daoist Andy', timestamp: '2024-01-01 10:00', likes: 0 },
    { id: 2, title: 'The Decreasing Quality of Daoists Nowadays...', content: 'Upon reading Daoist Andy`s post, this Senior didn`t know whether to laugh or cry. Daoist Andy has eyes but cannot see Mount Tai...', username: 'Senior Wilson', timestamp: '2024-01-02 12:00', likes: 40 },
];
let users = [
    { id: 1, username: 'Daoist Andy', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'Senior Wilson', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];
let avatars = [];

let colors = ["#00A36C", "#87CEEB", "#0F52BA", "#DC143C", "#464344"];

function generateTimeStamp() {
    const currentTime = new Date();
    const year = twoDigits(currentTime.getFullYear());
    const month = twoDigits(currentTime.getMonth());
    const day = twoDigits(currentTime.getDate());
    const hours = twoDigits(currentTime.getHours());
    const minutes = twoDigits(currentTime.getMinutes());
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`;
    return timestamp;
}

function twoDigits(number) {
    if (number < 10) {
        number = "0" + number;
    }
    return number;
}

// Function to find a user by username
function findUserByUsername(username) {
    const userFound = users.find(userFound => userFound.username === username);
    return userFound;
    // TODO: Return user object if found, otherwise return undefined
}

// Function to find a user by user ID
function findUserById(userId) {
    const userFound = users.find(userFound => userFound.id === userId);
    return userFound;
    // TODO: Return user object if found, otherwise return undefined
}

// Function to add a new user
async function addUser(username) {
    try {
        let hashedGoogleId = 0;
        let avatar_url = `/avatar/${username}`;
        let memberSince = generateTimeStamp();
        return db.run(
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
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
function registerUser(req, res) {
    const { username } = req.body;
    userFound = findUserByUsername(username);
    if (userFound) {
        res.redirect('/register?error=Username%20Already%20Exists');
    }
    else {
        newUser = addUser(username);
        showDatabaseContents();
        req.session.userId = newUser.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
    
    // TODO: Register a new user and redirect appropriately
}

// Function to login a user
function loginUser(req, res) {
    const { username } = req.body;
    userFound = findUserByUsername(username);
    if (!userFound) {
        res.redirect('/login?error=Username%20Doesn`t%20Exist');
    }
    else {
        req.session.userId = userFound.id;
        req.session.loggedIn = true;
        res.redirect('/');
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
function renderProfile(req, res) {
    let allPosts = getPosts();
    let currentUser = getCurrentUser(req);
    currentUser.posts = [];
    currentUser.posts = posts.filter(post => post.username === currentUser.username);
    res.render('profile', {user : currentUser});
    // TODO: Fetch user posts and render the profile page
}

// Function to update post likes
function updatePostLikes(req, res) {
    const postId = req.params.id;
    const post = posts.find(post => post.id === parseInt(postId));
    post.likes++;
    res.json({ likes: post.likes });
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
function getCurrentUser(req) {
    return users[req.session.userId - 1];
    // TODO: Return the user object if the session user ID matches
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
async function addPost(title, content, user) {
    try {
        let timestamp = generateTimeStamp();
        let username = user.username;
        let likes = 0;
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [title, content, username, timestamp, likes]
        );
    } catch(error) {
        console.error("Error adding post:", error);
    }
    // TODO: Create a new post object and add to posts array
}

function deletePost(req, res) {
    const postId = parseInt(req.params.id);
    const index = posts.findIndex(post => post.id === postId);
    posts.splice(index, 1);

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

    await db.close();
}