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


app.get('/', function (req, res, next) {
  // Filters or Searching
  const params = [];
  
  // Filter ID 
  //done
  if (req.query.id) {
    params.push(`id = '${req.query.id}'`);
  }
  // Filter string 
  //done
  if (req.query.string) {
    params.push(`string LIKE '%' || '${req.query.string}' || '%'`);
  }
  // Filter integer
  //done
  if (req.query.integer) {
    params.push(`integer = '${req.query.integer}'`);
  }
  // Filter float
  //done
  if (req.query.float) {
    params.push(`float = '${req.query.float}'`);
  }
  // Filter date
  // bermasalah
  if (req.query.startDate && req.query.endDate) {
    params.push(`date BETWEEN '${req.query.startDate}' AND '${req.query.endDate}'`);
  }
  // Filter boolean
  // sisa true yang bermasalah
  if (req.query.boolean === 'true' || req.query.boolean === 'false') {
    params.push(`boolean = '${req.query.boolean}'`);
  }

  // Pagination
  let sqlCount = `SELECT count(*) as total FROM entries`;
  if (params.length > 0) {
    sqlCount += ` WHERE ${params.join(' AND  ')}`;
  }
  db.get(sqlCount, [], (err, row) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    const rows = row ? row.total : 0;
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    const pages = Math.ceil(rows / limit);
    const url = req.url == '/' ? '/?page=1' : req.url

    let sql = `SELECT * FROM entries`;
    if (params.length > 0) {
      sql += ` WHERE ${params.join(' AND  ')}`;
    }
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error(err);
        return next(err);
      }
      res.render('index', { title: 'SQLITE-Bread', data: rows, pages, page, query: req.query, url });
    });
  });
});


  
  




  app.get('/add', (req, res) => {
    res.render('add');
  });

  app.post('/add', (req, res) => {
    console.log(req.body.string)
    const newData = {
      string: req.body.string,
      integer: parseInt(req.body.integer),
      float: parseFloat(req.body.float),
      date: req.body.date,
      boolean: req.body.boolean,
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


  app.post('/delete/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
  
    db.run('DELETE FROM entries WHERE id = ?', [itemId], function (err) {
      if (err) {
        console.error(err.message);
        throw err;
      }
      console.log(`Row(s) deleted: ${this.changes}`);
      res.redirect('/');
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
      boolean: req.body.boolean,
    };
    console.log(updatedData)
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
