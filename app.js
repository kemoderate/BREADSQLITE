const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const ejs = require('ejs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

const db = new sqlite3.Database('data.db', (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  }
  console.log('Connected to the SQLite database.');
});

db.run(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    string TEXT,
    integer INTEGER,
    float REAL,
    date TEXT,
    boolean INTEGER
  )
`);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));



app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 3;
  const offset = (page - 1) * limit; // baru di rubah

  // select * from entries limit 3 offset 0;

  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM entries', (err, result) => {
      if (err) {
        console.error(err.message);
        throw err;
      }
      const totalCount = result.count;
      const totalPages = Math.ceil(totalCount / limit);
  
      db.all('SELECT * FROM entries ORDER BY id LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
        if (err) {
          console.error(err.message);
          throw err;
        }
  
        const paginatedData = rows;
        // console.log(paginatedData, 'ini paginated data');
  
        res.render('index', { data: paginatedData, totalPages: totalPages, currentPage: page });

      });
    });
  });  
})   
  
  
  
  




  app.get('/add', (req, res) => {
    res.render('add');
  });

  app.post('/add', (req, res) => {
    const newData = {
      string: req.body.string,
      integer: parseInt(req.body.integer),
      float: parseFloat(req.body.float),
      date: req.body.date,
      boolean: req.body.boolean === 'true' ? 1 : 0,
    };

    const sql = 'INSERT INTO entries (string, integer, float, date, boolean) VALUES (?, ?, ?, ?, ?)';
    const values = [newData.string, newData.integer, newData.float, newData.date, newData.boolean];

    db.run(sql, values, function (err) {
      if (err) {
        console.error(err.message);
        throw err;
      }
      console.log(`A row has been inserted with id ${this.lastID}`);
      res.redirect('/');
    });
  });


  app.delete('/delete/:id', (req, res) => {
    const itemId = parseInt(req.params.id);

    db.run('DELETE FROM entries WHERE id = ?', [itemId], function (err) {
      if (err) {
        console.error(err.message);
        throw err;
      }
      console.log(`Row(s) deleted: ${this.changes}`);
      res.sendStatus(200);
    });
  });



  app.get('/edit/:id', (req, res) => {
    const entryId = parseInt(req.params.id);

    db.get('SELECT * FROM entries WHERE id = ?', [entryId], (err, row) => {
      if (err) {
        console.error(err.message);
        throw err;
      }
      if (!row) {
        res.send('Data entry not found');
      } else {
        res.render('edit', { entry: row });
      }
    });
  });

  app.post('/edit/:id', (req, res) => {
    const entryId = parseInt(req.params.id);
    const updatedData = {
      string: req.body.string,
      integer: parseInt(req.body.integer),
      float: parseFloat(req.body.float),
      date: req.body.date,
      boolean: req.body.boolean === 'true' ? 1 : 0,
    };

    const sql = 'UPDATE entries SET string = ?, integer = ?, float = ?, date = ?, boolean = ? WHERE id = ?';
    const values = [updatedData.string, updatedData.integer, updatedData.float, updatedData.date, updatedData.boolean, entryId];

    db.run(sql, values, function (err) {
      if (err) {
        console.error(err.message);
        throw err;
      }
      console.log(`Row(s) updated: ${this.changes}`);
      res.redirect('/');
    });
  });


  app.get('/filter', (req, res) => {
    const filter = {
      string: req.query.string || '',
      integer: req.query.integer || '',
      float: req.query.float || '',
      date: req.query.date || '',
      boolean: req.query.boolean || '',
    };
  
    const sql = `
      SELECT * FROM entries
      WHERE string LIKE '%' || ? || '%'
        AND integer LIKE '%' || ? || '%'
        AND float LIKE '%' || ? || '%'
        AND date LIKE '%' || ? || '%'
        AND boolean LIKE '%' || ? || '%'
    `;
  
    const values = [filter.string, filter.integer, filter.float, filter.date, filter.boolean];
  
    db.serialize(() => {
      db.get('SELECT COUNT(*) as count FROM entries', (err, result) => {
        if (err) {
          console.error(err.message);
          throw err;
        }
  
        const totalCount = result.count;
        const totalPages = 1; // Set totalPages to 1 since pagination is not applicable for filtered results
  
        db.all(sql, values, (err, rows) => {
          if (err) {
            console.error(err.message);
            throw err;
          }
  
          const paginatedData = rows;
  
          res.render('index', { data: paginatedData, totalPages: totalPages, currentPage: 1 });
        });
      });
    });
  });  



  // Start 
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  // Close  database 
  process.on('SIGINT', () => {
    db.close((err) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Closed the SQLite database connection.');
      process.exit(0);
    });
  });
