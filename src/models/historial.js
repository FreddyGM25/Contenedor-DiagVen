const mongoose = require("mongoose")

const historialSchema = mongoose.Schema({
    iduser:{
        type:mongoose.Types.ObjectId
    },
    nameuser:{
        type:String,
        required:true
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
    },
    prioridad:{
        type:Boolean
    },
    idmedico:{
        type:mongoose.Types.ObjectId
    }
},
    { timestamps: true }
)

module.exports = mongoose.model('Historial', historialSchema)
