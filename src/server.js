import { configDotenv } from "dotenv";
import jsonServer from "json-server";
import { MongoClient, ObjectId } from "mongodb";

configDotenv();

const server = jsonServer.create();
const middlewares = jsonServer.defaults();

// Conectar con MongoDB
const uri = process.env.MONGO_URI; // URI de conexión de MongoDB
const dbName = process.env.DB_NAME; // Nombre de la base de datos
const usersCollectionName = process.env.USERS_COLLECTION; // Nombre de la colección de usuarios
const subscribersCollectionName = process.env.SUBSCRIBERS_COLLECTION; // Nombre de la colección de suscriptores

let db;
let usersCollection;
let subscribersCollection;

MongoClient.connect(uri)
  .then((client) => {
    db = client.db(dbName);
    usersCollection = db.collection(usersCollectionName);
    subscribersCollection = db.collection(subscribersCollectionName);

    server.use(middlewares);
    server.use(jsonServer.bodyParser);

    server.get("/users", async (req, res) => {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ error: "El email es obligatorio" });
      }

      try {
        const users = await usersCollection.find({ email }).toArray();

        if (users.length === 0) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(users);
      } catch (error) {
        console.error("Error durante la búsqueda de usuarios:", error);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    });

    server.get("/users/verify-token", async (req, res) => {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: "Token no proporcionado" });
      }

      const user = await usersCollection.findOne({ token });

      if (user) {
        return res.json({ isValid: true, user });
      } else {
        return res
          .status(401)
          .json({ isValid: false, message: "Token inválido" });
      }
    });

    server.get("/subscribers", async (req, res) => {
      try {
        const subscribers = await subscribersCollection.find().toArray();
        res.json(subscribers);
      } catch (error) {
        console.error("Error al obtener los suscriptores:", error);
        res.status(500).json({ error: "Error al obtener los suscriptores" });
      }
    });

    server.get("/usersList", async (req, res) => {
      try {
        const subscribers = await usersCollection.find().toArray();
        res.json(subscribers); // Responder con la lista de suscriptores
      } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ error: "Error al obtener los usuarios" });
      }
    });

    server.post("/subscribers", async (req, res) => {
      const newSubscriber = req.body;

      // Validar que el cuerpo no esté vacío
      if (!newSubscriber || Object.keys(newSubscriber).length === 0) {
        return res
          .status(400)
          .json({ error: "El cuerpo de la solicitud está vacío" });
      }

      try {
        const result = await subscribersCollection.insertOne(newSubscriber);

        // Responder con el documento insertado, incluyendo el ID generado
        res.json({ ...newSubscriber, _id: result.insertedId });
      } catch (error) {
        console.error("Error al insertar en MongoDB:", error);
        res
          .status(500)
          .json({ error: "Error al insertar en la base de datos" });
      }
    });

    server.post("/users", async (req, res) => {
      const newUser = req.body;

      // Validar que el cuerpo no esté vacío
      if (!newUser || Object.keys(newUser).length === 0) {
        return res
          .status(400)
          .json({ error: "El cuerpo de la solicitud está vacío" });
      }

      try {
        const result = await usersCollection.insertOne(newUser);

        // Responder con el documento insertado, incluyendo el ID generado
        res.json({ ...newUser, _id: result.insertedId });
      } catch (error) {
        console.error("Error al insertar en MongoDB:", error);
        res
          .status(500)
          .json({ error: "Error al insertar en la base de datos" });
      }
    });

    // Endpoint para actualizar un subscriber por su ID
    server.patch("/subscribers/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const updateData = req.body;

      try {
        const result = await subscribersCollection.updateOne(
          { _id: new ObjectId(id) }, 
          { $set: updateData } 
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Subscriber no encontrado" });
        }

        return res.json({ message: "Subscriber actualizado con éxito" });
      } catch (err) {
        console.error(err);
        return res
          .status(500)
          .json({ message: "Error al actualizar el subscriber" });
      }
    });

    server.patch("/users/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const updateData = req.body;

      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "User no encontrado" });
        }

        return res.json({ message: "User actualizado con éxito" });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error al actualizar el user" });
      }
    });

    // Endpoint para eliminar un subscriber por ID
    server.delete("/subscribers/:id", async (req, res) => {
      const { id } = req.params;

      // Verificar si el ID es válido
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      try {
        // Eliminar el subscriber por ID
        const result = await subscribersCollection.deleteOne({
          _id: new ObjectId(id), // Usamos ObjectId correctamente
        });

        // Verificar si se encontró y eliminó un subscriber
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Subscriber no encontrado" });
        }

        res.status(204).send(); // Enviar respuesta sin contenido
      } catch (err) {
        console.error("Error al eliminar el subscriber:", err);
        return res
          .status(500)
          .json({ message: "Error al eliminar el subscriber" });
      }
    });

    // Endpoint para eliminar un subscriber por ID
    server.delete("/users/:id", async (req, res) => {
      const { id } = req.params;

      // Verificar si el ID es válido
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      try {
        // Eliminar el subscriber por ID
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id), // Usamos ObjectId correctamente
        });

        // Verificar si se encontró y eliminó un subscriber
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "User no encontrado" });
        }

        res.status(204).send(); // Enviar respuesta sin contenido
      } catch (err) {
        console.error("Error al eliminar el user:", err);
        return res.status(500).json({ message: "Error al eliminar el user" });
      }
    });

    // Levanta el servidor en el puerto 3000
    server.listen(3000, () => {
      console.log("fenix server está corriendo");
    });
  })
  .catch((err) => {
    console.error("Error al conectar a MongoDB", err);
  });
