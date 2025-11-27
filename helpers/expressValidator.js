import { body } from "express-validator";

//signup validation
const signupValidator=[
    body('name').trim().notEmpty().withMessage("Name is required")
    .isLength({min:3}).withMessage("Name should have atleast 3 characters"),
    
    body('email').trim().notEmpty().isEmail().withMessage("Provide a valid Email"),

    body('phone').trim().notEmpty().withMessage("Phone number cannot be empty")
    .isNumeric().withMessage('Phone number must not contain any characters').isLength({min:10,max:10}).withMessage("Phone number must be atleast 10 digits"),

    body('password').trim().notEmpty().withMessage("Password cannot be empty").isLength({min:6}).withMessage("Password should be of atleast 6 characters"),

    body('cpassword').trim().notEmpty().withMessage("Re-Enter the password in the specified field")
    .custom((value,{req})=>{
        if(value!==req.body.password){
            throw new Error("Passwords do not match")
        }
        return true
    })
]
export{signupValidator}