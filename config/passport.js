import passport from "passport"
import { Strategy as googleStrategy } from "passport-google-oauth20"
import User from "../model/userSchema.js"
import dotenv from 'dotenv'
dotenv.config()
passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
},
async (accessToken,refreshToken,profile,done)=>{
    try {
        let user= await User.findOne({googleId:profile.id})
        if(user){
            return done(null,user)
        }
        else{
            user=new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id
            })
            await user.save()
            console.log(user)
            return done(null,user)
        }
        
    } catch (error) {
        return done(error,null)
    }
}
))


passport.serializeUser((user,done)=>{//to store the googleAuth details of user in session
    done(null,user.id)
})
passport.deserializeUser((id,done)=>{//to access the info in session
    User.findById(id)
    .then(user=>{
        done(null,user)
        console.log("this log",user)
    }).catch(err=>{
        done(err,null)
    })
})
export default passport