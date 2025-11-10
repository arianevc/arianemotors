import express from "express";
const app=express()
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import {v2 as cloudinary} from "cloudinary";
import  {connectDB}  from "./config/db.js";
import nocache from "nocache";
import dotenv from 'dotenv'
const port=process.env.PORT||5000
import passport from "./config/passport.js";
import userRoutes from './routes/userRoutes/route.user.js'
import shopRoutes from './routes/userRoutes/route.shop.js'
import adminRoutes from './routes/adminRoutes/route.admin.js'
import User from "./model/userSchema.js";

dotenv.config()
app.use(nocache())

const __filename=fileURLToPath(import.meta.url)
const __dirname=path.dirname(__filename)
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


app.use(async(req,res,next)=>{
    if(req.session.userId){
        try {
            const user=await User.findById(req.session.userId)
            res.locals.loggedUser=user?user.name:null
            res.locals.loggedUserImage=user?user.profileImage:null
        } catch (error) {
            console.error("Error in setting loggedUser local: ",error);
            res.locals.loggedUser=null
        }
    }else{
        res.locals.loggedUser=null
    }
    next()
})
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

app.use('/',userRoutes)
app.use('/shop',shopRoutes)
app.use('/admin',adminRoutes)

app.use((req,res,next)=>{
    res.status(404).render('user/error',{statusCode:404,statusMessage:"Page Not Found"})
})
app.listen(port,(err)=>{
    if(err)console.log(err)
    console.log(`Server running on http://localhost:${port}` )
})