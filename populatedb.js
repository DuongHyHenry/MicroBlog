// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'databaseFile.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_img TEXT,
            avatar_frame TEXT,
            memberSince DATETIME NOT NULL,
            sect TEXT
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sectPosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL,
            sect TEXT
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'Daoist Andy', hashedGoogleId: 'hashedGoogleId1', avatar_img: '/images/profilePictures/pic1.jpeg', avatar_frame: '/images/profilePictures/frame2.png', memberSince: '2024-01-01 12:00:00', sect: 'Doan Sect' },
        { username: 'Young Master Wilson', hashedGoogleId: 'hashedGoogleId2', avatar_img: '/images/profilePictures/pic2.jpeg', avatar_frame: '/images/profilePictures/frame2.png', memberSince: '2024-01-02 12:00:00', sect: 'Truong Sect' }
    ];

    const posts = [
        { title: 'My Recent Musings', content: 'This Daoist launched a technique at himself and became hurt, does that mean this Daoist is mighty or feeble?', username: 'Daoist Andy', timestamp: '2024-01-01 12:30:00', likes: 0 },
        { title: 'The Decreasing Quality of Daoists Nowadays...', content: 'Upon reading Daoist Andy`s post, this Senior didn`t know whether to laugh or cry. Daoists these days are truly horrendous. Daoist Andy has eyes but cannot see Mount Tai...', username: 'Young Master Wilson', timestamp: '2024-01-02 12:30:00', likes: 40 }
    ];

    const sectPosts = [
        { title: 'Truong Sect', content: 'I hate the Truong Sect', username: 'Young Master Wilson', timestamp: '2024-01-01 12:30:00', likes: 0, sect: 'Doan Sect' },
        { title: 'Indeed', content: 'I agree', username: 'Young Master Wilson', timestamp: '2024-01-02 12:30:00', likes: 40, sect: 'Doan Sect' }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_img, avatar_frame, memberSince, sect) VALUES (?, ?, ?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_img, user.avatar_frame, user.memberSince, user.sect]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    await Promise.all(sectPosts.map(sectPost => {
        return db.run(
            'INSERT INTO sectPosts (title, content, username, timestamp, likes, sect) VALUES (?, ?, ?, ?, ?, ?)',
            [sectPost.title, sectPost.content, sectPost.username, sectPost.timestamp, sectPost.likes, sectPost.sect]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});