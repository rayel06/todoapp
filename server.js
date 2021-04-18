const express = require('express');
const app = express();
app.use(express.urlencoded({extended: true})) 
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
app.use(session({secret : '비밀코드', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
require('dotenv').config();
app.use('/shop', require('./routes/shop.js') );

let db;
MongoClient.connect( process.env.DB_URL, function(error, client){
    if (error) return console.log(error);
    db = client.db('todoapp');
        app.listen(process.env.PORT, function(){
            console.log('listening on 8080')
        });
    });

app.get('/', function(req,res){
    res.render(__dirname + '/views/index.ejs');
});

app.get('/write', function(req,res){
    res.render(__dirname + '/views/write.ejs');
});


app.post('/add', function(req, res){
    res.send('전송완료');
    db.collection('counter').findOne({name : '게시물갯수'}, function(error, result){
        let totalPost = result.totalPost;
        db.collection('post').insertOne( { _id : totalPost + 1, title : req.body.title, date : req.body.date} , function(error, result){
            console.log('저장완료');
            db.collection('counter').updateOne({name: '게시물갯수'},{ $inc : {totalPost:1}}, function(error, result){
            });
            if(error){return console.log(error)}
        });
    });
});

app.get('/list', function(req, res){
    db.collection('post').find().toArray(function(error, result){
        console.log(result);
        res.render('list.ejs', { posts : result});
    });
    });

app.delete('/delete', function(req,res){
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    db.collection('post').deleteOne( req.body, function(){
        res.send('삭제완료');
    });
});

app.get('/detail/:id', function(req, res){
    currentId = parseInt(req.params.id);
    db.collection('post').findOne({ _id : currentId}, function(error, result){
        res.render('detail.ejs', { data : result });
        console.log(result);
    });
});

app.get('/edit/:id', function(req, res){
    currentId = parseInt(req.params.id);
    db.collection('post').findOne({_id : currentId}, function(error, result){
        res.render('edit.ejs', {data : result});
    });

})

app.put('/edit', (req, res) => {
    db.collection('post').updateOne({_id: parseInt(req.body.id)},{$set : {title: req.body.title, date:req.body.date}}, (error, result) => {
        console.log('수정완료');
        res.redirect('/list');
    });
});

app.get('/login', function(req, res){
    res.render('login.ejs');
});
app.post('/login', passport.authenticate('local', {failureRedirect : '/fail'}), function(req, res){
    res.redirect('/')
  });

  app.get('/mypage', ifLogin ,function(req, res){
    console.log(req.user);
    res.render('mypage.ejs', {user : req.user});
})

function ifLogin(req, res, next){
    if(req.user){
        next();
    } else {
        // res.redirect('/login');
        res.send('로그인 안함');
    }
}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
  },   function(username, password, done) {
    //console.log('username', 'password');
    db.collection('login').findOne({ id: username }, function (err, result) {
      if (err) { return done(err); }
      if (!result) { return done(null, false,{message: '존재하지않는 아이디입니다.'}); } 
      if (password == result.pw) {
          return done (null, result)
      } else {
          return done(null, false, {message: '비밀번호가 일치하지 않습니다'})
      }
    });
  }));

  passport.serializeUser(function (user, done) {
    done(null, user.id)
  });
  
  passport.deserializeUser(function (user, done) {
    db.collection('login').findOne({ id: user }, function (err, result) {
      done(null, result)
    })
  }); 

