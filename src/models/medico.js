const mongoose = require("mongoose")

const MedicoSchema = mongoose.Schema({
    nombre:{
        type:String,
        required:true
    },
    apellido:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    telefono:{
        type:String,
        required:true
    },
},
    { timestamps: true }
)

module.exports = mongoose.model('Medico', MedicoSchema)
