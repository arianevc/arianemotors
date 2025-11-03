const express=require("express")
const app=express()

const session=require('express-session')
const path = require("path")
const connectDB = require("./config/db")
const dotenv=require('dotenv')
const nocache=require('nocache')
const port=process.env.PORT||5000
const passport=require('./config/passport')//for google auths
const userRoutes=require('./routes/userRoutes/route.user')
const adminRoutes=require('./routes/adminRoutes/route.admin')
dotenv.config()
app.use(nocache())

app.use( express.static(path.join(__dirname, 'public')));
// app.use(nocache)
app.use((req,res,next)=>{
    res.set('Cache-Contol','no-store')
    next()
})

// function noCache(req, res, next) {
//   res.set('Cache-Control', 'no-store');
//   next();
// }

connectDB();
// User session middleware
app.use('/', session({
    name: 'user.sid', 
    secret: process.env.USER_SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // remember to change it in hosting
        httpOnly: true,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

// Admin session middleware
app.use('/admin', session({
    name: 'admin.sid', // cookie name for admin
    secret: process.env.ADMIN_SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 2 * 60 * 60 * 1000
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

const User=require("./model/userSchema")
app.use(async(req,res,next)=>{
    if(req.session.userId){
        try {
            const user=await User.findById(req.session.userId)
            res.locals.loggedUser=user?user.name:null
        } catch (error) {
            console.error("Error in setting loggedUser local: ",error);
            res.locals.loggedUser=null
        }
    }else{
        res.locals.loggedUser=null
    }
    next()
})


app.use('/',userRoutes)
app.use('/admin',adminRoutes)


app.listen(port,(err)=>{
    if(err)console.log(err)
    console.log(`Server running on http://localhost:${port}` )
})