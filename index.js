import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

const dbName = process.env.DB_NAME || 'recipe_box';
const db = new pg.Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: dbName,
  password: process.env.DB_PASSWORD || '00000000',
  port: Number(process.env.DB_PORT || 5432)
});

// Attempt to connect and fail fast with a helpful message if connection fails
db.connect()
  .then(() => console.log(`Connected to Postgres database "${dbName}"`))
  .catch(err => {
    console.error('Failed to connect to Postgres:', err);
    console.error('Ensure Postgres is running and the database exists. You can run `db/schema.sql` to create the `recipes` table.');
    process.exit(1);
  });

app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM recipes ORDER BY created_at DESC');
    res.render('recipes.ejs', { recipes: result.rows });
  } catch (err) {
    console.error('Error loading recipes:', err);
    const msg = process.env.NODE_ENV === 'development' ? `Error loading recipes: ${err.message}` : 'Error loading recipes';
    res.status(500).send(msg);
  }
});

app.post('/add-recipe', async (req, res) => {
  const { title, ingredients, instructions, imageUrl, tags } = req.body;
  if(!title) return res.status(400).send('Title required');
  try{
    await db.query(
      'INSERT INTO recipes (title, ingredients, instructions, image_url, tags) VALUES ($1,$2,$3,$4,$5)',
      [title, ingredients, instructions, imageUrl, tags]
    );
    res.redirect('/');
  }catch(err){
    console.error('Error adding recipe:', err);
    const msg = process.env.NODE_ENV === 'development' ? `Error adding recipe: ${err.message}` : 'Error adding recipe';
    res.status(500).send(msg);
  }
});

app.post('/delete-recipe', async (req, res) => {
  const id = req.body.recipeId;
  try{
    await db.query('DELETE FROM recipes WHERE id=$1', [id]);
    res.redirect('/');
  }catch(err){
    console.error('Error deleting recipe:', err);
    const msg = process.env.NODE_ENV === 'development' ? `Error deleting recipe: ${err.message}` : 'Error deleting recipe';
    res.status(500).send(msg);
  }
});

app.post('/edit-recipe', async (req, res) => {
  const { recipeId, title, ingredients, instructions, imageUrl, tags } = req.body;
  try{
    await db.query('UPDATE recipes SET title=$1, ingredients=$2, instructions=$3, image_url=$4, tags=$5 WHERE id=$6',
      [title, ingredients, instructions, imageUrl, tags, recipeId]
    );
    res.redirect('/');
  }catch(err){
    console.error('Error editing recipe:', err);
    const msg = process.env.NODE_ENV === 'development' ? `Error editing recipe: ${err.message}` : 'Error editing recipe';
    res.status(500).send(msg);
  }
});

app.listen(port, ()=> console.log(`Recipe Box running on http://localhost:${port}`));
