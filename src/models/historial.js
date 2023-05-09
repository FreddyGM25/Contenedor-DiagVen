const mongoose = require("mongoose")

const historialSchema = mongoose.Schema({
    iduser:{
        type:mongoose.Types.ObjectId
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
    }],
    revision:{
        type:Boolean
    }
},
    { timestamps: true }
)

module.exports = mongoose.model('Historial', historialSchema)
