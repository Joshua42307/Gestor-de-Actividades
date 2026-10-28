const http = require("http"); // Permite crear el servidor.
const fs = require("fs"); // Sirve para leer y guardar archivos.
const path = require("path"); // Ayuda a manejar las rutas de los archivos.
const crypto = require("crypto"); // Se usa para crear un ID diferente para cada actividad.
const PUERTO = 3000; // Puerto donde va a funcionar el servidor.
const ARCHIVO = path.join(__dirname, "actividades.txt"); // Ruta del archivo donde se guardan las actividades.
const CARPETA_PUBLICA = path.join(__dirname, "public"); // Carpeta donde están los archivos de la página.

// Si el archivo de actividades no existe, se crea vacío.
if (!fs.existsSync(ARCHIVO)) {
    fs.writeFileSync(ARCHIVO, "", "utf8");
}

// Esta clase representa cada elemento de la lista enlazada.
class Nodo {
    constructor(actividad) {
        this.actividad = actividad; // Guarda los datos de la actividad.
        this.siguiente = null; // Guarda la referencia al siguiente nodo.
    }
}

// Aquí se manejan las actividades usando una lista enlazada.
class ListaEnlazada {
    constructor() {
        this.cabeza = null; // Al principio la lista está vacía.
    }

    // Agrega una actividad al final de la lista.
    agregar(actividad) {
        const nuevo = new Nodo(actividad);

        // Si no hay elementos, el nuevo nodo queda al inicio.
        if (this.cabeza === null) {
            this.cabeza = nuevo;
            return;
        }

        // Recorre la lista hasta llegar al último nodo.
        let actual = this.cabeza;

        while (actual.siguiente !== null) {
            actual = actual.siguiente;
        }

        // Conecta el último nodo con el nuevo.
        actual.siguiente = nuevo;
    }

    // Regresa todas las actividades guardadas en la lista.
    obtenerTodas() {
        const actividades = [];
        let actual = this.cabeza;

        // Recorre la lista y va guardando cada actividad en un arreglo.
        while (actual !== null) {
            actividades.push(actual.actividad);
            actual = actual.siguiente;
        }

        return actividades;
    }

    // Busca una actividad usando su ID.
    buscar(id) {
        let actual = this.cabeza;

        while (actual !== null) {
            // Si el ID coincide, regresa esa actividad.
            if (actual.actividad.id === id) {
                return actual.actividad;
            }

            actual = actual.siguiente;
        }

        // Si no la encuentra, regresa null.
        return null;
    }

    // Cambia los datos de una actividad que ya existe.
    actualizar(id, nuevosDatos) {
        const actividad = this.buscar(id);

        // Si no existe la actividad, no se puede actualizar.
        if (actividad === null) {
            return false;
        }

        // Reemplaza los datos anteriores por los nuevos.
        actividad.nombre = nuevosDatos.nombre;
        actividad.descripcion = nuevosDatos.descripcion;
        actividad.estado = nuevosDatos.estado;

        return true;
    }
}

// Se crea la lista que se utilizará en el programa.
const lista = new ListaEnlazada();

// Lee las actividades que quedaron guardadas en el archivo TXT.
function cargarActividades() {
    const contenido = fs.readFileSync(ARCHIVO, "utf8");

    // Separa el contenido por líneas para revisar cada actividad.
    for (const linea of contenido.split(/\r?\n/)) {
        // Si la línea está vacía, pasa a la siguiente.
        if (linea.trim() === "") {
            continue;
        }

        try {
            // Convierte la línea de texto en un objeto.
            const actividad = JSON.parse(linea);

            // Revisa que los datos guardados tengan el formato esperado.
            if (
                actividad.id &&
                typeof actividad.nombre === "string" &&
                typeof actividad.descripcion === "string" &&
                ["Pendiente", "En proceso", "Completada"]
                    .includes(actividad.estado)
            ) {
                // Si los datos son válidos, agrega la actividad a la lista.
                lista.agregar(actividad);
            }
        } catch (error) {
            // Si una línea está dañada, muestra un aviso en la consola.
            console.error("Se ignoró una línea inválida del archivo.");
        }
    }
}

// Guarda todas las actividades actuales en el archivo TXT.
function guardarActividades() {
    // Convierte cada actividad a texto en formato JSON.
    const contenido = lista.obtenerTodas()
        .map(actividad => JSON.stringify(actividad))
        .join("\n");

    // Escribe la información en el archivo.
    fs.writeFileSync(
        ARCHIVO,
        contenido ? contenido + "\n" : "",
        "utf8"
    );
}

// Envía una respuesta en formato JSON al navegador.
function responderJSON(res, codigo, datos) {
    res.writeHead(codigo, {
        "Content-Type": "application/json; charset=utf-8"
    });

    res.end(JSON.stringify(datos));
}

// Lee los datos que llegan desde el formulario de la página.
function leerCuerpo(req) {
    return new Promise((resolve, reject) => {
        let cuerpo = "";

        // Recibe los datos enviados por partes.
        req.on("data", fragmento => {
            cuerpo += fragmento;

            // Evita recibir solicitudes demasiado grandes.
            if (cuerpo.length > 100000) {
                reject(new Error("La solicitud es demasiado grande."));
                req.destroy();
            }
        });

        // Cuando termina de recibir los datos, intenta convertirlos a JSON.
        req.on("end", () => {
            try {
                resolve(JSON.parse(cuerpo || "{}"));
            } catch (error) {
                reject(new Error("El formato JSON no es válido."));
            }
        });

        // Detecta errores al recibir los datos.
        req.on("error", reject);
    });
}

// Comprueba que los datos de una actividad sean correctos.
function validarActividad(datos) {
    const estados = ["Pendiente", "En proceso", "Completada"];

    return (
        typeof datos.nombre === "string" &&
        datos.nombre.trim().length > 0 &&
        datos.nombre.trim().length <= 100 &&
        typeof datos.descripcion === "string" &&
        datos.descripcion.trim().length > 0 &&
        datos.descripcion.trim().length <= 1000 &&
        estados.includes(datos.estado)
    );
}

// Aquí se reciben las solicitudes que llegan al servidor.
const servidor = http.createServer(async (req, res) => {
    // Obtiene la ruta que se solicitó desde el navegador.
    const url = new URL(req.url, `http://${req.headers.host}`);
    const ruta = url.pathname;

    try {
        // Muestra todas las actividades cuando se hace una consulta.
        if (ruta === "/api/actividades" && req.method === "GET") {
            return responderJSON(res, 200, lista.obtenerTodas());
        }

        // Registra una actividad nueva.
        if (ruta === "/api/actividades" && req.method === "POST") {
            const datos = await leerCuerpo(req);

            // Verifica que el formulario tenga datos correctos.
            if (!validarActividad(datos)) {
                return responderJSON(res, 400, {
                    mensaje: "Verifica el nombre, la descripción y el estado."
                });
            }

            // Crea la actividad con un ID único.
            const actividad = {
                id: crypto.randomUUID(),
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                estado: datos.estado
            };

            // Agrega la actividad a la lista y guarda los cambios.
            lista.agregar(actividad);
            guardarActividades();

            return responderJSON(res, 201, {
                mensaje: "Actividad registrada correctamente.",
                actividad
            });
        }

        // Comprueba si la ruta corresponde a una actividad específica.
        const coincidencia = ruta.match(
            /^\/api\/actividades\/([a-f0-9-]+)$/i
        );

        // Actualiza una actividad cuando se recibe una solicitud PUT.
        if (coincidencia && req.method === "PUT") {
            const id = coincidencia[1];
            const datos = await leerCuerpo(req);

            // Comprueba que los nuevos datos sean válidos.
            if (!validarActividad(datos)) {
                return responderJSON(res, 400, {
                    mensaje: "Los datos de la actividad no son válidos."
                });
            }

            // Busca la actividad y cambia su información.
            const actualizado = lista.actualizar(id, {
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion.trim(),
                estado: datos.estado
            });

            // Avisa si no existe una actividad con ese ID.
            if (!actualizado) {
                return responderJSON(res, 404, {
                    mensaje: "No se encontró la actividad."
                });
            }

            // Guarda los cambios realizados en el archivo TXT.
            guardarActividades();

            return responderJSON(res, 200, {
                mensaje: "Actividad actualizada correctamente.",
                actividad: lista.buscar(id)
            });
        }

        // Permite mostrar la página y sus archivos de diseño.
        if (req.method === "GET") {
            const archivos = {
                "/": "index.html",
                "/index.html": "index.html",
                "/estilos.css": "estilos.css",
                "/script.js": "script.js"
            };

            const nombreArchivo = archivos[ruta];

            // Comprueba que la ruta corresponda a un archivo de la página.
            if (nombreArchivo) {
                const ubicacion = path.join(
                    CARPETA_PUBLICA,
                    nombreArchivo
                );

                // Indica al navegador qué tipo de archivo va a recibir.
                const tipos = {
                    ".html": "text/html; charset=utf-8",
                    ".css": "text/css; charset=utf-8",
                    ".js": "text/javascript; charset=utf-8"
                };

                res.writeHead(200, {
                    "Content-Type": tipos[path.extname(ubicacion)]
                });

                // Envía el archivo solicitado al navegador.
                return fs.createReadStream(ubicacion).pipe(res);
            }
        }

        // Si la ruta no existe, responde con un error 404.
        responderJSON(res, 404, {
            mensaje: "Ruta no encontrada."
        });
    } catch (error) {
        // Muestra el error para poder revisarlo.
        console.error(error);

        // Envía un mensaje de error si todavía se puede responder.
        if (!res.headersSent && !res.destroyed) {
            responderJSON(res, 500, {
                mensaje: "Ocurrió un error en el servidor."
            });
        }
    }
});

// Carga las actividades guardadas antes de recibir solicitudes.
cargarActividades();

// Inicia el servidor en el puerto 3000.
servidor.listen(PUERTO, () => {
    console.log(`Servidor iniciado en http://localhost:${PUERTO}`);
});
