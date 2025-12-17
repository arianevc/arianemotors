import express from "express";
const app=express()
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import  {connectDB}  from "./config/db.js";
import nocache from "nocache";
import dotenv from 'dotenv'
const port=process.env.PORT||5000
import passport from "./config/passport.js";
import { cloudinaryConfig } from "./config/cloudinary.js";
import userRoutes from './routes/userRoutes/route.user.js'
import shopRoutes from './routes/userRoutes/route.shop.js'
import adminRoutes from './routes/adminRoutes/route.admin.js'
import setLocals from "./helpers/setLocals.js";

app.use(nocache())

const __filename=fileURLToPath(import.meta.url)
const __dirname=path.dirname(__filename)
app.use( express.static(path.join(__dirname, 'public')));

//set no cache to avoid cache 
app.use((req,res,next)=>{
    res.set('Cache-Contol','no-store')
    next()
})

//config functions for ENV,MONGODB and Cloudinary
dotenv.config() 
connectDB();
cloudinaryConfig()

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


app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

//set localdata
app.use(setLocals)

app.use((req,res,next)=>{
    res.locals.logo='/frontend/assets/imgs/theme/am_logo_tiny.png'
    next()
})
//routes for different paths
app.use('/',userRoutes)
app.use('/shop',shopRoutes)
app.use('/admin',adminRoutes)

app.use((req,res,next)=>{
    const isAdmin=req.session.isAdmin?true:false
    res.status(404).render('user/error',{statusCode:404,isAdmin,statusMessage:"Page Not Found"})
})
app.listen(port,(err)=>{
    if(err)console.log(err)
    console.log(`Server running on http://localhost:${port}` )
})