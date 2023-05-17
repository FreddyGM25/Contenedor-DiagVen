const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { default: mongoose } = require('mongoose')
require("dotenv").config()
const multer = require('multer')
const bcrypt = require('bcryptjs')
const upload = multer({ dest: 'uploads/' })
const { TokenAssign, TokenVerify, AuthCheck, TokenRemove } = require('./middleware/autentication')
const { getTemplate, sendEmail } = require('./middleware/email')
const userSchema = require('./models/user')
const historialSchema = require('./models/historial')
const medicoSchema = require('./models/medico')
const cors = require('cors')

// Datos del árbol de preguntas y respuestas
const arbol = require('./questions/question.json');

app.use(bodyParser.json());
app.use(cors({
  origin: "*", 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}));

app.get('/', (req, res) => {
  res.send("Welcome to my API bet")
})

// Endpoint para obtener una pregunta
app.post('/registro', upload.none(), async (req, res) => {
  if(req.body.nombre == "") return res.status(200).json({ Status: "Error", message: "Falta el campo 'Nombre' por completar"})
  if(req.body.email == "") return res.status(200).json({ Status: "Error", message: "Falta el campo 'Email' por completar"})
  const user = new userSchema({
    nombre: req.body.nombre,
    email: req.body.email,
    revision: false
  })
  const ver = await userSchema.findOne({ email: user.email })
  if (ver == undefined || ver == null) {
    const id = await user.save()
    const historial = new historialSchema({
      iduser: id._id,
      nameuser:user.nombre,
      revision: false
    })
    await historial.save()
    return res.status(200).json({ Status: "Success", message: "Gracias, a continuacion seguire atendiendo su solicitud", id: id._id })
  } else {
    await userSchema.updateOne({ _id:ver._id }, {
      $set: {
        nombre:user.nombre
      }
    })
    await historialSchema.updateOne({ iduser:ver._id }, {
      $set: {
        nameuser:user.nombre,
        historial:[]
      }
    })
    console.log(`Hola ${ver.nombre} has pasado por aqui antes, a continuacion seguiremos los pasos`)
    res.status(200).json({ Status: "Success", message: `Hola ${ver.nombre} has pasado por aqui antes, a continuacion seguiremos los pasos`, id: ver._id})
  }
})

//Preguntas chatbot
app.get('/preguntas/:id', upload.none(), async (req, res) => {
  const idPregunta = parseInt(req.params.id);

  const pregunta = arbol.find((pregunta) => pregunta.id === idPregunta);

  if (pregunta) {
    res.json(pregunta);
  } else {
    res.status(404).json({ mensaje: 'Pregunta no encontrada.' });
  }
});

// Endpoint para enviar una respuesta
app.put('/respuestas', upload.none(), async (req, res) => {
  const idPregunta = parseInt(req.body.id_pregunta);
  const respuesta = req.body.respuesta;
  const pregunta = arbol.find((pregunta) => pregunta.id === idPregunta);

  if (pregunta) {
    const respuestaSeleccionada = pregunta.respuestas.find(
      (r) => r.respuesta === respuesta
    );
    if (respuestaSeleccionada) {
      const siguientePreguntaId = respuestaSeleccionada.siguiente_pregunta;
      if (siguientePreguntaId === null) {
        // La conversación ha terminado
        res.json({ mensaje: 'Gracias por responder nuestras preguntas.' });
      } else {
        if (pregunta.idrama == 2 || pregunta.idrama == 3) {
          const historialc = {
            id: pregunta.id,
            pregunta: pregunta.pregunta,
            respuesta: respuestaSeleccionada.respuesta
          }
          await historialSchema.updateOne({ iduser: req.body.iduser }, { $push: { historial: historialc } })
        }
        // Obtener la siguiente pregunta
        const siguientePregunta = arbol.find(
          (pregunta) => pregunta.id === siguientePreguntaId
        );

        if (siguientePregunta) {
          res.json(siguientePregunta);
        } else {
          res.status(500).json({
            mensaje: 'Error al obtener la siguiente pregunta.',
          });
        }
      }
    } else {
      res.status(400).json({
        mensaje: 'La respuesta seleccionada no es válida para esta pregunta.',
      });
    }
  } else {
    res.status(404).json({ mensaje: 'Pregunta no encontrada.' });
  }
});

// Endpoint para eliminar la respuesta y volver a la pregunta anterior
app.put('/respuestas/:id_pregunta', upload.none(), async (req, res) => {
  const idPregunta = parseInt(req.params.id_pregunta);
  const prueba = await historialSchema.updateOne({ iduser: req.body.iduser }, { $pull: { historial: { id: idPregunta } } })
  const pregunta = arbol.find((pregunta) => pregunta.id === idPregunta);

  if (pregunta) {
    const preguntaAnterior = arbol.find((pregunta) =>
      pregunta.respuestas.some((r) => r.siguiente_pregunta === idPregunta)
    );

    if (preguntaAnterior) {
      res.json(preguntaAnterior);
    } else {
      res.json(arbol[0]);
    }
  } else {
    res.status(404).json({ mensaje: 'Pregunta no encontrada.' });
  }
});

//Endpoint registro medico
app.post('/medico/registro', upload.none(), async (req, res) => {
  const ver = await medicoSchema.findOne({ email: req.body.email })
  if (ver == undefined || ver == null) {
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(req.body.password, salt)
    req.body.password = hashPassword
    const user = new medicoSchema({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      password: req.body.password,
      telefono: req.body.telefono
    })
    await user.save()
    return res.status(200).json({ Status: "Success", message: "Se registro el medico correctamente"})
  } else {
    res.status(200).json({ Status: "Error", message: "El correo electronico ingresado se encuentra en uso"})
  }
})

app.post('/medico/login', upload.none(), async (req, res) => {
  const password = req.body.password
  const userExist = await medicoSchema.findOne({ email: req.body.email })
  if (userExist) {
      const isPasswordMatched = await bcrypt.compare(password, userExist.password)
      if (isPasswordMatched) {
        const token = await TokenAssign(userExist)
        return res.status(200).send({response: "Success", message: 'Inicio sesion', email: userExist.email, token: token })
      } 
      return res.status(200).send({ response: "Error", message: "Contraseña incorrecta" })
  } else {
      return res.status(200).send({response: "Error", message: "Correo electronico incorrecto" })
  }
})

app.put('/medico/diagnostico', upload.none(), async (req, res) => {
  const token = req.headers.authorization.split(' ').pop()
  const tokenver = await TokenVerify(token)
  if (tokenver) {
      const medico = await medicoSchema.findById(tokenver._id)
      const user = await userSchema.findById(req.body.iduser)
      let prioridad = req.body.prioridad
      if(prioridad == 'true'){
        prioridad = true
      }else{
        prioridad = false
      }
      let revision= req.body.revision
      if(revision== 'true'){
        revision= true
      }else{
        revision= false
      }
      await historialSchema.updateOne({ _id:req.body.historialid }, {
        $set: {
          revision: revision,
          prioridad: prioridad,
          idmedico: tokenver._id
        }
      })
      const template = getTemplate(req.body.texto, medico, user);
      const resp = await sendEmail(user.email, template);
      if(resp == false) return res.status(200).send({response: "Error", message: "Error al enviar el email"})
      return res.status(200).send({response: "Success", message: "Email enviado correctamente"})
  } else {
      return res.status(200).send({response: "Error", messsage: "El usuario no existe" })
  }
})

app.post('/medico/revisado', upload.none(), async (req, res) => {
  const token = req.headers.authorization.split(' ').pop()
  const tokenver = await TokenVerify(token)
  const result = await historialSchema.find({$and : [{revision:true}, {idmedico:tokenver._id}]  })
  return res.status(200).send({response: "Success", datos: result})
})

app.get('/medico/norevisado', upload.none(), async (req, res) => {
  const result = await historialSchema.find({revision:false})
  return res.status(200).send({response: "Success", datos: result})
})

app.post('/medico/seep', upload.none(), async (req, res) => {
  const result = await historialSchema.findById(req.body.id)
  return res.status(200).send({response: "Success", datos: result})
})


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Conectado a MongoDBAtlas"))
  .catch((error) => console.error(error))

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000');
});