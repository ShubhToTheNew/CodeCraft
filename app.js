// ============================================
// CodeCraftHub - Personalized Learning Platform
// A simple REST API to track courses
// ============================================

// Import required modules
const express = require('express');           // Express framework for building the API
const fs = require('fs');                     // File System module to read/write files
const path = require('path');                 // Path module to handle file paths

// Initialize the Express application
const app = express();

// Define the port the server will run on
const PORT = 5000;

// Define the path to our JSON "database" file
const DATA_FILE = path.join(__dirname, 'courses.json');

// Define allowed status values for validation
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];

// ============================================
// MIDDLEWARE
// ============================================

// Enable parsing of JSON request bodies
// This allows us to read JSON data sent in POST/PUT requests
app.use(express.json());

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialize the courses.json file if it doesn't exist.
 * This ensures the app works on first run without manual setup.
 */
function initializeDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    // Create the file with an empty array as starting data
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    console.log('Created courses.json file');
  }
}

/**
 * Read all courses from the JSON file.
 * Returns an array of course objects.
 */
function readCourses() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    // Parse the JSON string into a JavaScript array
    return JSON.parse(data);
  } catch (error) {
    // If reading fails, throw an error to be caught by the route handler
    throw new Error('Failed to read courses data: ' + error.message);
  }
}

/**
 * Write courses array to the JSON file.
 * The 'null, 2' arguments make the JSON nicely formatted (indented).
 */
function writeCourses(courses) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
  } catch (error) {
    throw new Error('Failed to write courses data: ' + error.message);
  }
}

/**
 * Generate the next available ID.
 * If no courses exist, start from 1.
 * Otherwise, take the highest existing ID and add 1.
 */
function generateNextId(courses) {
  if (courses.length === 0) return 1;
  const maxId = Math.max(...courses.map(course => course.id));
  return maxId + 1;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/courses
 * Returns all courses.
 */
app.get('/api/courses', (req, res) => {
  try {
    const courses = readCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/courses/:id
 * Returns a single course by id.
 */
app.get('/api/courses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }
    const courses = readCourses();
    const course = courses.find(c => c.id === id);
    if (!course) {
      return res.status(404).json({ error: `Course with id ${id} not found` });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/courses
 * Creates a new course.
 */
app.post('/api/courses', (req, res) => {
  try {
    const { name, description, target_date, status } = req.body;

    if (!name || !description || !target_date || !status) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, target_date, status',
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const courses = readCourses();
    const newCourse = {
      id: generateNextId(courses),
      name,
      description,
      target_date,
      status,
    };
    courses.push(newCourse);
    writeCourses(courses);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/courses/:id
 * Updates an existing course (partial updates allowed).
 */
app.put('/api/courses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const courses = readCourses();
    const index = courses.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Course with id ${id} not found` });
    }

    const updates = req.body;
    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    courses[index] = { ...courses[index], ...updates, id };
    writeCourses(courses);
    res.json(courses[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/courses/:id
 * Removes a course by id.
 */
app.delete('/api/courses/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const courses = readCourses();
    const index = courses.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Course with id ${id} not found` });
    }

    const removed = courses.splice(index, 1)[0];
    writeCourses(courses);
    res.json({ message: 'Course deleted', course: removed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return JSON (not HTML) when the request body is not valid JSON
app.use((err, req, res, next) => {
  const isJsonBodyParseError =
    err instanceof SyntaxError &&
    err.status === 400 &&
    Object.prototype.hasOwnProperty.call(err, 'body');
  if (isJsonBodyParseError) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      detail: err.message,
    });
  }
  next(err);
});

// ============================================
// START SERVER
// ============================================

initializeDataFile();

app.listen(PORT, () => {
  console.log('- CodeCraftHub API is starting...');
  console.log(`- Data will be stored in: \`${DATA_FILE}\``);
  console.log(`- API is available at: \`http://localhost:${PORT}\``);
});
