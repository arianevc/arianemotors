import passport from "passport"
import { Strategy as googleStrategy } from "passport-google-oauth20"
import User from "../model/userSchema.js"
import { generateReferralCode } from "../helpers/codeGenerator.js"
import dotenv from 'dotenv'
dotenv.config()
passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
},
async (accessToken,refreshToken,profile,done)=>{
    try {
        //check for if this googleId exists in Db
        let user= await User.findOne({googleId:profile.id})
        if(user){
            return done(null,user)
        }
        //check for existing email
        const existingEmailUser=await User.findOne({email:profile.emails[0].value})
        if(existingEmailUser){
            existingEmailUser.googleId=profile.id
            await existingEmailUser.save()
            return done(null,existingEmailUser)
        }
        
        //if new user
        let newReferralCode=await generateReferralCode()
               user=new User({
                   name:profile.displayName,
                   email:profile.emails[0].value,
                googleId:profile.id,
                referralCode:newReferralCode
            })
            await user.save()
            console.log(user)
            return done(null,user)
        
        
    } catch (error) {
        return done(error,null)
    }
}
))


passport.serializeUser((user,done)=>{//to store the googleAuth details of user in session
    done(null,user._id)
})
passport.deserializeUser((id,done)=>{//to access the info in session
    User.findById(id)
    .then(user=>done(null,user))
    .catch(err=>done(err,null))
})
export default passport