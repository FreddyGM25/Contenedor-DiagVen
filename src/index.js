const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { default: mongoose } = require('mongoose')
require("dotenv").config()
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const userSchema = require('./models/questions')
const historialSchema = require('./models/historial')
const cors = require('cors')

// Datos del árbol de preguntas y respuestas
const arbol = require('./questions/question.json');

app.use(bodyParser.json());
app.use(cors({
  origin: "*",
}));

// Endpoint para obtener una pregunta
app.post('/registro', upload.none(), async (req, res) => {
  console.log(req.body)
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
      iduser: id._id
    })
    await historial.save()
    return res.status(200).json({ Status: "Success", message: "Gracias, a continuacion seguire atendiendo su solicitud", id: id._id })
  } else {
    const historial = new historialSchema({
      iduser: ver._id
    })
    await historial.save()
    res.status(200).json({ Status: "Success", message: `Hola ${ver.nombre} has pasado por aqui antes, a continuacion seguiremos los pasos`, id: ver._id})
  }
})


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
    console.log(respuesta)
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
          console.log(res.body)
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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Conectado a MongoDBAtlas"))
  .catch((error) => console.error(error))

// Iniciar el servidor
app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000');
});
