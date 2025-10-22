const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'books.json');
app.use(express.json());

async function readBooks() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(DATA_FILE, '[]', 'utf8');
            return [];
        }
        throw err;
    }
}

async function writeBooks(books) {
    await fs.writeFile(DATA_FILE, JSON.stringify(books, null, 2), 'utf8');
}

app.get('/books', async (req, res) => {
    try {
        const books = await readBooks();
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read books file.' });
    }
});

app.get('/books/available', async (req, res) => {
    try {
        const books = await readBooks();
        res.json(books.filter(b => b.available === true));
    } catch (err) {
        res.status(500).json({ error: 'Failed to read books file.' });
    }
});

app.post('/books', async (req, res) => {
    try {
        const { title, author, available } = req.body;
        if (typeof title !== 'string' || typeof author !== 'string' || typeof available !== 'boolean') {
            return res.status(400).json({ error: 'Invalid payload. Expect { title: string, author: string, available: boolean }' });
        }
        const books = await readBooks();
        const nextId = books.reduce((max, b) => Math.max(max, b.id || 0), 0) + 1;
        const newBook = { id: nextId, title, author, available };
        books.push(newBook);
        await writeBooks(books);
        res.status(201).json(newBook);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add book.' });
    }
});

app.put('/books/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
        const updates = {};
        if ('title' in req.body) updates.title = req.body.title;
        if ('author' in req.body) updates.author = req.body.author;
        if ('available' in req.body) updates.available = req.body.available;
        const books = await readBooks();
        const idx = books.findIndex(b => b.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Book not found.' });
        books[idx] = { ...books[idx], ...updates };
        await writeBooks(books);
        res.json(books[idx]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update book.' });
    }
});

app.delete('/books/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
        const books = await readBooks();
        const idx = books.findIndex(b => b.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Book not found.' });
        const [deleted] = books.splice(idx, 1);
        await writeBooks(books);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete book.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));