const nodemailer=require('nodemailer')

async function verifyEmail(email,otp) {
    try {
        console.log("email function called")
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSKEY
            }
        })
        const info= await transporter.sendMail({
            from:`Ariane Motors <${process.env.NODEMAILER_EMAIL}>`,
            to:email,
            subject:'Verify your account on Ariane Motors',
            text:`Your OTP is ${otp} to verify your account`,
            html:`<h3>Hi there!</h3>
  <p>Use the following OTP to verify your email address:</p>
  <h2>${otp}</h2>
  <p>This OTP is valid for 2 minutes.</p>
  <br>
  <p>– The Arachnid & Team</p>`
        })
        return info.accepted.length>0
    } catch (error) {
        console.log("Error in sending OTP",error)
    }
    
}
module.exports=verifyEmail