const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const storage = multer.memoryStorage(); // Store the file as a buffer in memory

// Create the Multer upload instance
const upload = multer({ storage: storage });

const app = express();

// Middleware for parsing form data
app.use(express.urlencoded({ extended: false }));

// Set view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'static' directory
app.use(express.static(path.join(__dirname, 'images')));

// Load users from 'db.json'
const loadUsers = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Handle the error (file doesn't exist or invalid JSON)
        console.error('Error loading users:', error.message);
        return [];
    }
};

// Save users to 'db.json'
const saveUsers = (users) => {
    users.forEach((user) => {
        // Add timestamps if not already present
        if (!user.created_at) {
            user.created_at = new Date().toLocaleString('en-US', {
                timeZone: 'UTC',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
        if (!user.updated_at) {
            user.updated_at = [];
        }
    });

    // Sort the users by creation date in descending order (newest first)
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const data = JSON.stringify(users, null, 2);
    fs.writeFileSync(path.join(__dirname, 'db.json'), data, 'utf-8');
};

// Show all users
app.get('/', (req, res) => {
    const users = loadUsers();
    res.render('allUser', { users });
});

// Show add user form
app.get('/addUser', (req, res) => {
    res.render('addUserForm');
});

// 'addUser' route
app.post('/addUser', upload.single('uploadImage'), (req, res) => {
    const { name, age, city, image } = req.body;

    // Validate other fields as needed

    const user_id = Date.now().toString();
    let img_path;
    let image_path;

    if (req.file) {
        // If the file is uploaded, handle the buffer and save to the 'images' folder
        const buffer = req.file.buffer;
        const extension = path.extname(req.file.originalname);
        img_path = `images/${user_id}${extension}`; // Using user_id as a unique identifier
        image_path = `${user_id}${extension}`;

        // Ensure the 'images' folder exists
        if (!fs.existsSync('images')) {
            fs.mkdirSync('images');
            console.log('Created images folder');
        }

        try {
            fs.writeFileSync(img_path, buffer);
            console.log('Image successfully written to', img_path);
        } catch (error) {
            console.error('Error writing image:', error);
        }
    } else if (image) {
        // If an absolute path is provided, use it
        img_path = image;
        console.log("image not come");
    } else {
        // Use a default image if no file or absolute path is provided
        img_path = 'default-image.jpg';
        console.log("default");
    }

    img_path = image_path;

    // Format the date in a specific format (e.g., DD/MM/YYYY HH:mm:ss A)
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-US', {
        timeZone: 'IST',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const newUser = {
        user_id,
        name,
        age,
        city,
        img_path,
        created_at: formattedDate, // Set the created_at timestamp
        updated_at: [] // Initialize updated_at as an empty array
    };

    const users = loadUsers();
    users.push(newUser);
    saveUsers(users);

    res.redirect('/');
});

// ... (other routes)


// Show user details
app.get('/user/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const users = loadUsers();
    const user = users.find((u) => u.user_id === user_id);

    if (!user) {
        // Handle user not found
        res.send('User not found');
    } else {
        res.render('user', { user });
    }
});


// Show edit user form
app.get('/editUser/:user_id', (req, res) => {
    const user_id = req.params.user_id;
    const users = loadUsers();
    const user = users.find((u) => u.user_id === user_id);

    if (!user) {
        // Handle user not found
        res.send('User not found');
    } else {
        res.render('updateUserForm', { user });
    }
});

// Handle edit user form submission
app.post('/editUser/:user_id', upload.single('image'), (req, res) => {
    const user_id = req.params.user_id;
    const { name, age, city } = req.body;

    // Validate other fields as needed

    // Load existing users
    let users = loadUsers();

    let img_path;
    let image_path;

    if (req.file !== undefined) {
        // If the file is uploaded, handle the buffer and save to the 'images' folder
        fs.unlinkSync(path.join(__dirname,'images',loadUsers().find((u) => u.user_id === user_id).img_path))
        const buffer = req.file.buffer;
        const extension = path.extname(req.file.originalname);
        img_path = `images/${Date.now().toString()}${extension}`; // Using user_id as a unique identifier
        image_path = `${Date.now().toString()}${extension}`;

        // Ensure the 'images' folder exists
        if (!fs.existsSync('images')) {
            fs.mkdirSync('images');
            console.log('Created images folder');
        }

        try {
            fs.writeFileSync(img_path, buffer);
            console.log('Image successfully written to', img_path);
        } catch (error) {
            console.error('Error writing image:', error);
        }
    } else {
        // Use a default image if no file or absolute path is provided
        image_path = loadUsers().find((u) => u.user_id === user_id).img_path;
        console.log("default");
    }

    img_path = image_path;

    // Find the user to update
    const userIndex = users.findIndex((u) => u.user_id === user_id);

    if (userIndex === -1) {
        // Handle user not found
        res.send('User not found');
    } else {
        // Update user data
        const updatedUser = {
            user_id,
            name,
            age,
            city,
            img_path,
            created_at: users[userIndex].created_at,
            updated_at: [...users[userIndex].updated_at, new Date().toLocaleString()]
        };

        users[userIndex] = updatedUser;

        // Save the updated users to 'db.json'
        saveUsers(users);

        // Redirect to the user details page
        res.redirect(`/user/${user_id}`);
    }
});


// Delete user
app.post('/deleteUser/:user_id', (req, res) => {
    const user_id = req.params.user_id;

    // Load existing users
    let users = loadUsers();

    // Find the user to delete it's image
    const Tusers = users.find((u) => u.user_id == user_id);
    const img_path = Tusers.img_path

    // Filter out the user to delete
    users = users.filter((u) => u.user_id !== user_id);

    // Save the updated users to 'db.json'
    saveUsers(users);
    fs.unlinkSync(__dirname + '/images/' + img_path)

    // Redirect to the home page
    res.redirect('/');
});

app.listen(8000, () => {
    console.log('http://localhost:8000');
});
