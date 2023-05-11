const mongoose = require("mongoose")

const UserSchema = mongoose.Schema({
    nombre:{
        type:String
    },
    email:{
        type:String
    },
    historial:[{
        id:{
            type:Number
        },
        pregunta:{
            type:String
        },
        respuesta:{
            type:String
        }
    }]
},
    { timestamps: true }
)

module.exports = mongoose.model('User', UserSchema)
